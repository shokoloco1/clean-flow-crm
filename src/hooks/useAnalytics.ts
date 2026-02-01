import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Define event types for type safety
export type AnalyticsEvent =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "logout"
  | "trial_started"
  | "subscription_started"
  | "job_created"
  | "job_completed"
  | "invoice_created"
  | "invoice_sent"
  | "client_created"
  | "staff_invited"
  | "onboarding_completed"
  | "feature_used";

interface TrackEventOptions {
  event: AnalyticsEvent;
  data?: Record<string, unknown>;
}

/**
 * Analytics hook for tracking user behavior and business metrics
 * Events are stored in Supabase for analysis
 */
export function useAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  const lastPageRef = useRef<string>("");

  // Track a custom event
  const trackEvent = useCallback(
    async ({ event, data = {} }: TrackEventOptions) => {
      try {
        // Don't track in development unless explicitly enabled
        if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_ANALYTICS) {
          console.log("[Analytics]", event, data);
          return;
        }

        await supabase.from("analytics_events").insert({
          user_id: user?.id || null,
          event_name: event,
          event_data: data,
          page_path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        // Silently fail - analytics should never break the app
        console.warn("[Analytics] Failed to track event:", error);
      }
    },
    [user?.id, location.pathname]
  );

  // Automatically track page views
  useEffect(() => {
    // Only track if page changed
    if (location.pathname !== lastPageRef.current) {
      lastPageRef.current = location.pathname;

      trackEvent({
        event: "page_view",
        data: {
          path: location.pathname,
          search: location.search,
        },
      });
    }
  }, [location.pathname, location.search, trackEvent]);

  return { trackEvent };
}

/**
 * Pre-built tracking functions for common events
 */
export function createAnalyticsHelpers(trackEvent: (options: TrackEventOptions) => void) {
  return {
    trackSignupStarted: () => trackEvent({ event: "signup_started" }),
    trackSignupCompleted: () => trackEvent({ event: "signup_completed" }),
    trackLogin: () => trackEvent({ event: "login" }),
    trackLogout: () => trackEvent({ event: "logout" }),
    trackTrialStarted: () => trackEvent({ event: "trial_started" }),
    trackSubscriptionStarted: (plan: string) =>
      trackEvent({ event: "subscription_started", data: { plan } }),
    trackJobCreated: (jobId: string) =>
      trackEvent({ event: "job_created", data: { jobId } }),
    trackJobCompleted: (jobId: string) =>
      trackEvent({ event: "job_completed", data: { jobId } }),
    trackInvoiceCreated: (invoiceId: string) =>
      trackEvent({ event: "invoice_created", data: { invoiceId } }),
    trackInvoiceSent: (invoiceId: string) =>
      trackEvent({ event: "invoice_sent", data: { invoiceId } }),
    trackClientCreated: () => trackEvent({ event: "client_created" }),
    trackStaffInvited: () => trackEvent({ event: "staff_invited" }),
    trackOnboardingCompleted: () => trackEvent({ event: "onboarding_completed" }),
    trackFeatureUsed: (feature: string) =>
      trackEvent({ event: "feature_used", data: { feature } }),
  };
}
