import { CreditCard, Shield, Lock, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanType } from "./PlanSelection";

interface PaymentStepProps {
  selectedPlan: PlanType;
  isAnnual: boolean;
  userEmail: string;
  userName: string;
  onStartCheckout: () => Promise<void>;
  isLoading: boolean;
}

const planDetails: Record<PlanType, { name: string; monthlyPrice: number; annualPrice: number }> = {
  starter: { name: "Starter", monthlyPrice: 49, annualPrice: 490 },
  professional: { name: "Professional", monthlyPrice: 89, annualPrice: 890 },
  business: { name: "Business", monthlyPrice: 149, annualPrice: 1490 },
};

export function PaymentStep({
  selectedPlan,
  isAnnual,
  userEmail,
  userName,
  onStartCheckout,
  isLoading,
}: PaymentStepProps) {
  const plan = planDetails[selectedPlan];
  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const monthlyEquivalent = isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
  const billingPeriod = isAnnual ? "year" : "month";

  // Calculate trial end date
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14);
  const formattedTrialEnd = trialEndDate.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Details */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{plan.name} Plan</p>
              <p className="text-sm text-muted-foreground">
                {isAnnual ? "Annual billing" : "Monthly billing"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">${monthlyEquivalent}/mo</p>
              {isAnnual && (
                <p className="text-xs text-muted-foreground">
                  ${price}/{billingPeriod}
                </p>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Trial Info */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                14-Day Free Trial
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your trial starts today. You won't be charged until{" "}
              <span className="font-medium text-foreground">{formattedTrialEnd}</span>.
            </p>
          </div>

          <hr className="border-border" />

          {/* Due Today */}
          <div className="flex items-center justify-between">
            <p className="font-medium">Due today</p>
            <p className="text-xl font-bold text-primary">$0.00</p>
          </div>

          <p className="text-xs text-muted-foreground">
            After your trial, you'll be charged ${price}/{billingPeriod}. Cancel anytime.
          </p>
        </CardContent>
      </Card>

      {/* User Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account</span>
              <span className="font-medium">{userName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{userEmail}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-1 text-xs">
          <Lock className="h-3 w-3" />
          <span>SSL Secured</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Shield className="h-3 w-3" />
          <span>PCI Compliant</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <CreditCard className="h-3 w-3" />
          <span>Stripe</span>
        </div>
      </div>

      {/* Start Trial Button */}
      <Button
        size="lg"
        className="group h-14 w-full text-lg"
        onClick={onStartCheckout}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Redirecting to payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>

      {/* What happens next */}
      <div className="space-y-3 rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium">What happens next:</p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              1
            </span>
            <span>Enter your payment details securely with Stripe</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              2
            </span>
            <span>Your 14-day trial begins immediately</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              3
            </span>
            <span>Cancel anytime before {formattedTrialEnd} to avoid charges</span>
          </li>
        </ol>
      </div>

      {/* Terms */}
      <p className="text-center text-xs text-muted-foreground">
        By starting your trial, you agree to our{" "}
        <a href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
