import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AlertType = 'late_arrival' | 'no_show' | 'incomplete_checkout' | 'pattern_tardiness' | 'geofence_violation' | 'quality_issue';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface AlertConfig {
  type: AlertType;
  jobId?: string;
  staffId?: string;
  message: string;
  severity: AlertSeverity;
}

interface AlertResult {
  success: boolean;
  alertId?: string;
  notificationsSent: number;
  emailsSent: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let alertConfig: AlertConfig;

    try {
      const body = await req.json();
      alertConfig = body.alertConfig;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!alertConfig || !alertConfig.type || !alertConfig.message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: type, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-smart-alert] Processing ${alertConfig.type} alert`);

    // 1. Check if alert already exists for this job today (prevent duplicates)
    if (alertConfig.jobId) {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingAlerts } = await supabase
        .from('job_alerts')
        .select('id')
        .eq('job_id', alertConfig.jobId)
        .eq('alert_type', alertConfig.type)
        .gte('created_at', `${today}T00:00:00`)
        .limit(1);

      if (existingAlerts && existingAlerts.length > 0) {
        console.log(`[send-smart-alert] Alert already exists for job ${alertConfig.jobId}`);
        return new Response(JSON.stringify({
          success: true,
          alertId: existingAlerts[0].id,
          notificationsSent: 0,
          emailsSent: 0,
          message: 'Alert already exists'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Create alert record
    const { data: alert, error: alertError } = await supabase
      .from('job_alerts')
      .insert({
        job_id: alertConfig.jobId || null,
        alert_type: alertConfig.type,
        message: alertConfig.message,
        is_resolved: false,
      })
      .select()
      .single();

    if (alertError) {
      console.error('[send-smart-alert] Error creating alert:', alertError);
      throw alertError;
    }

    console.log(`[send-smart-alert] Created alert ${alert.id}`);

    // 3. Get admin users to notify
    const { data: admins, error: adminsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminsError) {
      console.error('[send-smart-alert] Error fetching admins:', adminsError);
    }

    const adminIds = admins?.map(a => a.user_id) || [];
    console.log(`[send-smart-alert] Found ${adminIds.length} admins to notify`);

    // 4. Get admin profiles for email
    let adminProfiles: { email: string; full_name: string }[] = [];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, full_name')
        .in('user_id', adminIds);
      adminProfiles = profiles || [];
    }

    // 5. Create in-app notifications for all admins
    let notificationsSent = 0;
    if (adminIds.length > 0) {
      const notifications = adminIds.map(userId => ({
        user_id: userId,
        title: getAlertTitle(alertConfig.type),
        message: alertConfig.message,
        type: 'alert',
        related_job_id: alertConfig.jobId || null,
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('[send-smart-alert] Error creating notifications:', notifError);
      } else {
        notificationsSent = notifications.length;
        console.log(`[send-smart-alert] Created ${notificationsSent} notifications`);
      }
    }

    // 6. Send email for high/critical severity
    let emailsSent = 0;
    if ((alertConfig.severity === 'high' || alertConfig.severity === 'critical') && sendgridApiKey) {
      for (const admin of adminProfiles) {
        try {
          await sendAlertEmail(sendgridApiKey, admin.email, admin.full_name, alertConfig);
          emailsSent++;
        } catch (emailError) {
          console.error(`[send-smart-alert] Failed to send email to ${admin.email}:`, emailError);
        }
      }
      console.log(`[send-smart-alert] Sent ${emailsSent} emails`);
    }

    const result: AlertResult = {
      success: true,
      alertId: alert.id,
      notificationsSent,
      emailsSent,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-smart-alert] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getAlertTitle(type: AlertType): string {
  const titles: Record<AlertType, string> = {
    'late_arrival': 'Late Arrival Alert',
    'no_show': 'No Show Alert',
    'incomplete_checkout': 'Incomplete Checkout',
    'pattern_tardiness': 'Pattern Detected: Repeated Lateness',
    'geofence_violation': 'Geofence Violation',
    'quality_issue': 'Quality Issue Detected',
  };
  return titles[type] || 'Alert';
}

function getAlertEmoji(type: AlertType): string {
  const emojis: Record<AlertType, string> = {
    'late_arrival': '⏰',
    'no_show': '🚫',
    'incomplete_checkout': '⚠️',
    'pattern_tardiness': '📊',
    'geofence_violation': '📍',
    'quality_issue': '🔍',
  };
  return emojis[type] || '🔔';
}

async function sendAlertEmail(
  apiKey: string,
  toEmail: string,
  toName: string,
  config: AlertConfig
): Promise<void> {
  const appUrl = Deno.env.get('APP_URL') || 'https://app.pulcrix.com';
  const emoji = getAlertEmoji(config.type);
  const title = getAlertTitle(config.type);

  const severityColors: Record<AlertSeverity, string> = {
    'low': '#3b82f6',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'critical': '#7f1d1d',
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: toEmail, name: toName }],
        dynamic_template_data: {
          title: `${emoji} ${title}`,
          message: config.message,
          severity: config.severity.toUpperCase(),
          jobUrl: config.jobId ? `${appUrl}/jobs/${config.jobId}` : null,
        }
      }],
      from: { email: 'alerts@pulcrix.com', name: 'Pulcrix Alerts' },
      subject: `${emoji} ${title}`,
      content: [{
        type: 'text/html',
        value: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${emoji} ${title}</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <div style="background: #f9fafb; border-left: 4px solid ${severityColors[config.severity]}; padding: 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 16px;">${config.message}</p>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
      <strong>Severity:</strong>
      <span style="display: inline-block; background: ${severityColors[config.severity]}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
        ${config.severity}
      </span>
    </p>

    ${config.jobId ? `
    <a href="${appUrl}/jobs/${config.jobId}"
       style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin-top: 10px;">
      View Job Details →
    </a>
    ` : ''}
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
      This is an automated alert from Pulcrix.
      <a href="${appUrl}/settings/notifications" style="color: #6b7280;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
        `,
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
  }
}
