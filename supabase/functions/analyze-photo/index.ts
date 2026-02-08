import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  photoId: string;
  cleanlinessScore: number;
  labels: string[];
  issues: string[];
  confidence: number;
  rawLabels: Array<{ description: string; score: number }>;
}

interface VisionLabel {
  description: string;
  score: number;
  topicality?: number;
}

interface VisionResponse {
  labelAnnotations?: VisionLabel[];
  localizedObjectAnnotations?: Array<{ name: string; score: number }>;
  error?: { message: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');

    if (!googleVisionApiKey) {
      return new Response(JSON.stringify({
        error: 'GOOGLE_VISION_API_KEY not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let photoId: string;
    let photoUrl: string;
    let areaType: string;
    let jobId: string | undefined;

    try {
      const body = await req.json();
      photoId = body.photoId;
      photoUrl = body.photoUrl;
      areaType = body.areaType || 'general';
      jobId = body.jobId;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!photoId || !photoUrl) {
      return new Response(JSON.stringify({ error: 'photoId and photoUrl are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[analyze-photo] Analyzing photo ${photoId}, area: ${areaType}`);

    // 1. Call Google Vision API
    const visionResult = await analyzeWithVision(googleVisionApiKey, photoUrl);

    if (visionResult.error) {
      console.error('[analyze-photo] Vision API error:', visionResult.error);
      return new Response(JSON.stringify({
        error: `Vision API error: ${visionResult.error.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Calculate cleanliness score
    const analysis = calculateCleanlinessScore(visionResult, areaType, photoId);

    console.log(`[analyze-photo] Score: ${analysis.cleanlinessScore}, Issues: ${analysis.issues.length}`);

    // 3. Store analysis
    const { error: insertError } = await supabase.from('ai_photo_analysis').upsert({
      photo_id: photoId,
      analysis_json: visionResult,
      cleanliness_score: analysis.cleanlinessScore,
      detected_labels: analysis.labels,
      detected_issues: analysis.issues,
      confidence: analysis.confidence,
      analyzed_at: new Date().toISOString(),
    }, {
      onConflict: 'photo_id'
    });

    if (insertError) {
      console.error('[analyze-photo] Error storing analysis:', insertError);
      // Continue anyway, analysis was successful
    }

    // 4. Create alert if score is low
    if (analysis.cleanlinessScore < 70 && jobId) {
      const { error: alertError } = await supabase.from('job_alerts').insert({
        job_id: jobId,
        alert_type: 'quality_issue',
        message: `AI detected potential cleanliness issues. Score: ${analysis.cleanlinessScore}%. ${analysis.issues.length > 0 ? `Issues: ${analysis.issues.slice(0, 3).join(', ')}` : ''}`,
        is_resolved: false,
      });

      if (alertError) {
        console.error('[analyze-photo] Error creating alert:', alertError);
      } else {
        console.log('[analyze-photo] Quality alert created');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        photoId: analysis.photoId,
        cleanlinessScore: analysis.cleanlinessScore,
        labels: analysis.labels,
        issues: analysis.issues,
        confidence: analysis.confidence,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyze-photo] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeWithVision(apiKey: string, imageUrl: string): Promise<VisionResponse> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 25 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 15 },
          ],
        }],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[analyze-photo] Vision API HTTP error:', errorText);
    return { error: { message: `HTTP ${response.status}` } };
  }

  const data = await response.json();

  if (data.responses && data.responses[0]) {
    if (data.responses[0].error) {
      return { error: data.responses[0].error };
    }
    return data.responses[0];
  }

  return { error: { message: 'No response from Vision API' } };
}

function calculateCleanlinessScore(
  visionResult: VisionResponse,
  areaType: string,
  photoId: string
): AnalysisResult {
  const labels = (visionResult.labelAnnotations || []).map(l => ({
    description: l.description.toLowerCase(),
    score: l.score,
  }));

  const objects = (visionResult.localizedObjectAnnotations || []).map(o => ({
    description: o.name.toLowerCase(),
    score: o.score,
  }));

  const allDetections = [...labels, ...objects];

  // Positive indicators (clean environment)
  const positiveLabels = [
    'clean', 'tidy', 'organized', 'shiny', 'spotless', 'polished',
    'neat', 'orderly', 'immaculate', 'pristine', 'white', 'bright',
    'sanitized', 'fresh', 'sparkling', 'gleaming', 'sterile', 'hygienic'
  ];

  // Negative indicators (dirty/messy)
  const negativeLabels = [
    'dirty', 'mess', 'messy', 'clutter', 'cluttered', 'stain', 'stained',
    'garbage', 'trash', 'dust', 'dusty', 'grime', 'grimy', 'mold', 'mouldy',
    'debris', 'waste', 'untidy', 'disorganized', 'filthy', 'unkempt',
    'smudge', 'smear', 'spill', 'residue', 'buildup'
  ];

  // Objects that suggest mess
  const negativeObjects = [
    'trash', 'garbage', 'litter', 'debris', 'waste basket full',
    'dirty dishes', 'clutter', 'pile'
  ];

  // Expected objects by area type (presence is positive)
  const expectedByArea: Record<string, string[]> = {
    'bathroom': ['toilet', 'sink', 'mirror', 'tile', 'bathtub', 'shower', 'faucet', 'towel rack'],
    'kitchen': ['sink', 'countertop', 'appliance', 'stove', 'refrigerator', 'cabinet', 'faucet'],
    'bedroom': ['bed', 'furniture', 'floor', 'window', 'pillow', 'mattress', 'wardrobe'],
    'living_room': ['sofa', 'couch', 'furniture', 'floor', 'window', 'table', 'television', 'rug'],
    'office': ['desk', 'chair', 'floor', 'window', 'computer', 'monitor', 'keyboard'],
    'general': ['floor', 'wall', 'ceiling', 'window', 'furniture'],
  };

  let score = 75; // Base score - assume clean unless proven otherwise
  const issues: string[] = [];
  const detectedLabels: string[] = [];
  const rawLabels: Array<{ description: string; score: number }> = [];

  for (const detection of allDetections) {
    detectedLabels.push(detection.description);
    rawLabels.push({ description: detection.description, score: detection.score });

    // Boost for positive labels
    for (const positive of positiveLabels) {
      if (detection.description.includes(positive)) {
        score += detection.score * 8;
        break;
      }
    }

    // Penalty for negative labels
    for (const negative of negativeLabels) {
      if (detection.description.includes(negative)) {
        score -= detection.score * 12;
        issues.push(detection.description);
        break;
      }
    }

    // Additional penalty for negative objects
    for (const negObj of negativeObjects) {
      if (detection.description.includes(negObj)) {
        score -= detection.score * 10;
        if (!issues.includes(detection.description)) {
          issues.push(detection.description);
        }
        break;
      }
    }
  }

  // Check for expected objects in area (bonus if found)
  const expected = expectedByArea[areaType] || expectedByArea['general'];
  const foundExpected = expected.filter(e =>
    detectedLabels.some(l => l.includes(e))
  );

  // Bonus for finding expected elements (confirms it's the right area)
  if (foundExpected.length >= expected.length / 2) {
    score += 5;
  }

  // Clamp score between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Calculate confidence based on number of detections
  const confidence = Math.min(0.95, 0.5 + (allDetections.length * 0.02));

  // Deduplicate issues
  const uniqueIssues = [...new Set(issues)];

  return {
    photoId,
    cleanlinessScore: score,
    labels: detectedLabels.slice(0, 15), // Top 15 labels
    issues: uniqueIssues.slice(0, 5), // Top 5 issues
    confidence: Math.round(confidence * 100) / 100,
    rawLabels: rawLabels.slice(0, 10),
  };
}
