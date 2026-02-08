import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type FlagType = 'photo_reuse' | 'gps_spoof' | 'impossible_travel' | 'time_anomaly' | 'pattern_suspicious' | 'checkin_without_work';
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface AnomalyFlag {
  staffId: string;
  jobId?: string;
  flagType: FlagType;
  severity: Severity;
  evidence: Record<string, unknown>;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for cron or admin authorization
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    if (cronSecret !== expectedCronSecret && !authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[detect-anomalies] Starting anomaly detection');

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const flagsDetected: AnomalyFlag[] = [];

    // 1. Detect GPS Spoofing (impossible check-in locations)
    const gpsSpoofFlags = await detectGpsSpoofing(supabase, startDate);
    flagsDetected.push(...gpsSpoofFlags);

    // 2. Detect Impossible Travel (too fast between sites)
    const travelFlags = await detectImpossibleTravel(supabase, startDate);
    flagsDetected.push(...travelFlags);

    // 3. Detect Time Anomalies (suspiciously fast job completion)
    const timeFlags = await detectTimeAnomalies(supabase, startDate);
    flagsDetected.push(...timeFlags);

    // 4. Detect Check-in Without Work (no photos, no checklist progress)
    const workFlags = await detectCheckinWithoutWork(supabase, startDate);
    flagsDetected.push(...workFlags);

    // 5. Store flags in database
    let storedFlags = 0;
    for (const flag of flagsDetected) {
      // Check if similar flag already exists
      const { data: existing } = await supabase
        .from('ai_fraud_flags')
        .select('id')
        .eq('staff_id', flag.staffId)
        .eq('job_id', flag.jobId || null)
        .eq('flag_type', flag.flagType)
        .gte('created_at', `${startDate}T00:00:00`)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error } = await supabase
          .from('ai_fraud_flags')
          .insert({
            staff_id: flag.staffId,
            job_id: flag.jobId || null,
            flag_type: flag.flagType,
            severity: flag.severity,
            evidence_json: flag.evidence,
            confidence: flag.confidence,
          });

        if (!error) {
          storedFlags++;
        }
      }
    }

    console.log(`[detect-anomalies] Detected ${flagsDetected.length} anomalies, stored ${storedFlags} new flags`);

    return new Response(JSON.stringify({
      success: true,
      anomaliesDetected: flagsDetected.length,
      newFlagsStored: storedFlags,
      flags: flagsDetected,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[detect-anomalies] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function detectGpsSpoofing(
  supabase: ReturnType<typeof createClient>,
  startDate: string
): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  // Find jobs where check-in distance is unreasonably far from property
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id, assigned_staff_id, checkin_lat, checkin_lng,
      checkin_distance_meters, checkout_distance_meters,
      property_id, location
    `)
    .gte('scheduled_date', startDate)
    .eq('status', 'completed')
    .not('checkin_lat', 'is', null);

  for (const job of jobs || []) {
    // Flag if check-in distance is more than 500m from property
    if (job.checkin_distance_meters && job.checkin_distance_meters > 500) {
      flags.push({
        staffId: job.assigned_staff_id,
        jobId: job.id,
        flagType: 'gps_spoof',
        severity: job.checkin_distance_meters > 1000 ? 'high' : 'medium',
        evidence: {
          checkinDistance: job.checkin_distance_meters,
          checkinLat: job.checkin_lat,
          checkinLng: job.checkin_lng,
          location: job.location,
          threshold: 500,
        },
        confidence: Math.min(0.9, 0.5 + (job.checkin_distance_meters / 2000)),
      });
    }
  }

  return flags;
}

async function detectImpossibleTravel(
  supabase: ReturnType<typeof createClient>,
  startDate: string
): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  // Get jobs grouped by staff and date
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id, assigned_staff_id, scheduled_date,
      start_time, end_time, checkin_lat, checkin_lng,
      checkout_lat, checkout_lng, location
    `)
    .gte('scheduled_date', startDate)
    .eq('status', 'completed')
    .not('start_time', 'is', null)
    .order('start_time', { ascending: true });

  // Group jobs by staff
  const jobsByStaff = new Map<string, typeof jobs>();
  for (const job of jobs || []) {
    if (!job.assigned_staff_id) continue;
    const staffJobs = jobsByStaff.get(job.assigned_staff_id) || [];
    staffJobs.push(job);
    jobsByStaff.set(job.assigned_staff_id, staffJobs);
  }

  // Check for impossible travel between consecutive jobs
  for (const [staffId, staffJobs] of jobsByStaff) {
    for (let i = 0; i < staffJobs.length - 1; i++) {
      const job1 = staffJobs[i];
      const job2 = staffJobs[i + 1];

      // Skip if on different days
      if (job1.scheduled_date !== job2.scheduled_date) continue;

      // Skip if missing GPS data
      if (!job1.checkout_lat || !job2.checkin_lat) continue;

      const endTime1 = new Date(job1.end_time);
      const startTime2 = new Date(job2.start_time);
      const timeDiffMinutes = (startTime2.getTime() - endTime1.getTime()) / 60000;

      // Calculate distance between checkout of job1 and checkin of job2
      const distance = calculateDistance(
        job1.checkout_lat, job1.checkout_lng,
        job2.checkin_lat, job2.checkin_lng
      );

      // Assume max travel speed of 60 km/h in urban areas
      // Distance in meters, time in minutes
      const requiredMinutes = (distance / 1000) / 60 * 60; // time = distance / speed

      // Flag if travel would require unrealistic speed (e.g., > 100 km/h in city)
      if (timeDiffMinutes < requiredMinutes * 0.5 && distance > 2000) {
        flags.push({
          staffId,
          jobId: job2.id,
          flagType: 'impossible_travel',
          severity: timeDiffMinutes < requiredMinutes * 0.25 ? 'high' : 'medium',
          evidence: {
            fromJob: job1.id,
            toJob: job2.id,
            fromLocation: job1.location,
            toLocation: job2.location,
            distanceMeters: Math.round(distance),
            timeBetweenMinutes: Math.round(timeDiffMinutes),
            requiredMinutes: Math.round(requiredMinutes),
          },
          confidence: 0.75,
        });
      }
    }
  }

  return flags;
}

async function detectTimeAnomalies(
  supabase: ReturnType<typeof createClient>,
  startDate: string
): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  // Get completed jobs with duration
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id, assigned_staff_id, start_time, end_time,
      property_id, location
    `)
    .gte('scheduled_date', startDate)
    .eq('status', 'completed')
    .not('start_time', 'is', null)
    .not('end_time', 'is', null);

  // Get property estimated hours for comparison
  const propertyIds = [...new Set((jobs || []).map(j => j.property_id).filter(Boolean))];
  const { data: properties } = await supabase
    .from('properties')
    .select('id, estimated_hours, bedrooms, bathrooms')
    .in('id', propertyIds);

  const propertyMap = new Map((properties || []).map(p => [p.id, p]));

  for (const job of jobs || []) {
    const duration = (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 60000;

    // Get expected duration from property or use defaults
    const property = propertyMap.get(job.property_id);
    let expectedMinutes = 60; // Default 1 hour

    if (property?.estimated_hours) {
      expectedMinutes = property.estimated_hours * 60;
    } else if (property) {
      // Estimate based on bedrooms/bathrooms
      expectedMinutes = ((property.bedrooms || 2) * 15) + ((property.bathrooms || 1) * 20);
    }

    // Flag if job completed in less than 30% of expected time
    if (duration < expectedMinutes * 0.3 && duration < 20) {
      flags.push({
        staffId: job.assigned_staff_id,
        jobId: job.id,
        flagType: 'time_anomaly',
        severity: duration < expectedMinutes * 0.15 ? 'high' : 'medium',
        evidence: {
          actualMinutes: Math.round(duration),
          expectedMinutes: Math.round(expectedMinutes),
          percentOfExpected: Math.round((duration / expectedMinutes) * 100),
          location: job.location,
        },
        confidence: 0.7,
      });
    }
  }

  return flags;
}

async function detectCheckinWithoutWork(
  supabase: ReturnType<typeof createClient>,
  startDate: string
): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  // Get completed jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, assigned_staff_id, location')
    .gte('scheduled_date', startDate)
    .eq('status', 'completed');

  for (const job of jobs || []) {
    // Check if job has photos
    const { count: photoCount } = await supabase
      .from('job_photos')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', job.id);

    // Check if job has checklist progress
    const { data: checklistItems } = await supabase
      .from('checklist_items')
      .select('status')
      .eq('job_id', job.id);

    const completedItems = (checklistItems || []).filter(c => c.status === 'done').length;
    const totalItems = (checklistItems || []).length;

    // Flag if no photos AND less than 50% checklist completed
    if ((photoCount || 0) === 0 && totalItems > 0 && completedItems < totalItems * 0.5) {
      flags.push({
        staffId: job.assigned_staff_id,
        jobId: job.id,
        flagType: 'checkin_without_work',
        severity: completedItems === 0 ? 'high' : 'medium',
        evidence: {
          photoCount: photoCount || 0,
          checklistTotal: totalItems,
          checklistCompleted: completedItems,
          completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          location: job.location,
        },
        confidence: 0.6,
      });
    }
  }

  return flags;
}

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
