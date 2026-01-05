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

  // Only allow bootstrap if *no* roles exist yet
  const { data: existingRoles, error: existingError } = await adminClient
    .from("user_roles")
    .select("id")
    .limit(1);

  if (existingError) return json(500, { error: existingError.message });
  if ((existingRoles?.length ?? 0) > 0) {
    return json(403, {
      error: "Roles already initialized",
      message: "An admin must assign your role.",
    });
  }

  const { error: insertError } = await adminClient.from("user_roles").insert({
    user_id: userData.user.id,
    role: "admin",
  });

  if (insertError) return json(500, { error: insertError.message });

  return json(200, { ok: true, role: "admin" });
});
