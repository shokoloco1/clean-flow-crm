import { Check, Zap, Building2, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type PlanType = "starter" | "professional" | "business";

interface Plan {
  id: PlanType;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  staffLimit: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for solo cleaners",
    monthlyPrice: 49,
    annualPrice: 490,
    staffLimit: "1-2 staff",
    icon: <Zap className="h-6 w-6" />,
    features: [
      "Up to 50 jobs/month",
      "2 staff members",
      "Basic scheduling",
      "Invoice generation",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing cleaning businesses",
    monthlyPrice: 89,
    annualPrice: 890,
    staffLimit: "3-10 staff",
    icon: <Rocket className="h-6 w-6" />,
    popular: true,
    features: [
      "Unlimited jobs",
      "10 staff members",
      "Advanced scheduling",
      "Invoice & quotes",
      "Before/after photos",
      "Client portal",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "For established operations",
    monthlyPrice: 149,
    annualPrice: 1490,
    staffLimit: "Unlimited staff",
    icon: <Building2 className="h-6 w-6" />,
    features: [
      "Everything in Professional",
      "Unlimited staff",
      "Multi-location support",
      "Advanced analytics",
      "Custom branding",
      "API access",
      "Dedicated support",
    ],
  },
];

interface PlanSelectionProps {
  selectedPlan: PlanType | null;
  onSelectPlan: (plan: PlanType, isAnnual: boolean) => void;
  isAnnual: boolean;
  onToggleAnnual: (isAnnual: boolean) => void;
}

export function PlanSelection({
  selectedPlan,
  onSelectPlan,
  isAnnual,
  onToggleAnnual,
}: PlanSelectionProps) {
  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center">
        <p className="text-sm font-medium text-primary">
          Start your 14-day free trial - no charge until trial ends
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cancel anytime before your trial ends and you won't be charged
        </p>
      </div>

      {/* Annual Toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label
          htmlFor="annual-toggle"
          className={cn(
            "cursor-pointer text-sm font-medium",
            !isAnnual ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Monthly
        </Label>
        <Switch id="annual-toggle" checked={isAnnual} onCheckedChange={onToggleAnnual} />
        <Label
          htmlFor="annual-toggle"
          className={cn(
            "flex cursor-pointer items-center gap-2 text-sm font-medium",
            isAnnual ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Annual
          <Badge variant="secondary" className="text-xs">
            Save 2 months
          </Badge>
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const monthlyEquivalent = isAnnual
            ? Math.round(plan.annualPrice / 12)
            : plan.monthlyPrice;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative cursor-pointer transition-all hover:shadow-lg",
                isSelected && "shadow-lg ring-2 ring-primary",
                plan.popular && "border-primary",
              )}
              onClick={() => onSelectPlan(plan.id, isAnnual)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {plan.icon}
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <CardTitle className="mt-3 text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${monthlyEquivalent}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground">${price} billed annually</p>
                  )}
                </div>

                {/* Staff Limit Badge */}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{plan.staffLimit}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Select Button */}
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlan(plan.id, isAnnual);
                  }}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trial Info */}
      <p className="text-center text-sm text-muted-foreground">
        Your card will be charged after the 14-day trial period ends. Cancel anytime from your
        account settings.
      </p>
    </div>
  );
}
