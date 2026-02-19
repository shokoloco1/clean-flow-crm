import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper to get plan from price ID
function getPlanFromPriceId(priceId: string): string {
  const planMap: Record<string, string> = {
    "price_1SsrkkPatNmvLMdZMIy3yxsG": "starter",
    "price_1SsrlTPatNmvLMdZ6E12DUTK": "starter",
    "price_1SsrlGPatNmvLMdZ5bMSzXje": "professional",
    "price_1SsrlUPatNmvLMdZZsHJ4Eax": "professional",
    "price_1SsrlPPatNmvLMdZa5u7hME2": "business",
    "price_1SsrlWPatNmvLMdZQFvR99qN": "business",
  };
  return planMap[priceId] || "unknown";
}

function isAnnualPrice(priceId: string): boolean {
  const annualPrices = [
    "price_1SsrlTPatNmvLMdZ6E12DUTK",
    "price_1SsrlUPatNmvLMdZZsHJ4Eax",
    "price_1SsrlWPatNmvLMdZQFvR99qN",
  ];
  return annualPrices.includes(priceId);
}

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

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
          const userId = session.client_reference_id || session.metadata?.user_id;
          const priceId = subscription.items.data[0]?.price.id;
          const plan = session.metadata?.plan || getPlanFromPriceId(priceId || "");
          const isAnnual = session.metadata?.is_annual === "true" || isAnnualPrice(priceId || "");

          logStep("Processing subscription", {
            subscriptionId: subscription.id,
            customerEmail,
            userId,
            status: subscription.status,
            plan,
            isAnnual
          });

          // Find user by user_id first, then by email
          let profileUserId = userId;

          if (!profileUserId) {
            const { data: profile, error: profileError } = await supabaseAdmin
              .from("profiles")
              .select("user_id")
              .eq("email", customerEmail)
              .maybeSingle();

            if (profileError) {
              logStep("ERROR finding profile", { error: profileError.message });
            }

            profileUserId = profile?.user_id;
          }

          if (profileUserId) {
            // Validate priceId is recognized
            if (plan === "unknown") {
              logStep("WARNING: Unknown price ID", { priceId });
              // Continue anyway - we'll save the subscription but with unknown plan
            }

            // Validate customerId exists
            if (!customerId) {
              logStep("ERROR: No customer ID in session", { sessionId: session.id });
              break;
            }

            // Calculate trial dates
            const trialStart = subscription.trial_start
              ? new Date(subscription.trial_start * 1000).toISOString()
              : null;
            const trialEnd = subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null;

            // Upsert subscription record with trial info
            const { error: upsertError } = await supabaseAdmin.from("subscriptions").upsert({
              user_id: profileUserId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              status: subscription.status,
              plan: plan,
              is_annual: isAnnual,
              trial_start: trialStart,
              trial_end: trialEnd,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: "user_id" });

            if (upsertError) {
              logStep("ERROR upserting subscription", { error: upsertError.message });
            } else {
              logStep("Subscription created/updated successfully", {
                userId: profileUserId,
                status: subscription.status,
                trialEnd
              });

              // IMPORTANT: Assign admin role if user doesn't have one yet
              // This handles the case where new signups complete payment
              const { data: existingRole } = await supabaseAdmin
                .from("user_roles")
                .select("role")
                .eq("user_id", profileUserId)
                .maybeSingle();

              if (!existingRole) {
                const { error: roleError } = await supabaseAdmin
                  .from("user_roles")
                  .insert({ user_id: profileUserId, role: "admin" });

                if (roleError) {
                  logStep("ERROR assigning admin role", { error: roleError.message });
                } else {
                  logStep("Admin role assigned to new user", { userId: profileUserId });
                }
              } else {
                logStep("User already has role", { userId: profileUserId, role: existingRole.role });
              }
            }
          } else {
            logStep("No user found for checkout", { email: customerEmail, userId });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId || "");
        const isAnnual = isAnnualPrice(priceId || "");

        logStep("Subscription updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          plan
        });

        const updateData: Record<string, unknown> = {
          status: subscription.status,
          stripe_price_id: priceId,
          plan: plan,
          is_annual: isAnnual,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        };

        // Update trial dates if present
        if (subscription.trial_start) {
          updateData.trial_start = new Date(subscription.trial_start * 1000).toISOString();
        }
        if (subscription.trial_end) {
          updateData.trial_end = new Date(subscription.trial_end * 1000).toISOString();
        }

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logStep("ERROR updating subscription", { error: error.message });
        } else {
          logStep("Subscription updated in DB");
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Trial ending in 3 days - trigger reminder email
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Trial will end soon", {
          subscriptionId: subscription.id,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null
        });

        // Find the user for this subscription
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (sub?.user_id) {
          // Check if we already sent a day_3 notification
          const { data: existingNotification } = await supabaseAdmin
            .from("trial_notifications")
            .select("id")
            .eq("user_id", sub.user_id)
            .eq("notification_type", "day_3")
            .maybeSingle();

          if (!existingNotification) {
            // Record that we need to send this notification
            await supabaseAdmin.from("trial_notifications").insert({
              user_id: sub.user_id,
              notification_type: "day_3",
            });
            logStep("Recorded day_3 notification for user", { userId: sub.user_id });
          }
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

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });

        // If this is the first payment after trial, mark as converted
        if (invoice.subscription && invoice.billing_reason === "subscription_cycle") {
          const { data: sub } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id, trial_end")
            .eq("stripe_subscription_id", typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? "")
            .maybeSingle();

          if (sub?.user_id && sub.trial_end) {
            // Record conversion notification
            const { error: notifError } = await supabaseAdmin
              .from("trial_notifications")
              .insert({
                user_id: sub.user_id,
                notification_type: "converted",
              });

            if (!notifError) {
              logStep("Trial converted to paid", { userId: sub.user_id });
            }
          }
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
            .eq("stripe_subscription_id", typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? "");

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
