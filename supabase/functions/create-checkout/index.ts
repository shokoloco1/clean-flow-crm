import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 14;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Map price IDs to plan names
function getPlanFromPriceId(priceId: string): string {
  const planMap: Record<string, string> = {
    // Starter
    "price_1SsrkkPatNmvLMdZMIy3yxsG": "starter",
    "price_1SsrlTPatNmvLMdZ6E12DUTK": "starter",
    // Professional
    "price_1SsrlGPatNmvLMdZ5bMSzXje": "professional",
    "price_1SsrlUPatNmvLMdZZsHJ4Eax": "professional",
    // Business
    "price_1SsrlPPatNmvLMdZa5u7hME2": "business",
    "price_1SsrlWPatNmvLMdZQFvR99qN": "business",
  };
  return planMap[priceId] || "unknown";
}

function isAnnualPrice(priceId: string): boolean {
  const annualPrices = [
    "price_1SsrlTPatNmvLMdZ6E12DUTK", // starter annual
    "price_1SsrlUPatNmvLMdZZsHJ4Eax", // professional annual
    "price_1SsrlWPatNmvLMdZQFvR99qN", // business annual
  ];
  return annualPrices.includes(priceId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { priceId, isNewSignup = false } = body;
    if (!priceId) throw new Error("No price ID provided");

    const plan = getPlanFromPriceId(priceId);
    const isAnnual = isAnnualPrice(priceId);
    logStep("Price ID received", { priceId, plan, isAnnual, isNewSignup });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil"
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });

      // Check for existing subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        logStep("User already has active subscription");
        return new Response(JSON.stringify({
          error: "You already have an active subscription",
          hasSubscription: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "https://pulcrix.com";

    // Calculate trial end date for metadata
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    // Generate idempotency key to prevent duplicate checkout sessions
    const idempotencyKey = `checkout_${user.id}_${priceId}_${Date.now()}`;
    logStep("Using idempotency key", { idempotencyKey });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id, // Link to Supabase user
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      payment_method_collection: "always", // Always collect payment method for trial
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          user_id: user.id,
          plan: plan,
          is_annual: isAnnual.toString(),
          trial_end: trialEnd.toISOString(),
        },
      },
      metadata: {
        user_id: user.id,
        plan: plan,
        is_annual: isAnnual.toString(),
      },
    }, {
      idempotencyKey,
    });

    logStep("Checkout session created", {
      sessionId: session.id,
      url: session.url,
      trialDays: TRIAL_DAYS,
      trialEnd: trialEnd.toISOString()
    });

    // Pre-create subscription record in trialing status
    if (isNewSignup) {
      const trialStart = new Date();
      const { error: subError } = await supabaseAdmin.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId || "pending",
        status: "incomplete",
        plan: plan,
        is_annual: isAnnual,
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
      }, { onConflict: "user_id" });

      if (subError) {
        logStep("Warning: Failed to pre-create subscription", { error: subError.message });
      } else {
        logStep("Pre-created subscription record");
      }
    }

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
      trialDays: TRIAL_DAYS,
      trialEnd: trialEnd.toISOString()
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
