import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Loader2, Calendar, Users, FileText, Rocket } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";

import { logger } from "@/lib/logger";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  link: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "client",
    title: "Add Your First Client",
    description: "Start by adding a client to manage their cleaning jobs",
    icon: <Users className="h-6 w-6" />,
    action: "Add Client",
    link: "/admin/clients",
  },
  {
    id: "job",
    title: "Schedule a Job",
    description: "Create your first cleaning job and assign it to staff",
    icon: <Calendar className="h-6 w-6" />,
    action: "Create Job",
    link: "/admin/calendar",
  },
  {
    id: "staff",
    title: "Invite Your Team",
    description: "Add staff members to help manage your cleaning business",
    icon: <Users className="h-6 w-6" />,
    action: "Invite Staff",
    link: "/admin/staff",
  },
  {
    id: "invoice",
    title: "Create an Invoice",
    description: "Generate professional invoices for your clients",
    icon: <FileText className="h-6 w-6" />,
    action: "Create Invoice",
    link: "/admin/invoices",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if coming from successful checkout
        const checkoutStatus = searchParams.get("checkout");
        const sessionId = searchParams.get("session_id");

        if (checkoutStatus === "success" && sessionId) {
          toast.success("Welcome to Pulcrix! Your 14-day trial has started.");
        }

        // Fetch subscription status
        const { data, error } = await supabase
          .from("subscriptions")
          .select("status, current_period_end, stripe_price_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          logger.error("Error fetching subscription:", error);
        }

        if (data) {
          setSubscriptionStatus(data.status);
          setPlan(data.stripe_price_id ? "subscription" : null);
          if (data.current_period_end) {
            setTrialEnd(new Date(data.current_period_end));
          }
        }
      } catch (error) {
        logger.error("Error checking subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      checkSubscription();
    }
  }, [user, authLoading, searchParams]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const formatTrialEnd = () => {
    if (!trialEnd) return "";
    return trialEnd.toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysRemaining = () => {
    if (!trialEnd) return 14;
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Setting up your account...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <PulcrixLogo variant="full" size="md" />
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-4 text-3xl font-bold">Welcome to Pulcrix!</h1>
          <p className="mb-6 text-lg text-muted-foreground">
            Your account is ready. You have{" "}
            <span className="font-semibold text-primary">{getDaysRemaining()} days</span> of free
            trial to explore all features.
          </p>

          {/* Trial Info Card */}
          <Card className="mx-auto max-w-md border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">{plan || "Professional"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trial ends</span>
                <span className="font-medium">{formatTrialEnd()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  {subscriptionStatus === "trialing" ? "Trial Active" : "Active"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section */}
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-center text-xl font-semibold">Get Started</h2>
          <p className="mb-8 text-center text-muted-foreground">
            Here's what we recommend to make the most of your Pulcrix trial
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {onboardingSteps.map((step, idx) => (
              <Card
                key={step.id}
                className="group cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => navigate(step.link)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                          {idx + 1}
                        </span>
                        {step.title}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm">{step.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    {step.action}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mx-auto mt-12 max-w-4xl">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
                    <Rocket className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Ready to explore?</h3>
                    <p className="text-sm text-muted-foreground">
                      Jump straight into your dashboard and start managing your business
                    </p>
                  </div>
                </div>
                <Button size="lg" onClick={() => navigate("/admin")} className="group">
                  Open Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">
            Need help getting started?{" "}
            <a href="mailto:support@pulcrix.com" className="text-primary hover:underline">
              Contact our support team
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
