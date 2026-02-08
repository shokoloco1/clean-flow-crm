import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailTemplate =
  | 'password_reset'
  | 'welcome'
  | 'welcome_staff'
  | 'job_notification'
  | 'job_assigned'
  | 'job_reminder'
  | 'job_completed'
  | 'payment_received'
  | 'alert_notification'
  | 'custom';

interface EmailRequest {
  to: string;
  subject?: string;
  template: EmailTemplate;
  variables?: {
    name?: string;
    staffName?: string;
    resetLink?: string;
    jobLocation?: string;
    jobDate?: string;
    jobTime?: string;
    jobServices?: string;
    clientName?: string;
    amount?: string;
    invoiceNumber?: string;
    alertType?: string;
    alertMessage?: string;
    actionUrl?: string;
    customHtml?: string;
  };
}

// Base HTML template wrapper with Pulcrix branding
const getBaseTemplate = (content: string, preheader?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulcrix</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D9488 0%, #134E4A 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <div style="width: 56px; height: 56px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; line-height: 56px; font-size: 28px;">✨</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Pulcrix</h1>
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Clean Living. Pure Solutions.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #71717a; font-size: 13px;">
                © ${new Date().getFullYear()} Pulcrix. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px;">
                Made for Australian cleaning businesses 🇦🇺
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// CTA Button component
const ctaButton = (text: string, url: string) => `
<table role="presentation" style="width: 100%; margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display: inline-block; background-color: #0D9488; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.3);">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;

// Info box component
const infoBox = (items: { icon: string; label: string; value: string }[]) => `
<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
  ${items.map(item => `
    <p style="margin: ${items.indexOf(item) === 0 ? '0' : '10px 0 0'};">
      <strong>${item.icon} ${item.label}:</strong> ${item.value}
    </p>
  `).join('')}
</div>
`;

const getEmailTemplate = (template: EmailTemplate, variables: EmailRequest['variables'] = {}) => {
  const appUrl = Deno.env.get("APP_URL") || "https://pulcrix.com.au";
  const actionUrl = variables.actionUrl || appUrl;

  switch (template) {
    case 'password_reset':
      return {
        subject: 'Reset Your Password - Pulcrix',
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            Hi ${variables.name || 'there'},
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            We received a request to reset the password for your account.
          </p>
          <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
            Click the button below to create a new password:
          </p>
          ${ctaButton('Reset Password', variables.resetLink || '#')}
          <p style="margin: 24px 0 0; color: #71717a; font-size: 14px; line-height: 1.5;">
            If you didn't request this change, you can safely ignore this email. The link will expire in 1 hour.
          </p>
        `, 'Reset your Pulcrix password')
      };

    case 'welcome':
      return {
        subject: 'Welcome to Pulcrix! 🎉',
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            Hi ${variables.name || 'there'}! 👋
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            Thanks for joining Pulcrix! We're excited to have you on board.
          </p>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            With Pulcrix you can:
          </p>
          <ul style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.8; padding-left: 20px;">
            <li>📋 Manage all your cleaning jobs</li>
            <li>👥 Coordinate your team effortlessly</li>
            <li>📸 Document your work with photos</li>
            <li>📊 View metrics and reports</li>
          </ul>
          ${ctaButton('Open Pulcrix', appUrl)}
          <p style="margin: 0; color: #52525b; font-size: 16px;">
            Start organising your cleaning business today!
          </p>
        `, 'Welcome to Pulcrix - your cleaning business management app')
      };

    case 'welcome_staff':
      return {
        subject: 'Welcome to the Team! 🎉 - Pulcrix',
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            Welcome to the Team, ${variables.staffName || variables.name || 'there'}! 🎉
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            Your account has been set up successfully. You're now part of the team!
          </p>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            Here's what you can do with Pulcrix:
          </p>
          <ul style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.8; padding-left: 20px;">
            <li>📅 View your daily job schedule</li>
            <li>🗺️ Get directions to job locations</li>
            <li>📸 Upload before & after photos</li>
            <li>✅ Mark jobs as complete</li>
            <li>🔔 Receive notifications for new assignments</li>
          </ul>
          ${ctaButton('Open Pulcrix', appUrl)}
          <p style="margin: 0; color: #71717a; font-size: 14px;">
            If you have any questions, contact your manager.
          </p>
        `, 'Your Pulcrix account is ready')
      };

    case 'job_notification':
      return {
        subject: 'New Job Assigned - Pulcrix',
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            Hi ${variables.name || 'there'},
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            You've been assigned a new job:
          </p>
          ${infoBox([
            { icon: '📍', label: 'Location', value: variables.jobLocation || 'Not specified' },
            { icon: '📅', label: 'Date', value: variables.jobDate || 'Not specified' },
            { icon: '🕐', label: 'Time', value: variables.jobTime || 'Not specified' }
          ])}
          ${ctaButton('View Job Details', actionUrl)}
          <p style="margin: 0; color: #71717a; font-size: 14px;">
            Open the app for more details.
          </p>
        `, 'You have a new job assignment')
      };

    case 'job_assigned':
      return {
        subject: `New Job: ${variables.clientName || 'Client'} - Pulcrix`,
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            New Job Assigned 📋
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            Hi ${variables.staffName || variables.name || 'there'}, you've been assigned a new cleaning job.
          </p>
          ${infoBox([
            { icon: '👤', label: 'Client', value: variables.clientName || 'Not specified' },
            { icon: '📍', label: 'Location', value: variables.jobLocation || 'Not specified' },
            { icon: '📅', label: 'Date', value: variables.jobDate || 'Not specified' },
            { icon: '🕐', label: 'Time', value: variables.jobTime || 'Not specified' },
            ...(variables.jobServices ? [{ icon: '🧹', label: 'Services', value: variables.jobServices }] : [])
          ])}
          ${ctaButton('View Job Details', actionUrl)}
          <p style="margin: 0; color: #71717a; font-size: 14px;">
            Make sure to check in when you arrive at the location.
          </p>
        `, `New job assigned: ${variables.clientName || 'Client'}`)
      };

    case 'job_reminder':
      return {
        subject: '⏰ Reminder: Job in 1 Hour - Pulcrix',
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            ⏰ Job Starting Soon!
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            Hi ${variables.staffName || variables.name || 'there'}, you have a job starting in approximately 1 hour.
          </p>
          ${infoBox([
            { icon: '👤', label: 'Client', value: variables.clientName || 'Not specified' },
            { icon: '📍', label: 'Location', value: variables.jobLocation || 'Not specified' },
            { icon: '🕐', label: 'Time', value: variables.jobTime || 'Not specified' },
            ...(variables.jobServices ? [{ icon: '🧹', label: 'Services', value: variables.jobServices }] : [])
          ])}
          ${ctaButton('Get Directions', actionUrl)}
          <p style="margin: 0; color: #71717a; font-size: 14px;">
            Don't forget to check in when you arrive!
          </p>
        `, 'Your job starts in 1 hour')
      };

    case 'job_completed':
      return {
        subject: 'Job Completed ✅ - Pulcrix',
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            Job Completed! ✅
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            The job at <strong>${variables.jobLocation || 'the location'}</strong> has been marked as completed.
          </p>
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: 600;">✓ Successfully Completed</p>
            ${variables.jobDate ? `<p style="margin: 8px 0 0; color: #065f46; font-size: 14px;">${variables.jobDate}</p>` : ''}
          </div>
          ${ctaButton('View Details', actionUrl)}
          <p style="margin: 0; color: #71717a; font-size: 14px;">
            You can view details and photos in your dashboard.
          </p>
        `, 'Job completed successfully')
      };

    case 'payment_received':
      return {
        subject: `Payment Received: $${variables.amount || '0'} - Pulcrix`,
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            Payment Received! 💰
          </h2>
          <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
            Great news! We've received a payment for your invoice.
          </p>
          <div style="background: #d1fae5; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">Amount Received</p>
            <p style="margin: 8px 0 0; color: #065f46; font-size: 32px; font-weight: 700;">$${variables.amount || '0.00'}</p>
            ${variables.invoiceNumber ? `<p style="margin: 12px 0 0; color: #065f46; font-size: 14px;">Invoice #${variables.invoiceNumber}</p>` : ''}
          </div>
          ${infoBox([
            { icon: '👤', label: 'From', value: variables.clientName || 'Client' },
            { icon: '📅', label: 'Date', value: variables.jobDate || new Date().toLocaleDateString('en-AU') }
          ])}
          ${ctaButton('View Invoice', actionUrl)}
          <p style="margin: 0; color: #71717a; font-size: 14px;">
            Thank you for using Pulcrix!
          </p>
        `, `Payment of $${variables.amount || '0'} received`)
      };

    case 'alert_notification':
      const alertColors: Record<string, { bg: string; text: string; icon: string }> = {
        'late_arrival': { bg: '#fef3c7', text: '#92400e', icon: '⏰' },
        'no_show': { bg: '#fee2e2', text: '#991b1b', icon: '❌' },
        'geofence': { bg: '#fce7f3', text: '#9d174d', icon: '📍' },
        'default': { bg: '#fed7aa', text: '#9a3412', icon: '⚠️' }
      };
      const alertStyle = alertColors[variables.alertType || 'default'] || alertColors.default;

      return {
        subject: `⚠️ Alert: ${variables.alertType?.replace('_', ' ').toUpperCase() || 'Notification'} - Pulcrix`,
        html: getBaseTemplate(`
          <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
            ${alertStyle.icon} Alert Notification
          </h2>
          <div style="background: ${alertStyle.bg}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${alertStyle.text};">
            <p style="margin: 0; color: ${alertStyle.text}; font-size: 16px; font-weight: 600;">
              ${variables.alertType?.replace('_', ' ').toUpperCase() || 'ALERT'}
            </p>
            <p style="margin: 8px 0 0; color: ${alertStyle.text}; font-size: 14px;">
              ${variables.alertMessage || 'An alert has been triggered that requires your attention.'}
            </p>
          </div>
          ${variables.staffName ? `<p style="margin: 0 0 16px; color: #52525b; font-size: 16px;"><strong>Staff:</strong> ${variables.staffName}</p>` : ''}
          ${variables.jobLocation ? `<p style="margin: 0 0 16px; color: #52525b; font-size: 16px;"><strong>Location:</strong> ${variables.jobLocation}</p>` : ''}
          ${ctaButton('View Now', actionUrl)}
          <p style="margin: 0; color: #71717a; font-size: 14px;">
            Please address this alert as soon as possible.
          </p>
        `, `Alert: ${variables.alertType || 'Notification'}`)
      };

    case 'custom':
      return {
        subject: 'Pulcrix Notification',
        html: variables.customHtml || getBaseTemplate(`
          <p style="margin: 0; color: #52525b; font-size: 16px;">
            You have a new notification from Pulcrix.
          </p>
        `)
      };

    default:
      return {
        subject: 'Pulcrix Notification',
        html: getBaseTemplate(`
          <p style="margin: 0; color: #52525b; font-size: 16px;">
            You have a new notification.
          </p>
        `)
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-email] Received request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-email] No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("[send-email] Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-email] Authenticated user: ${user.id}`);

    const { to, subject, template, variables }: EmailRequest = await req.json();

    console.log(`[send-email] Sending ${template} email to ${to}`);

    if (!to || !template) {
      throw new Error("Missing required fields: 'to' and 'template' are required");
    }

    const emailContent = getEmailTemplate(template, variables);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Pulcrix <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject || emailContent.subject,
      html: emailContent.html,
    });

    console.log("[send-email] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
