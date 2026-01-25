import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    logStep("ERROR: No signature provided");
    return new Response("No signature", { status: 400 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    logStep("Received event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id, mode: session.mode });
        
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          const customerId = session.customer as string;
          const customerEmail = session.customer_email || session.customer_details?.email;
          
          logStep("Processing subscription", { 
            subscriptionId: subscription.id, 
            customerEmail,
            status: subscription.status 
          });
          
          // Find user by email
          const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("email", customerEmail)
            .maybeSingle();

          if (profileError) {
            logStep("ERROR finding profile", { error: profileError.message });
          }

          if (profile) {
            // Upsert subscription record
            const { error: upsertError } = await supabaseAdmin.from("subscriptions").upsert({
              user_id: profile.user_id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: "user_id" });

            if (upsertError) {
              logStep("ERROR upserting subscription", { error: upsertError.message });
            } else {
              logStep("Subscription created/updated successfully", { userId: profile.user_id });
            }
          } else {
            logStep("No profile found for email", { email: customerEmail });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });
        
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            stripe_price_id: subscription.items.data[0]?.price.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logStep("ERROR updating subscription", { error: error.message });
        } else {
          logStep("Subscription updated in DB");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });
        
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logStep("ERROR marking subscription canceled", { error: error.message });
        } else {
          logStep("Subscription marked as canceled");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id });
        
        if (invoice.subscription) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (error) {
            logStep("ERROR updating to past_due", { error: error.message });
          } else {
            logStep("Subscription marked as past_due");
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { message: errorMessage });
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }
});
