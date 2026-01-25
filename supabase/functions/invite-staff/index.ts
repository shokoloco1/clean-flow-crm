import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        certifications: certifications || [],
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true
      });

    if (profileError) {
      console.error("[invite-staff] Profile creation error:", profileError);
      throw profileError;
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

    // 5. Send invitation email (generates magic link)
    const origin = req.headers.get("origin");
    const redirectTo = `${origin || "https://cleanflow.com.au"}/auth`;
    
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo
    });

    if (inviteError) {
      console.error("[invite-staff] Invite email error:", inviteError);
      // Don't throw - user was created, they can use password reset
    } else {
      console.log(`[invite-staff] Invitation email sent to ${email}`);
    }

    return new Response(
      JSON.stringify({ success: true, userId, message: "Staff member created and invitation sent" }),
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
