import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Rocket, ArrowRight, Loader2 } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { TrialBanner } from "./TrialBanner";
import { logger } from "@/lib/logger";

interface SubscriptionGateProps {
  children: React.ReactNode;
  trialDays?: number; // Default 14 days (legacy, now uses DB)
}

interface TrialInfo {
  isInTrial: boolean;
  daysRemaining: number;
  expired: boolean;
  trialEnd: Date | null;
  plan: string | null;
}

export function SubscriptionGate({ children, trialDays = 14 }: SubscriptionGateProps) {
  // ============================================
  // DEMO MODE: Free access for testing and demos
  // Set to false when ready for production with paid subscriptions
  // ============================================
  const DEMO_MODE = true;

  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Legacy trial calculation based on account creation date
  const getLegacyTrialStatus = useCallback((): TrialInfo => {
    if (!user?.created_at) {
      return { isInTrial: false, daysRemaining: 0, expired: true, trialEnd: null, plan: null };
    }

    const createdAt = new Date(user.created_at);
    const trialEnd = new Date(createdAt);
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      isInTrial: daysRemaining > 0,
      daysRemaining,
      expired: daysRemaining <= 0,
      trialEnd,
      plan: null,
    };
  }, [user?.created_at, trialDays]);

  // Fetch trial info from subscriptions table
  useEffect(() => {
    const fetchTrialInfo = async () => {
      if (DEMO_MODE) {
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("status, current_period_end, stripe_price_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          logger.error("Error fetching trial info:", error);
          // Fall back to legacy behavior
          setTrialInfo(getLegacyTrialStatus());
        } else if (data?.status === "trialing" && data.current_period_end) {
          const trialEnd = new Date(data.current_period_end);
          const now = new Date();
          const diffTime = trialEnd.getTime() - now.getTime();
          const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

          setTrialInfo({
            isInTrial: daysRemaining > 0,
            daysRemaining,
            expired: daysRemaining <= 0,
            trialEnd,
            plan: data.stripe_price_id ? "subscription" : null,
          });
        } else if (data?.status === "active") {
          // Active subscription, not in trial
          setTrialInfo({
            isInTrial: false,
            daysRemaining: 0,
            expired: false,
            trialEnd: null,
            plan: data.stripe_price_id ? "subscription" : null,
          });
        } else {
          // No subscription record, fall back to legacy behavior
          setTrialInfo(getLegacyTrialStatus());
        }
      } catch (err) {
        logger.error("Error fetching trial info:", err);
        setTrialInfo(getLegacyTrialStatus());
      } finally {
        setLoading(false);
      }
    };

    if (!subscriptionLoading) {
      fetchTrialInfo();
    }
  }, [user, subscriptionLoading, DEMO_MODE, getLegacyTrialStatus]);

  // DEMO MODE - bypass all checks
  if (DEMO_MODE) {
    return <>{children}</>;
  }

  // Show loading while checking subscription
  if (loading || subscriptionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Checking subscription...</span>
        </div>
      </div>
    );
  }

  // User has active subscription - allow access
  if (subscribed) {
    return <>{children}</>;
  }

  // User is in trial period - allow access with banner
  if (trialInfo?.isInTrial) {
    return (
      <div className="relative">
        <TrialBanner />
        {/* Add padding to account for banner */}
        <div className="pt-10">{children}</div>
      </div>
    );
  }

  // Trial expired and no subscription - show upgrade screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center">
            <PulcrixLogo size="lg" />
          </div>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="pb-2 text-center">
            <Badge variant="secondary" className="mx-auto mb-4 w-fit">
              <Clock className="mr-1 h-3 w-3" />
              Trial Ended
            </Badge>
            <CardTitle className="text-xl">Your Free Trial Has Expired</CardTitle>
            <CardDescription>
              Upgrade to continue managing your cleaning business with Pulcrix
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Benefits reminder */}
            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium text-foreground">With Pulcrix you get:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span> Unlimited job scheduling
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span> Staff management & tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span> Professional invoicing with GST
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span> Before/after photo evidence
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span> Client portal access
                </li>
              </ul>
            </div>

            {/* CTA */}
            <Button className="group h-12 w-full text-base" onClick={() => navigate("/pricing")}>
              <Rocket className="mr-2 h-5 w-5" />
              View Plans & Upgrade
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>

            {/* Pricing hint */}
            <p className="text-center text-sm text-muted-foreground">
              Plans start at <span className="font-medium text-foreground">$89/month</span>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Need help? Contact us at support@pulcrix.com
        </p>
      </div>
    </div>
  );
}
