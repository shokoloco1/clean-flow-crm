import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const PRODUCTION_URL = Deno.env.get("APP_URL") || "https://spotless-log.lovable.app";
const REDIRECT_TO = `${PRODUCTION_URL}/staff/accept-invite`;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed =
    origin === "https://pulcrix.com" ||
    origin === "http://localhost:8080" ||
    origin === "http://localhost:3000" ||
    origin.endsWith(".lovable.app");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://pulcrix.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Branded HTML email template for Resend (secondary layer)
const getInvitationEmailHtml = (staffName: string, adminName: string) => `
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
            <td style="background: linear-gradient(135deg, #0D9488 0%, #134E4A 100%); padding: 32px 40px; text-align: center;">
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
                ${adminName} te ha invitado a unirte a su empresa de limpieza en Pulcrix. Revisa tu bandeja de entrada (y spam) para encontrar el correo de verificación con el enlace para configurar tu cuenta.
              </p>

              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Una vez configurada tu cuenta, podrás:
              </p>

              <ul style="margin: 0 0 32px; color: #52525b; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>View your daily job schedule</li>
                <li>Get directions to job locations</li>
                <li>Upload before &amp; after photos</li>
                <li>Mark jobs as complete</li>
                <li>Receive notifications for new assignments</li>
              </ul>

              <p style="margin: 0 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                <strong>App URL:</strong> <a href="${PRODUCTION_URL}" style="color: #0D9488;">${PRODUCTION_URL}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">

              <p style="margin: 0; color: #71717a; font-size: 13px; line-height: 1.5;">
                If you didn't expect this invitation, you can safely ignore this email.
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

const getInvitationEmailText = (staffName: string, adminName: string) => `
Welcome to Pulcrix, ${staffName}!

${adminName} has invited you to join their cleaning business on Pulcrix.

You'll receive a separate email with a secure link to set up your account and password.

Once set up, visit: ${PRODUCTION_URL}

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Pulcrix. All rights reserved.
`;

// Send branded welcome email via Resend (secondary/bonus layer)
async function sendBrandedWelcomeEmail(
  to: string,
  staffName: string,
  adminName: string
): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log("[invite-staff] RESEND_API_KEY not configured, skipping branded email");
    return;
  }

  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Pulcrix <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `Pulcrix - ${adminName} te ha invitado`,
        html: getInvitationEmailHtml(staffName, adminName),
        text: getInvitationEmailText(staffName, adminName),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[invite-staff] Branded welcome email sent via Resend. ID: ${data.id}`);
    } else {
      const err = await response.json();
      console.warn("[invite-staff] Resend branded email failed (non-critical):", err);
    }
  } catch (error) {
    console.warn("[invite-staff] Resend branded email error (non-critical):", error);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[invite-staff] Processing request");

    // Verify authenticated admin caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") throw new Error("Only admins can invite staff");

    // Get admin name for email
    const { data: adminProfile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const adminName = adminProfile?.full_name || user.email?.split("@")[0] || "Your manager";

    // Parse request body
    const { email, fullName, phone, hourlyRate, certifications } = await req.json();

    if (!email || !fullName) throw new Error("Email and name are required");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format");
    if (fullName.trim().length < 2) throw new Error("Name must be at least 2 characters");
    if (hourlyRate !== undefined && hourlyRate !== null) {
      const rate = parseFloat(hourlyRate);
      if (isNaN(rate) || rate < 0) throw new Error("Hourly rate must be a positive number");
    }

    console.log(`[invite-staff] Admin ${user.email} inviting ${email}`);

    // Use service role for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;
    let isExistingUser = false;

    if (existingUser) {
      console.log(`[invite-staff] User ${email} already exists (id: ${existingUser.id})`);
      userId = existingUser.id;
      isExistingUser = true;
    }

    // Step 2: Send invite via Supabase Auth (primary delivery — always works)
    // inviteUserByEmail creates user if not exists AND sends the invitation email
    console.log(`[invite-staff] Sending Supabase Auth invitation to ${email}`);
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: REDIRECT_TO }
    );

    if (inviteError) {
      console.error("[invite-staff] inviteUserByEmail error:", inviteError);
      throw new Error(`Failed to send invitation: ${inviteError.message}`);
    }

    // Use the user ID from the invite response (handles both new and existing users)
    userId = inviteData.user.id;
    console.log(`[invite-staff] Supabase Auth invitation sent. User ID: ${userId}`);

    // Step 3: Create or update profile with is_active: true
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        certifications: certifications || [],
        hire_date: isExistingUser ? undefined : new Date().toISOString().split('T')[0],
        is_active: true,  // Always explicitly set to true
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("[invite-staff] Profile upsert error:", profileError);
      // Non-fatal: invitation was already sent
    }

    // Step 4: Save sensitive data (hourly rate)
    if (hourlyRate) {
      const { error: sensitiveError } = await supabaseAdmin
        .from("profiles_sensitive")
        .upsert({
          user_id: userId,
          hourly_rate: parseFloat(hourlyRate),
        }, { onConflict: "user_id" });

      if (sensitiveError) {
        console.error("[invite-staff] Sensitive profile error:", sensitiveError);
      }
    }

    // Step 5: Assign staff role (upsert is safe for existing users)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "staff" }, { onConflict: "user_id" });

    if (roleError) {
      console.error("[invite-staff] Role assignment error:", roleError);
    }

    // Step 6: Create default availability for new users
    if (!isExistingUser) {
      const availabilityRecords = [1, 2, 3, 4, 5].map(day => ({
        user_id: userId,
        day_of_week: day,
        start_time: "08:00",
        end_time: "17:00",
        is_available: true,
      }));
      availabilityRecords.push(
        { user_id: userId, day_of_week: 0, start_time: "08:00", end_time: "17:00", is_available: false },
        { user_id: userId, day_of_week: 6, start_time: "08:00", end_time: "17:00", is_available: false }
      );
      await supabaseAdmin.from("staff_availability").insert(availabilityRecords);
    }

    // Step 7: Send branded Pulcrix welcome email via Resend (secondary layer, non-critical)
    // Fire-and-forget — don't await to avoid blocking the response
    sendBrandedWelcomeEmail(email, fullName, adminName).catch(err =>
      console.warn("[invite-staff] Branded email fire-and-forget error:", err)
    );

    console.log(`[invite-staff] ✅ Invitation complete for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        emailSent: true,
        message: "Staff member invited successfully. They will receive an email to set up their account.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[invite-staff] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
