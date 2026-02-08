import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobReportData {
  job: Record<string, unknown>;
  property: Record<string, unknown> | null;
  client: Record<string, unknown> | null;
  staff: Record<string, unknown> | null;
  checklist: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  businessSettings: Record<string, unknown>;
}

interface ReportContent {
  markdown: string;
  html: string;
  narrative: string;
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

    let jobId: string;
    let sendToClient = false;

    try {
      const body = await req.json();
      jobId = body.jobId;
      sendToClient = body.sendToClient || false;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-ai-report] Generating report for job ${jobId}`);

    // 1. Check cache first
    const { data: cached } = await supabase
      .from('ai_report_cache')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (cached && !req.headers.get('X-Force-Regenerate')) {
      console.log(`[generate-ai-report] Returning cached report`);
      return new Response(JSON.stringify({
        success: true,
        cached: true,
        report: {
          markdown: cached.report_markdown,
          html: cached.report_html,
          narrative: '',
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch all job data
    const reportData = await fetchJobReportData(supabase, jobId);

    if (!reportData.job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Generate AI narrative
    const narrative = await generateReportNarrative(claudeApiKey, reportData);

    // 4. Build report content
    const reportContent = buildReportContent(reportData, narrative);

    // 5. Cache the report
    await supabase.from('ai_report_cache').upsert({
      job_id: jobId,
      report_markdown: reportContent.markdown,
      report_html: reportContent.html,
      generated_at: new Date().toISOString(),
    }, {
      onConflict: 'job_id'
    });

    console.log(`[generate-ai-report] Report generated and cached`);

    // 6. Optionally send to client
    if (sendToClient && reportData.client?.email) {
      const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
      if (sendgridApiKey) {
        await sendReportEmail(
          sendgridApiKey,
          reportData.client.email as string,
          reportData.client.name as string,
          reportData,
          reportContent
        );
        console.log(`[generate-ai-report] Report emailed to client`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      report: reportContent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-ai-report] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchJobReportData(supabase: ReturnType<typeof createClient>, jobId: string): Promise<JobReportData> {
  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return {
      job: {},
      property: null,
      client: null,
      staff: null,
      checklist: [],
      photos: [],
      businessSettings: {},
    };
  }

  // Fetch related data in parallel
  const [propertyResult, clientResult, staffResult, checklistResult, photosResult, settingsResult] =
    await Promise.all([
      job.property_id
        ? supabase.from('properties').select('*').eq('id', job.property_id).single()
        : Promise.resolve({ data: null }),
      job.client_id
        ? supabase.from('clients').select('*').eq('id', job.client_id).single()
        : Promise.resolve({ data: null }),
      job.assigned_staff_id
        ? supabase.from('profiles').select('*').eq('user_id', job.assigned_staff_id).single()
        : Promise.resolve({ data: null }),
      supabase.from('checklist_items').select('*').eq('job_id', jobId).order('sort_order'),
      supabase.from('job_photos').select('*').eq('job_id', jobId),
      supabase.from('system_settings').select('key, value').in('key', [
        'company_name', 'company_logo', 'business_abn', 'business_address', 'business_phone', 'business_email'
      ]),
    ]);

  const businessSettings = Object.fromEntries(
    (settingsResult.data || []).map((s: { key: string; value: unknown }) => [s.key, s.value])
  );

  return {
    job,
    property: propertyResult.data,
    client: clientResult.data,
    staff: staffResult.data,
    checklist: checklistResult.data || [],
    photos: photosResult.data || [],
    businessSettings,
  };
}

async function generateReportNarrative(apiKey: string, data: JobReportData): Promise<string> {
  const job = data.job as Record<string, unknown>;
  const property = data.property as Record<string, unknown> | null;
  const client = data.client as Record<string, unknown> | null;
  const staff = data.staff as Record<string, unknown> | null;
  const checklist = data.checklist as { status: string; room_name: string; task_name: string; issue_note?: string }[];
  const photos = data.photos as { photo_type: string }[];

  const completedTasks = checklist.filter(c => c.status === 'done').length;
  const totalTasks = checklist.length;
  const issues = checklist.filter(c => c.status === 'issue');

  const startTime = job.start_time as string | null;
  const endTime = job.end_time as string | null;
  const duration = startTime && endTime
    ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
    : null;

  const beforePhotos = photos.filter(p => p.photo_type === 'before').length;
  const afterPhotos = photos.filter(p => p.photo_type === 'after').length;

  const prompt = `You are a professional cleaning service report writer. Generate a concise, professional cleaning completion report.

CONTEXT:
- Property: ${property?.name || job.location || 'Unknown'}
- Client: ${client?.name || 'N/A'}
- Cleaner: ${staff?.full_name || 'N/A'}
- Date: ${job.scheduled_date}
- Duration: ${duration ? `${duration} minutes` : 'Not recorded'}
- Tasks Completed: ${completedTasks}/${totalTasks}
- Photos Taken: ${photos.length} (${beforePhotos} before, ${afterPhotos} after)
- GPS Verified: ${job.geofence_validated ? 'Yes' : 'No'}
- Quality Score: ${job.quality_score || 'N/A'}
${issues.length > 0 ? `\nISSUES REPORTED:\n${issues.map(i => `- ${i.room_name}: ${i.task_name} - ${i.issue_note || 'Issue flagged'}`).join('\n')}` : ''}

INSTRUCTIONS:
1. Write a professional executive summary (2-3 sentences)
2. Summarize work performed
3. Note any issues or areas requiring attention
4. End with a positive closing statement

Keep the tone professional but warm. Use Australian English spelling. Keep the response under 200 words.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generate-ai-report] Claude API error:', errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

function buildReportContent(data: JobReportData, narrative: string): ReportContent {
  const job = data.job as Record<string, unknown>;
  const property = data.property as Record<string, unknown> | null;
  const client = data.client as Record<string, unknown> | null;
  const staff = data.staff as Record<string, unknown> | null;
  const checklist = data.checklist as { status: string; room_name: string; task_name: string; issue_note?: string }[];
  const photos = data.photos as { photo_type: string }[];
  const businessSettings = data.businessSettings as Record<string, string>;

  const completedTasks = checklist.filter(c => c.status === 'done');
  const issues = checklist.filter(c => c.status === 'issue');

  const startTime = job.start_time as string | null;
  const endTime = job.end_time as string | null;
  const duration = startTime && endTime
    ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
    : null;

  const scheduledDate = new Date(job.scheduled_date as string);
  const formattedDate = scheduledDate.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const beforePhotos = photos.filter(p => p.photo_type === 'before').length;
  const afterPhotos = photos.filter(p => p.photo_type === 'after').length;

  const companyName = businessSettings.company_name || 'Pulcrix';

  const markdown = `# Cleaning Service Report

**${companyName}**
${businessSettings.business_address || ''}
${businessSettings.business_abn ? `ABN: ${businessSettings.business_abn}` : ''}

---

## Property Details
- **Location**: ${property?.name || job.location}
- **Address**: ${property?.address || 'N/A'}
- **Client**: ${client?.name || 'N/A'}

## Service Details
- **Date**: ${formattedDate}
- **Scheduled Time**: ${job.scheduled_time}
- **Duration**: ${duration ? `${duration} minutes` : 'Not recorded'}
- **Cleaner**: ${staff?.full_name || 'N/A'}

## GPS Verification
- **Check-in**: ${startTime ? new Date(startTime).toLocaleTimeString('en-AU') : 'N/A'}
- **Check-out**: ${endTime ? new Date(endTime).toLocaleTimeString('en-AU') : 'N/A'}
- **Location Verified**: ${job.geofence_validated ? 'Yes' : 'No'}

---

## Executive Summary

${narrative}

---

## Work Performed

${completedTasks.length > 0 ? completedTasks.map(t => `- ${t.room_name}: ${t.task_name}`).join('\n') : 'No tasks recorded'}

${issues.length > 0 ? `
## Issues Reported

${issues.map(i => `- ${i.room_name}: ${i.task_name}${i.issue_note ? ` - ${i.issue_note}` : ''}`).join('\n')}
` : ''}

## Photo Documentation

- Before photos: ${beforePhotos}
- After photos: ${afterPhotos}

---

*Report generated by ${companyName} AI on ${new Date().toLocaleString('en-AU')}*
`;

  const html = convertMarkdownToHtml(markdown, companyName);

  return { markdown, html, narrative };
}

function convertMarkdownToHtml(markdown: string, companyName: string): string {
  // Convert markdown to styled HTML for email/PDF
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1 style="color: #1f2937; font-size: 28px; margin-bottom: 8px;">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="color: #374151; font-size: 20px; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">$1</h2>')
    .replace(/^\*\*(.+)\*\*$/gm, '<strong>$1</strong>')
    .replace(/^- \*\*(.+)\*\*: (.+)$/gm, '<p style="margin: 4px 0;"><strong>$1:</strong> $2</p>')
    .replace(/^- (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/---/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">');

  // Wrap in styled container
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 40px; }
    ul { padding-left: 20px; }
    li::marker { color: #10b981; }
  </style>
</head>
<body>
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Cleaning Service Report</p>
  </div>
  ${html}
</body>
</html>
  `;
}

async function sendReportEmail(
  apiKey: string,
  toEmail: string,
  toName: string,
  data: JobReportData,
  content: ReportContent
): Promise<void> {
  const businessSettings = data.businessSettings as Record<string, string>;
  const companyName = businessSettings.company_name || 'Pulcrix';
  const property = data.property as Record<string, unknown> | null;
  const job = data.job as Record<string, unknown>;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: toEmail, name: toName }],
      }],
      from: {
        email: businessSettings.business_email || 'reports@pulcrix.com',
        name: companyName
      },
      subject: `Cleaning Report - ${property?.name || job.location} - ${job.scheduled_date}`,
      content: [{
        type: 'text/html',
        value: content.html,
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
  }
}
