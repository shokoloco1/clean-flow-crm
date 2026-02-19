import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { CONFIG } from "@/lib/config";

export interface SubscriptionState {
  subscribed: boolean;
  plan: "starter" | "professional" | "business" | null;
  isAnnual: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
  error: string | null;
}

// Stripe price IDs - Monthly
export const PRICE_IDS = {
  starter: {
    monthly: "price_1SsrkkPatNmvLMdZMIy3yxsG",
    annual: "price_1SsrlTPatNmvLMdZ6E12DUTK",
  },
  professional: {
    monthly: "price_1SsrlGPatNmvLMdZ5bMSzXje",
    annual: "price_1SsrlUPatNmvLMdZZsHJ4Eax",
  },
  business: {
    monthly: "price_1SsrlPPatNmvLMdZa5u7hME2",
    annual: "price_1SsrlWPatNmvLMdZQFvR99qN",
  },
} as const;

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: null,
    isAnnual: false,
    subscriptionEnd: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setState({
        subscribed: data.subscribed,
        plan: data.plan,
        isAnnual: data.is_annual || false,
        subscriptionEnd: data.subscription_end,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Error checking subscription",
      }));
    }
  }, [session?.access_token]);

  const createCheckout = async (plan: keyof typeof PRICE_IDS, isAnnual: boolean = false) => {
    if (!session?.access_token) {
      throw new Error("Must be logged in to subscribe");
    }

    const priceId = isAnnual ? PRICE_IDS[plan].annual : PRICE_IDS[plan].monthly;

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;

    // Use same-tab redirect for maximum browser compatibility (Brave, etc.)
    if (data?.url) {
      window.location.href = data.url;
    }

    return data;
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error("Must be logged in to manage subscription");
    }

    const { data, error } = await supabase.functions.invoke("customer-portal", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;

    // Use same-tab redirect for maximum browser compatibility (Brave, etc.)
    if (data?.url) {
      window.location.href = data.url;
    }

    return data;
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState({
        subscribed: false,
        plan: null,
        isAnnual: false,
        subscriptionEnd: null,
        loading: false,
        error: null,
      });
    }
  }, [user, checkSubscription]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, CONFIG.refresh.subscription);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
