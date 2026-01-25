import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'password_reset' | 'welcome' | 'job_notification' | 'job_completed' | 'custom';
  data?: {
    name?: string;
    resetLink?: string;
    jobLocation?: string;
    jobDate?: string;
    jobTime?: string;
    customHtml?: string;
  };
}

const getEmailTemplate = (type: string, data: EmailRequest['data'] = {}) => {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #374151;
  `;

  const buttonStyle = `
    display: inline-block;
    padding: 12px 24px;
    background-color: #0d9488;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
  `;

  switch (type) {
    case 'password_reset':
      return {
        subject: 'Reset Your Password - CleanFlow',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">Hi ${data.name || 'there'},</h2>
              <p>We received a request to reset the password for your account.</p>
              <p>Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetLink}" style="${buttonStyle}">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                If you didn't request this change, you can safely ignore this email. The link will expire in 1 hour.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. All rights reserved.
              </p>
            </div>
          </div>
        `
      };

    case 'welcome':
      return {
        subject: 'Welcome to CleanFlow! 🎉',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">Hi ${data.name || 'there'}! 👋</h2>
              <p>Thanks for joining CleanFlow! We're excited to have you on board.</p>
              <p>With CleanFlow you can:</p>
              <ul>
                <li>📋 Manage all your cleaning jobs</li>
                <li>👥 Coordinate your team effortlessly</li>
                <li>📸 Document your work with photos</li>
                <li>📊 View metrics and reports</li>
              </ul>
              <p>Start organising your cleaning business today!</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. All rights reserved.
              </p>
            </div>
          </div>
        `
      };

    case 'job_notification':
      return {
        subject: 'New Job Assigned - CleanFlow',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">Hi ${data.name || 'there'},</h2>
              <p>You've been assigned a new job:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📍 Location:</strong> ${data.jobLocation || 'Not specified'}</p>
                <p style="margin: 10px 0 0;"><strong>📅 Date:</strong> ${data.jobDate || 'Not specified'}</p>
                <p style="margin: 10px 0 0;"><strong>🕐 Time:</strong> ${data.jobTime || 'Not specified'}</p>
              </div>
              <p>Open the app for more details.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. All rights reserved.
              </p>
            </div>
          </div>
        `
      };

    case 'job_completed':
      return {
        subject: 'Job Completed - CleanFlow',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">Job Completed! ✅</h2>
              <p>The job at <strong>${data.jobLocation || 'the location'}</strong> has been marked as completed.</p>
              <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #065f46; font-size: 18px;">✓ Successfully Completed</p>
              </div>
              <p>You can view details and photos in the client portal.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. All rights reserved.
              </p>
            </div>
          </div>
        `
      };

    case 'custom':
      return {
        subject: data.customHtml ? 'CleanFlow Notification' : 'CleanFlow',
        html: data.customHtml || '<p>No content</p>'
      };

    default:
      return {
        subject: 'CleanFlow Notification',
        html: '<p>You have a new notification.</p>'
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
    const { to, subject, type, data }: EmailRequest = await req.json();
    
    console.log(`[send-email] Sending ${type} email to ${to}`);

    if (!to || !type) {
      throw new Error("Missing required fields: 'to' and 'type' are required");
    }

    const template = getEmailTemplate(type, data);

    // NOTE: Update this to your verified domain in Resend
    // e.g., "CleanFlow <noreply@yourdomain.com.au>"
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CleanFlow <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject || template.subject,
      html: template.html,
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
