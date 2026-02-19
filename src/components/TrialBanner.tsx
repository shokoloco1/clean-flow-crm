import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  className?: string;
}

export function TrialBanner({ className }: TrialBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<{
    daysRemaining: number;
    trialEnd: Date | null;
    plan: string | null;
    status: string | null;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchTrialInfo = async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("current_period_end, trial_end, stripe_price_id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return;

      if (data.status === "trialing" && (data.trial_end || data.current_period_end)) {
        const trialEnd = new Date(data.trial_end ?? data.current_period_end);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        setTrialInfo({
          daysRemaining,
          trialEnd,
          plan: data.stripe_price_id ? "subscription" : null,
          status: data.status,
        });
      } else {
        // Not in trial or no trial data
        setTrialInfo(null);
      }
    };

    fetchTrialInfo();

    // Check for dismissal in session storage
    const dismissed = sessionStorage.getItem(`trial-banner-dismissed-${user.id}`);
    if (dismissed) {
      setIsDismissed(true);
    }
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      sessionStorage.setItem(`trial-banner-dismissed-${user.id}`, "true");
    }
    setIsDismissed(true);
  };

  // Don't show if dismissed, not in trial, or no trial info
  if (isDismissed || !trialInfo || trialInfo.daysRemaining <= 0) {
    return null;
  }

  const isUrgent = trialInfo.daysRemaining <= 3;
  const isLastDay = trialInfo.daysRemaining === 1;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-[100] px-4 py-2 transition-colors",
        isUrgent
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
        className,
      )}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isUrgent ? (
            <Clock className="h-4 w-4 animate-pulse" />
          ) : (
            <PulcrixLogo variant="icon" size="sm" />
          )}
          <span className="text-sm font-medium">
            {isLastDay ? (
              <>
                <span className="font-bold">Final day</span> of your free trial!
              </>
            ) : (
              <>
                <span className="font-bold">{trialInfo.daysRemaining} days</span> left in your free
                trial
              </>
            )}
          </span>
          {trialInfo.plan && (
            <span className="hidden text-xs opacity-80 sm:inline">
              ({trialInfo.plan.charAt(0).toUpperCase() + trialInfo.plan.slice(1)} plan)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isUrgent ? "secondary" : "secondary"}
            onClick={() => navigate("/admin/settings")}
            className={cn(
              "h-7 text-xs",
              isUrgent ? "bg-white text-orange-600 hover:bg-white/90" : "",
            )}
          >
            <CreditCard className="mr-1 h-3 w-3" />
            Manage Subscription
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 transition-colors hover:bg-white/20"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact version for sidebars
export function TrialBannerCompact({ className }: TrialBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<{
    daysRemaining: number;
    status: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchTrialInfo = async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("current_period_end, trial_end, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return;

      if (data.status === "trialing" && (data.trial_end || data.current_period_end)) {
        const trialEnd = new Date(data.trial_end ?? data.current_period_end);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        setTrialInfo({ daysRemaining, status: data.status });
      }
    };

    fetchTrialInfo();
  }, [user]);

  if (!trialInfo || trialInfo.daysRemaining <= 0) {
    return null;
  }

  const isUrgent = trialInfo.daysRemaining <= 3;

  return (
    <div
      className={cn(
        "rounded-lg p-3 text-center",
        isUrgent
          ? "border border-amber-500/20 bg-amber-500/10"
          : "border border-primary/20 bg-primary/10",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-center gap-2">
        <Clock className={cn("h-4 w-4", isUrgent ? "text-amber-500" : "text-primary")} />
        <span className={cn("text-sm font-medium", isUrgent ? "text-amber-600" : "text-primary")}>
          {trialInfo.daysRemaining === 1
            ? "Last day of trial"
            : `${trialInfo.daysRemaining} days left`}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate("/admin/settings")}
        className="h-8 w-full text-xs"
      >
        Manage Subscription
      </Button>
    </div>
  );
}
