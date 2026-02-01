/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(500, { error: "Server misconfigured" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  // Verify caller (must be logged in)
  const authedClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await authedClient.auth.getUser();
  if (userError || !userData?.user) return json(401, { error: "Invalid token" });

  // Admin client (bypasses RLS)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // SECURITY: Only allow bootstrap if no ADMIN exists yet
  // This prevents privilege escalation after initial setup
  const { data: existingAdmins, error: existingError } = await adminClient
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (existingError) {
    console.error("[bootstrap-role] Error checking existing admins:", existingError);
    return json(500, { error: existingError.message });
  }

  if ((existingAdmins?.length ?? 0) > 0) {
    console.warn("[bootstrap-role] Rejected bootstrap attempt - admin already exists", {
      requestingUserId: userData.user.id,
      requestingEmail: userData.user.email,
    });
    return json(403, {
      error: "An administrator already exists",
      message: "Please contact your business owner to get access. They can assign you a role from Settings > Staff Management.",
    });
  }

  console.log("[bootstrap-role] Creating first admin", {
    userId: userData.user.id,
    email: userData.user.email,
  });

  const { error: insertError } = await adminClient.from("user_roles").insert({
    user_id: userData.user.id,
    role: "admin",
  });

  if (insertError) return json(500, { error: insertError.message });

  return json(200, { ok: true, role: "admin" });
});
