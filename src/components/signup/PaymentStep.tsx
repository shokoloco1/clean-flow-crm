import { useState } from "react";
import { CreditCard, Shield, Lock, Check, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  starter: { name: "Starter", monthlyPrice: 89, annualPrice: 890 },
  professional: { name: "Professional", monthlyPrice: 149, annualPrice: 1490 },
  business: { name: "Business", monthlyPrice: 249, annualPrice: 2490 },
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
    <div className="space-y-6 max-w-md mx-auto">
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
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
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
        className="w-full h-14 text-lg group"
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
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>

      {/* What happens next */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <p className="font-medium text-sm">What happens next:</p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              1
            </span>
            <span>Enter your payment details securely with Stripe</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              2
            </span>
            <span>Your 14-day trial begins immediately</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              3
            </span>
            <span>Cancel anytime before {formattedTrialEnd} to avoid charges</span>
          </li>
        </ol>
      </div>

      {/* Terms */}
      <p className="text-xs text-center text-muted-foreground">
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
