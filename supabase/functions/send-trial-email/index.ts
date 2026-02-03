import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TRIAL-EMAIL] ${step}${detailsStr}`);
};

type EmailType = 'welcome' | 'day_7' | 'day_3' | 'day_1' | 'expired' | 'converted';

interface EmailRequest {
  userId: string;
  emailType: EmailType;
}

function getEmailContent(type: EmailType, userName: string, daysRemaining: number, plan: string): { subject: string; html: string } {
  const appUrl = Deno.env.get("APP_URL") || "https://pulcrix.com";

  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
  `;

  const buttonStyle = `
    display: inline-block;
    background-color: #0D9488;
    color: white;
    padding: 14px 28px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
  `;

  const templates: Record<EmailType, { subject: string; content: string }> = {
    welcome: {
      subject: "Welcome to Pulcrix! Your 14-Day Trial Starts Now",
      content: `
        <h2 style="color: #0D9488; margin-bottom: 16px;">Welcome to Pulcrix!</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for signing up for Pulcrix! Your <strong>14-day free trial</strong> is now active.</p>
        <p>Here's what you can do during your trial:</p>
        <ul style="margin: 16px 0; padding-left: 20px;">
          <li>Schedule unlimited cleaning jobs</li>
          <li>Manage your staff and track their work</li>
          <li>Create professional invoices with GST</li>
          <li>Capture before/after photo evidence</li>
          <li>Give clients access to their portal</li>
        </ul>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/admin" style="${buttonStyle}">Get Started</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Your trial will automatically convert to the <strong>${plan}</strong> plan after 14 days.
          You can cancel anytime before then.
        </p>
      `,
    },
    day_7: {
      subject: "One Week Down! How's Pulcrix Working for You?",
      content: `
        <h2 style="color: #0D9488; margin-bottom: 16px;">You're Halfway Through Your Trial!</h2>
        <p>Hi ${userName},</p>
        <p>You've been using Pulcrix for a week now. We hope it's making your cleaning business easier to manage!</p>
        <p><strong>${daysRemaining} days left</strong> in your free trial.</p>
        <p>Quick tips to get the most out of Pulcrix:</p>
        <ul style="margin: 16px 0; padding-left: 20px;">
          <li>Set up recurring jobs for regular clients</li>
          <li>Invite your staff members to the app</li>
          <li>Try the mobile-friendly photo capture</li>
        </ul>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/admin" style="${buttonStyle}">Continue Using Pulcrix</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Questions? Reply to this email - we're here to help!
        </p>
      `,
    },
    day_3: {
      subject: "3 Days Left in Your Pulcrix Trial",
      content: `
        <h2 style="color: #f59e0b; margin-bottom: 16px;">Your Trial Ends Soon</h2>
        <p>Hi ${userName},</p>
        <p>Just a heads up - you have <strong>3 days left</strong> in your Pulcrix trial.</p>
        <p>After your trial ends, your subscription will automatically start and you'll continue to have full access to all features on the <strong>${plan}</strong> plan.</p>
        <p>If you're not ready to continue, you can cancel anytime from your account settings. No questions asked.</p>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/admin/settings" style="${buttonStyle}">Manage Subscription</a>
        </p>
      `,
    },
    day_1: {
      subject: "Final Day of Your Pulcrix Trial",
      content: `
        <h2 style="color: #ef4444; margin-bottom: 16px;">Last Day of Your Trial</h2>
        <p>Hi ${userName},</p>
        <p>This is your final day of the Pulcrix free trial.</p>
        <p>Tomorrow, your <strong>${plan}</strong> subscription will begin and your card will be charged.</p>
        <p>Want to cancel? You can do so from your account settings before midnight tonight.</p>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/admin/settings" style="${buttonStyle}">Review Your Account</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you continue, you'll keep all your data and have uninterrupted access to Pulcrix.
        </p>
      `,
    },
    expired: {
      subject: "Your Pulcrix Trial Has Ended",
      content: `
        <h2 style="color: #0D9488; margin-bottom: 16px;">Trial Ended - Subscription Active</h2>
        <p>Hi ${userName},</p>
        <p>Your 14-day Pulcrix trial has ended and your <strong>${plan}</strong> subscription is now active.</p>
        <p>Thank you for choosing Pulcrix to manage your cleaning business!</p>
        <p>You now have full, uninterrupted access to all features:</p>
        <ul style="margin: 16px 0; padding-left: 20px;">
          <li>Unlimited job scheduling</li>
          <li>Staff management & tracking</li>
          <li>Professional invoicing with GST</li>
          <li>Before/after photo evidence</li>
          <li>Client portal access</li>
        </ul>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/admin" style="${buttonStyle}">Open Pulcrix</a>
        </p>
      `,
    },
    converted: {
      subject: "Thanks for Subscribing to Pulcrix!",
      content: `
        <h2 style="color: #0D9488; margin-bottom: 16px;">Welcome Aboard!</h2>
        <p>Hi ${userName},</p>
        <p>Your first payment has been processed successfully. Thank you for subscribing to Pulcrix!</p>
        <p>You're now on the <strong>${plan}</strong> plan with full access to everything.</p>
        <p>If you ever need help, our support team is just an email away.</p>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/admin" style="${buttonStyle}">Go to Dashboard</a>
        </p>
      `,
    },
  };

  const template = templates[type];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyles} margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #0D9488; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
              <span style="color: white; font-size: 24px;">✨</span>
            </div>
            <h1 style="margin: 0; color: #1a1a1a; font-size: 24px;">Pulcrix</h1>
          </div>

          <!-- Content -->
          ${template.content}

          <!-- Footer -->
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
          <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
            Pulcrix - Clean Living. Pure Solutions.<br>
            <a href="${appUrl}" style="color: #0D9488;">pulcrix.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: template.subject, html };
}

async function sendEmailWithResend(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    logStep("ERROR: RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Pulcrix <notifications@pulcrix.com>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logStep("Resend API error", { status: response.status, error: errorData });
      return { success: false, error: errorData.message || "Failed to send email" };
    }

    const data = await response.json();
    logStep("Email sent successfully", { id: data.id });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("Email send error", { error: message });
    return { success: false, error: message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if this is a scheduled cron job or manual request
    const contentType = req.headers.get("content-type") || "";
    let emailRequests: EmailRequest[] = [];

    if (contentType.includes("application/json")) {
      // Manual request with specific user/type
      const body = await req.json();
      if (body.userId && body.emailType) {
        emailRequests = [{ userId: body.userId, emailType: body.emailType }];
      }
    }

    // If no manual requests, check for pending trial notifications
    if (emailRequests.length === 0) {
      logStep("Running scheduled trial email check");

      // Find users with active trials
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, plan, trial_start, trial_end")
        .eq("status", "trialing")
        .not("trial_end", "is", null);

      if (subError) {
        logStep("ERROR fetching subscriptions", { error: subError.message });
        throw subError;
      }

      const now = new Date();

      for (const sub of subscriptions || []) {
        if (!sub.trial_end) continue;

        const trialEnd = new Date(sub.trial_end);
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let notificationType: EmailType | null = null;

        if (daysRemaining === 7) notificationType = "day_7";
        else if (daysRemaining === 3) notificationType = "day_3";
        else if (daysRemaining === 1) notificationType = "day_1";
        else if (daysRemaining <= 0) notificationType = "expired";

        if (notificationType) {
          // Check if already sent
          const { data: existing } = await supabaseAdmin
            .from("trial_notifications")
            .select("id")
            .eq("user_id", sub.user_id)
            .eq("notification_type", notificationType)
            .maybeSingle();

          if (!existing) {
            emailRequests.push({ userId: sub.user_id, emailType: notificationType });
          }
        }
      }
    }

    logStep("Processing email requests", { count: emailRequests.length });

    let successCount = 0;
    let errorCount = 0;

    for (const request of emailRequests) {
      // Get user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", request.userId)
        .maybeSingle();

      if (profileError || !profile?.email) {
        logStep("ERROR: Profile not found", { userId: request.userId });
        errorCount++;
        continue;
      }

      // Get subscription details
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, trial_end")
        .eq("user_id", request.userId)
        .maybeSingle();

      const plan = sub?.plan || "Professional";
      const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : new Date();
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      // Generate email content
      const { subject, html } = getEmailContent(
        request.emailType,
        profile.full_name || "there",
        daysRemaining,
        plan.charAt(0).toUpperCase() + plan.slice(1)
      );

      // Send email
      const result = await sendEmailWithResend(profile.email, subject, html);

      if (result.success) {
        // Record the notification
        await supabaseAdmin.from("trial_notifications").insert({
          user_id: request.userId,
          notification_type: request.emailType,
        });
        successCount++;
        logStep("Email sent", { userId: request.userId, type: request.emailType });
      } else {
        errorCount++;
        logStep("Failed to send email", { userId: request.userId, error: result.error });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: emailRequests.length,
      sent: successCount,
      errors: errorCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
