import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Rocket, ArrowRight, Loader2 } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  trialDays?: number; // Default 14 days
}

export function SubscriptionGate({ children, trialDays = 14 }: SubscriptionGateProps) {
  // ============================================
  // DEMO MODE: Free access for testing and demos
  // Set to false when ready for production with paid subscriptions
  // ============================================
  const DEMO_MODE = true;

  if (DEMO_MODE) {
    // Free access - no subscription required
    return <>{children}</>;
  }

  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed, loading, plan } = useSubscription();

  // Calculate trial status
  const getTrialStatus = () => {
    if (!user?.created_at) return { isInTrial: false, daysRemaining: 0, expired: true };

    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffTime = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, trialDays - diffDays);

    return {
      isInTrial: daysRemaining > 0,
      daysRemaining,
      expired: daysRemaining <= 0
    };
  };

  const trialStatus = getTrialStatus();

  // Show loading while checking subscription
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
  if (trialStatus.isInTrial) {
    return (
      <div className="relative">
        {/* Trial Banner */}
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-2 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} left in your free trial
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/pricing")}
              className="h-7 text-xs"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
        {/* Add padding to account for banner */}
        <div className="pt-10">
          {children}
        </div>
      </div>
    );
  }

  // Trial expired and no subscription - show upgrade screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">CleanFlow</h1>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="text-center pb-2">
            <Badge variant="secondary" className="w-fit mx-auto mb-4">
              <Clock className="h-3 w-3 mr-1" />
              Trial Ended
            </Badge>
            <CardTitle className="text-xl">Your Free Trial Has Expired</CardTitle>
            <CardDescription>
              Upgrade to continue managing your cleaning business with CleanFlow
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Benefits reminder */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm text-foreground">With CleanFlow you get:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
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
            <Button
              className="w-full h-12 text-base group"
              onClick={() => navigate("/pricing")}
            >
              <Rocket className="mr-2 h-5 w-5" />
              View Plans & Upgrade
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>

            {/* Pricing hint */}
            <p className="text-center text-sm text-muted-foreground">
              Plans start at <span className="font-medium text-foreground">$89/month</span>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Need help? Contact us at support@cleanflow.com.au
        </p>
      </div>
    </div>
  );
}
