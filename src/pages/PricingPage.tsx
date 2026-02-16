import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Check, Building2, Users, CreditCard, Shield, Loader2, Rocket } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSubscription, PRICE_IDS } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan: currentPlan, createCheckout } = useSubscription();

  // Show message if checkout was canceled
  if (searchParams.get("checkout") === "canceled") {
    toast.info("Checkout cancelled", { id: "checkout-canceled" });
  }

  const handleSubscribe = async (planKey: keyof typeof PRICE_IDS) => {
    if (!user) {
      // Redirect to signup with plan info so checkout continues after registration
      navigate(`/signup?plan=${planKey}&billing=${isAnnual ? "annual" : "monthly"}`);
      return;
    }

    setLoadingPlan(planKey);
    try {
      await createCheckout(planKey, isAnnual);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error starting checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: "Starter",
      badge: "For Small Teams",
      badgeVariant: "secondary" as const,
      monthlyPrice: 89,
      annualPrice: 890,
      annualMonthly: 74,
      description: "Perfect for cleaning businesses just getting started",
      features: [
        "1-3 employees",
        "Unlimited clients",
        "Job scheduling & dispatch",
        "Mobile app (iOS & Android)",
        "Invoicing & payments",
        "Client portal",
        "GST & ABN integration",
        "Australian localisation",
        "Email support",
      ],
      cta: "Start Free Trial",
      ctaVariant: "outline" as const,
      highlighted: false,
      icon: Users,
      planKey: "starter" as const,
    },
    {
      name: "Professional",
      badge: "Most Popular",
      badgeVariant: "default" as const,
      monthlyPrice: 149,
      annualPrice: 1490,
      annualMonthly: 124,
      description: "For growing cleaning businesses",
      features: [
        "4-10 employees",
        "All Starter features",
        "Advanced reporting & analytics",
        "Recurring job automation",
        "SMS notifications",
        "Xero integration",
        "Team performance tracking",
        "Priority email support",
      ],
      cta: "Start Free Trial",
      ctaVariant: "default" as const,
      highlighted: true,
      icon: Rocket,
      planKey: "professional" as const,
    },
    {
      name: "Business",
      badge: "For Larger Teams",
      badgeVariant: "secondary" as const,
      monthlyPrice: 249,
      annualPrice: 2490,
      annualMonthly: 207,
      description: "For established cleaning operations",
      features: [
        "11-25 employees",
        "All Professional features",
        "API access",
        "Custom integrations",
        "White-label client portal",
        "Dedicated account manager",
        "Phone support",
        "Custom onboarding",
      ],
      cta: "Contact Sales",
      ctaVariant: "outline" as const,
      highlighted: false,
      icon: Building2,
      planKey: "business" as const,
    },
  ];

  const faqs = [
    {
      question: "How does the 14-day free trial work?",
      answer:
        "Start using Pulcrix immediately with full access to all features in your selected plan. No credit card required. After 14 days, choose to subscribe or your account will be paused until you decide to continue.",
    },
    {
      question: "Can I change plans later?",
      answer:
        "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, your new rate takes effect at the next billing cycle.",
    },
    {
      question: "What happens if I exceed my employee limit?",
      answer:
        "We'll notify you when you're approaching your limit. You can easily upgrade to the next plan to add more team members. We won't automatically charge you without your consent.",
    },
    {
      question: "Is there a contract or commitment?",
      answer:
        "No long-term contracts! Monthly plans can be cancelled anytime. Annual plans are billed upfront for the year but include a 17% discount.",
    },
    {
      question: "How does billing work in Australia?",
      answer:
        "All prices are in AUD with GST included. We accept all major credit cards through our secure payment processor. You'll receive a tax invoice for every payment.",
    },
    {
      question: "Can I get a refund?",
      answer:
        "We offer a 30-day money-back guarantee for annual plans. Monthly plans can be cancelled anytime but are not refundable for the current billing period.",
    },
    {
      question: "Do you offer discounts for multiple businesses?",
      answer:
        "Yes! If you manage multiple cleaning businesses or franchises, contact our sales team for custom enterprise pricing.",
    },
    {
      question: "What support is included?",
      answer:
        "All plans include email support. Professional plans get priority response times. Business plans include phone support and a dedicated account manager.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <PulcrixLogo variant="full" size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center md:py-24">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Simple, Transparent Pricing for{" "}
            <span className="text-primary">Australian Cleaning Businesses</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            No per-user fees. Pay one flat rate and add unlimited team members within your plan.
          </p>

          {/* Billing Toggle */}
          <div className="mb-12 flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span
              className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Annual
            </span>
            {isAnnual && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Save 17%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted ? "z-10 scale-105 border-primary shadow-lg" : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1 text-primary-foreground">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pt-8 text-center">
                  <div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-3">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                  {!plan.highlighted && (
                    <Badge variant={plan.badgeVariant} className="mx-auto mb-2 w-fit">
                      {plan.badge}
                    </Badge>
                  )}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6 text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        ${isAnnual ? plan.annualMonthly : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {isAnnual && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        ${plan.annualPrice}/year billed annually
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  {currentPlan === plan.planKey ? (
                    <Badge className="w-full justify-center py-2" variant="secondary">
                      Your Current Plan
                    </Badge>
                  ) : (
                    <Button
                      variant={plan.ctaVariant}
                      className={`w-full ${plan.highlighted ? "bg-primary hover:bg-primary/90" : ""}`}
                      onClick={() => handleSubscribe(plan.planKey)}
                      disabled={loadingPlan !== null}
                    >
                      {loadingPlan === plan.planKey ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {plan.cta}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Elements */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-6 text-lg font-medium">
            14-day free trial • No credit card required • Cancel anytime
          </p>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm">Visa, Mastercard, Amex</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">All prices in AUD • GST included</p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Frequently Asked Questions</h2>
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to streamline your cleaning business?</h2>
          <p className="mb-8 text-lg opacity-90">
            Join hundreds of Australian cleaning businesses using Pulcrix
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
