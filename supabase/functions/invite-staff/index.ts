import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email template for staff invitation
const getInvitationEmailHtml = (staffName: string, inviteLink: string, adminName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Pulcrix</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2D5A3D 0%, #1A3A2A 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <div style="width: 56px; height: 56px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px;">✨</span>
                    </div>
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
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
                Welcome to the Team, ${staffName}! 🎉
              </h2>

              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                ${adminName} has invited you to join their cleaning business on Pulcrix. You'll be able to view your assigned jobs, check in at locations, and upload photos directly from your phone.
              </p>

              <p style="margin: 0 0 32px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click the button below to set up your account and get started:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}"
                       style="display: inline-block; background-color: #2D5A3D; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(45, 90, 61, 0.3);">
                      Set Up My Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                <strong>What you can do with Pulcrix:</strong>
              </p>
              <ul style="margin: 12px 0 24px; color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>View your daily job schedule</li>
                <li>Get directions to job locations</li>
                <li>Upload before & after photos</li>
                <li>Mark jobs as complete</li>
                <li>Receive notifications for new assignments</li>
              </ul>

              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">

              <p style="margin: 0; color: #71717a; font-size: 13px; line-height: 1.5;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>

              <p style="margin: 16px 0 0; color: #a1a1aa; font-size: 12px;">
                This link will expire in 24 hours for security reasons.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #71717a; font-size: 13px;">
                © ${new Date().getFullYear()} Pulcrix. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px;">
                Clean Living. Pure Solutions.
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

// Plain text version for email clients that don't support HTML
const getInvitationEmailText = (staffName: string, inviteLink: string, adminName: string) => `
Welcome to Pulcrix, ${staffName}!

${adminName} has invited you to join their cleaning business on Pulcrix.

Click the link below to set up your account:
${inviteLink}

What you can do with Pulcrix:
- View your daily job schedule
- Get directions to job locations
- Upload before & after photos
- Mark jobs as complete
- Receive notifications for new assignments

If you didn't expect this invitation, you can safely ignore this email.

This link will expire in 24 hours for security reasons.

© ${new Date().getFullYear()} Pulcrix. All rights reserved.
`;

// Send email via Resend
async function sendEmailWithResend(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    console.error("[invite-staff] RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    console.log(`[invite-staff] Sending email to ${to} via Resend`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Pulcrix <noreply@pulcrix.com>",
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("[invite-staff] Resend API error:", responseData);
      return { success: false, error: responseData.message || "Failed to send email" };
    }

    console.log(`[invite-staff] Email sent successfully. ID: ${responseData.id}`);
    return { success: true };
  } catch (error) {
    console.error("[invite-staff] Email sending error:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

// Retry wrapper for email sending
async function sendEmailWithRetry(
  to: string,
  subject: string,
  html: string,
  text: string,
  maxRetries = 3
): Promise<{ success: boolean; error?: string; attempts: number }> {
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[invite-staff] Email attempt ${attempt}/${maxRetries}`);

    const result = await sendEmailWithResend(to, subject, html, text);

    if (result.success) {
      return { success: true, attempts: attempt };
    }

    lastError = result.error || "Unknown error";

    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      console.log(`[invite-staff] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  return { success: false, error: lastError, attempts: maxRetries };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[invite-staff] Processing request");

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify caller is admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      throw new Error("Only admins can invite staff");
    }

    // Get admin's name for the email
    const { data: adminProfile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const adminName = adminProfile?.full_name || user.email?.split("@")[0] || "Your manager";

    // Get request body
    const { email, fullName, phone, hourlyRate, certifications } = await req.json();

    if (!email || !fullName) {
      throw new Error("Email and name are required");
    }

    console.log(`[invite-staff] Admin ${user.email} inviting ${email}`);

    // Use admin client for user creation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Create user with admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name: fullName }
    });

    if (userError) {
      console.error("[invite-staff] User creation error:", userError);
      if (userError.message.includes("already been registered")) {
        throw new Error("This email is already registered");
      }
      throw userError;
    }

    const userId = userData.user.id;
    console.log(`[invite-staff] User created with ID: ${userId}`);

    // 2. Create profile (without sensitive data)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        certifications: certifications || [],
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true
      });

    if (profileError) {
      console.error("[invite-staff] Profile creation error:", profileError);
      throw profileError;
    }

    // 2b. Create sensitive profile data (hourly rate)
    if (hourlyRate) {
      const { error: sensitiveError } = await supabaseAdmin
        .from("profiles_sensitive")
        .insert({
          user_id: userId,
          hourly_rate: parseFloat(hourlyRate)
        });

      if (sensitiveError) {
        console.error("[invite-staff] Sensitive profile error:", sensitiveError);
        // Don't throw - profile was created, just log the error
      }
    }

    // 3. Assign staff role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "staff" });

    if (roleError) {
      console.error("[invite-staff] Role assignment error:", roleError);
      throw roleError;
    }

    // 4. Create default availability (Mon-Fri 8am-5pm)
    const availabilityRecords = [1, 2, 3, 4, 5].map(day => ({
      user_id: userId,
      day_of_week: day,
      start_time: "08:00",
      end_time: "17:00",
      is_available: true
    }));
    availabilityRecords.push(
      { user_id: userId, day_of_week: 0, start_time: "08:00", end_time: "17:00", is_available: false },
      { user_id: userId, day_of_week: 6, start_time: "08:00", end_time: "17:00", is_available: false }
    );
    await supabaseAdmin.from("staff_availability").insert(availabilityRecords);

    // 5. Generate magic link for password setup
    const origin = req.headers.get("origin");
    const redirectTo = `${origin || "https://pulcrix.com"}/auth`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo
      }
    });

    if (linkError) {
      console.error("[invite-staff] Link generation error:", linkError);
      // Continue anyway - we'll inform the admin that email might not have been sent
    }

    // 6. Send invitation email via Resend
    let emailSent = false;
    let emailError = "";

    if (linkData?.properties?.hashed_token) {
      // Construct the invite URL using Supabase's verify endpoint
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const inviteLink = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`;

      console.log(`[invite-staff] Generated invite link for ${email}`);

      const emailHtml = getInvitationEmailHtml(fullName, inviteLink, adminName);
      const emailText = getInvitationEmailText(fullName, inviteLink, adminName);

      const emailResult = await sendEmailWithRetry(
        email,
        `Welcome to Pulcrix - ${adminName} invited you to join!`,
        emailHtml,
        emailText
      );

      emailSent = emailResult.success;
      emailError = emailResult.error || "";

      if (emailResult.success) {
        console.log(`[invite-staff] Invitation email sent to ${email} (${emailResult.attempts} attempt(s))`);
      } else {
        console.error(`[invite-staff] Failed to send email after ${emailResult.attempts} attempts: ${emailError}`);
      }
    } else {
      // Fallback: try Supabase's built-in invite
      console.log("[invite-staff] Falling back to Supabase invite");
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo
      });

      if (inviteError) {
        console.error("[invite-staff] Supabase invite error:", inviteError);
        emailError = inviteError.message;
      } else {
        emailSent = true;
        console.log(`[invite-staff] Supabase invitation email sent to ${email}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        emailSent,
        emailError: emailError || undefined,
        message: emailSent
          ? "Staff member created and invitation sent"
          : "Staff member created but invitation email may not have been sent. They can use password reset."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[invite-staff] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
