import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TqYsXCeRh77yKE": "starter",
  "prod_TqYtBATWyj2Z1M": "professional", 
  "prod_TqYtRfuIbEqzoD": "business",
  // Annual products map to the same plans
};

// Helper: check local DB for active subscription
// deno-lint-ignore no-explicit-any
async function checkDbSubscription(supabaseClient: any, userId: string) {
  const { data: dbSub, error } = await supabaseClient
    .from("subscriptions")
    .select("status, current_period_end, stripe_price_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logStep("DB subscription query error", { error: error.message });
    return null;
  }
  return dbSub;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking local DB");

      // Fallback: check local subscriptions table
      const dbSub = await checkDbSubscription(supabaseClient, user.id);

      if (dbSub?.status === "active" && dbSub.current_period_end) {
        const periodEnd = new Date(dbSub.current_period_end);
        if (periodEnd > new Date()) {
          logStep("DB active subscription found (no Stripe customer)", { periodEnd: periodEnd.toISOString() });
          return new Response(JSON.stringify({
            subscribed: true,
            plan: "manual",
            is_annual: false,
            subscription_end: periodEnd.toISOString(),
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      logStep("No valid subscription in Stripe or DB");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let plan: string | null = null;
    let subscriptionEnd: string | null = null;
    let isAnnual = false;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      const productId = subscription.items.data[0].price.product as string;
      const priceInterval = subscription.items.data[0].price.recurring?.interval;
      isAnnual = priceInterval === "year";
      
      plan = PRODUCT_TO_PLAN[productId] || "unknown";
      
      logStep("Active Stripe subscription found", { 
        subscriptionId: subscription.id, 
        plan,
        isAnnual,
        endDate: subscriptionEnd 
      });
    } else {
      // Stripe customer exists but no active subscription — check DB as fallback
      logStep("No active Stripe subscription, checking local DB");
      const dbSub = await checkDbSubscription(supabaseClient, user.id);

      if (dbSub?.status === "active" && dbSub.current_period_end) {
        const periodEnd = new Date(dbSub.current_period_end);
        if (periodEnd > new Date()) {
          logStep("DB active subscription found (Stripe customer has no active sub)", { periodEnd: periodEnd.toISOString() });
          return new Response(JSON.stringify({
            subscribed: true,
            plan: "manual",
            is_annual: false,
            subscription_end: periodEnd.toISOString(),
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      logStep("No active subscription found in Stripe or DB");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      is_annual: isAnnual,
      subscription_end: subscriptionEnd
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
