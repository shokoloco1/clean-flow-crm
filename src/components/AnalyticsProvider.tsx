import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Analytics provider that automatically tracks page views
 * Wrap your app routes with this component
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Track page view on route change
    const trackPageView = async () => {
      try {
        // Skip tracking in development unless explicitly enabled
        if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_ANALYTICS) {
          console.log("[Analytics] Page view:", location.pathname);
          return;
        }

        await supabase.from("analytics_events").insert({
          user_id: user?.id || null,
          event_name: "page_view",
          event_data: {
            path: location.pathname,
            search: location.search,
            hash: location.hash,
          },
          page_path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch {
        // Silently fail - analytics should never break the app
      }
    };

    trackPageView();
  }, [location.pathname, location.search, user?.id]);

  return <>{children}</>;
}
