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
    // Track page view on route change (stubbed - analytics_events table not yet created)
    const trackPageView = async () => {
      // Skip tracking - table doesn't exist yet
      // Log to console for development/debugging only
      if (import.meta.env.DEV || !import.meta.env.VITE_ENABLE_ANALYTICS) {
        console.log("[Analytics] Page view:", location.pathname);
      }
      // TODO: Implement database tracking when analytics_events table is created
    };

    trackPageView();
  }, [location.pathname, location.search, user?.id]);

  return <>{children}</>;
}
