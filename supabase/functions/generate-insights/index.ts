import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobStats {
  total: number;
  completed: number;
  cancelled: number;
  avgDuration: number;
  onTimeRate: number;
}

interface StaffPerformance {
  staffId: string;
  name: string;
  jobsCompleted: number;
  avgDuration: number;
  avgQuality: number;
  lateCount: number;
}

interface InsightData {
  jobStats: JobStats;
  staffPerformance: StaffPerformance[];
  alertsSummary: Record<string, number>;
  topIssues: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

    if (!claudeApiKey) {
      return new Response(JSON.stringify({
        error: 'CLAUDE_API_KEY not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    console.log('[generate-insights] Starting insights generation');

    // 1. Gather data from past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const insightData = await gatherInsightData(supabase, startDate);

    // 2. Generate insights using Claude
    const insights = await generateInsightsWithClaude(claudeApiKey, insightData);

    // 3. Store insights in database
    const storedInsights = [];
    for (const insight of insights) {
      const { data, error } = await supabase
        .from('ai_insights')
        .insert({
          insight_type: insight.type,
          title: insight.title,
          content: insight.content,
          data_context: insight.dataContext,
          confidence: insight.confidence,
          priority: insight.priority,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (!error && data) {
        storedInsights.push(data);
      }
    }

    console.log(`[generate-insights] Generated ${storedInsights.length} insights`);

    return new Response(JSON.stringify({
      success: true,
      insightsGenerated: storedInsights.length,
      insights: storedInsights,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-insights] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function gatherInsightData(
  supabase: ReturnType<typeof createClient>,
  startDate: string
): Promise<InsightData> {
  // Fetch jobs from past 7 days
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, status, assigned_staff_id, start_time, end_time, scheduled_time, quality_score, geofence_validated')
    .gte('scheduled_date', startDate);

  const completedJobs = (jobs || []).filter(j => j.status === 'completed');
  const cancelledJobs = (jobs || []).filter(j => j.status === 'cancelled');

  // Calculate average duration
  const durations = completedJobs
    .filter(j => j.start_time && j.end_time)
    .map(j => (new Date(j.end_time).getTime() - new Date(j.start_time).getTime()) / 60000);

  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  // Calculate on-time rate (jobs where start_time is within 15 min of scheduled_time)
  const onTimeJobs = completedJobs.filter(j => {
    if (!j.start_time || !j.scheduled_time) return false;
    const scheduled = new Date(`2000-01-01T${j.scheduled_time}`);
    const actual = new Date(j.start_time);
    const diff = Math.abs(actual.getHours() * 60 + actual.getMinutes() -
                         scheduled.getHours() * 60 - scheduled.getMinutes());
    return diff <= 15;
  });

  const onTimeRate = completedJobs.length > 0
    ? (onTimeJobs.length / completedJobs.length) * 100
    : 0;

  // Fetch staff performance
  const staffIds = [...new Set((jobs || []).map(j => j.assigned_staff_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', staffIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

  const staffPerformance: StaffPerformance[] = staffIds.map(staffId => {
    const staffJobs = completedJobs.filter(j => j.assigned_staff_id === staffId);
    const staffDurations = staffJobs
      .filter(j => j.start_time && j.end_time)
      .map(j => (new Date(j.end_time).getTime() - new Date(j.start_time).getTime()) / 60000);

    const avgStaffDuration = staffDurations.length > 0
      ? staffDurations.reduce((a, b) => a + b, 0) / staffDurations.length
      : 0;

    const qualityScores = staffJobs.filter(j => j.quality_score).map(j => j.quality_score);
    const avgQuality = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    return {
      staffId: staffId as string,
      name: profileMap.get(staffId) || 'Unknown',
      jobsCompleted: staffJobs.length,
      avgDuration: Math.round(avgStaffDuration),
      avgQuality: Math.round(avgQuality),
      lateCount: 0, // Would need alerts data
    };
  });

  // Fetch alerts
  const { data: alerts } = await supabase
    .from('job_alerts')
    .select('alert_type')
    .gte('created_at', `${startDate}T00:00:00`);

  const alertsSummary: Record<string, number> = {};
  for (const alert of alerts || []) {
    alertsSummary[alert.alert_type] = (alertsSummary[alert.alert_type] || 0) + 1;
  }

  // Fetch checklist issues
  const { data: checklistIssues } = await supabase
    .from('checklist_items')
    .select('task_name, room_name')
    .eq('status', 'issue')
    .gte('created_at', `${startDate}T00:00:00`)
    .limit(50);

  const issueCounts: Record<string, number> = {};
  for (const issue of checklistIssues || []) {
    const key = `${issue.room_name}: ${issue.task_name}`;
    issueCounts[key] = (issueCounts[key] || 0) + 1;
  }

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue]) => issue);

  return {
    jobStats: {
      total: (jobs || []).length,
      completed: completedJobs.length,
      cancelled: cancelledJobs.length,
      avgDuration: Math.round(avgDuration),
      onTimeRate: Math.round(onTimeRate),
    },
    staffPerformance: staffPerformance.sort((a, b) => b.jobsCompleted - a.jobsCompleted),
    alertsSummary,
    topIssues,
  };
}

interface GeneratedInsight {
  type: 'performance' | 'efficiency' | 'pattern' | 'recommendation' | 'warning' | 'trend';
  title: string;
  content: string;
  dataContext: Record<string, unknown>;
  confidence: number;
  priority: number;
}

async function generateInsightsWithClaude(
  apiKey: string,
  data: InsightData
): Promise<GeneratedInsight[]> {
  const prompt = `You are a business analyst for a cleaning service company. Analyze this data from the past 7 days and generate 3-5 actionable insights.

DATA:
Jobs: ${data.jobStats.total} total, ${data.jobStats.completed} completed, ${data.jobStats.cancelled} cancelled
Average job duration: ${data.jobStats.avgDuration} minutes
On-time arrival rate: ${data.jobStats.onTimeRate}%

Staff Performance (top 5):
${data.staffPerformance.slice(0, 5).map(s =>
  `- ${s.name}: ${s.jobsCompleted} jobs, avg ${s.avgDuration}min, quality ${s.avgQuality}%`
).join('\n')}

Alerts this week:
${Object.entries(data.alertsSummary).map(([type, count]) => `- ${type}: ${count}`).join('\n') || 'None'}

Top recurring issues:
${data.topIssues.map(i => `- ${i}`).join('\n') || 'None'}

Generate insights in this JSON format:
[
  {
    "type": "performance|efficiency|pattern|recommendation|warning|trend",
    "title": "Short title (max 50 chars)",
    "content": "Detailed insight (max 200 chars)",
    "priority": 1-10,
    "confidence": 0.7-0.95
  }
]

Focus on actionable insights that help improve operations. Use Australian English.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generate-insights] Claude API error:', errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  const responseText = result.content[0].text;

  // Extract JSON from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('[generate-insights] Could not parse Claude response');
    return [];
  }

  try {
    const rawInsights = JSON.parse(jsonMatch[0]);
    return rawInsights.map((insight: Record<string, unknown>) => ({
      type: insight.type as GeneratedInsight['type'],
      title: insight.title as string,
      content: insight.content as string,
      dataContext: data,
      confidence: insight.confidence as number,
      priority: insight.priority as number,
    }));
  } catch (parseError) {
    console.error('[generate-insights] JSON parse error:', parseError);
    return [];
  }
}
