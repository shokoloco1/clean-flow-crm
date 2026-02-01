import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Calendar,
  Users,
  FileText,
  Camera,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { user, session, loading: authLoading } = useAuth();
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
          toast.success("Welcome to CleanFlow! Your 14-day trial has started.");
        }

        // Fetch subscription status
        const { data, error } = await supabase
          .from("subscriptions")
          .select("status, trial_end, plan")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching subscription:", error);
        }

        if (data) {
          setSubscriptionStatus(data.status);
          setPlan(data.plan);
          if (data.trial_end) {
            setTrialEnd(new Date(data.trial_end));
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CleanFlow</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to CleanFlow!</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Your account is ready. You have{" "}
            <span className="font-semibold text-primary">{getDaysRemaining()} days</span> of
            free trial to explore all features.
          </p>

          {/* Trial Info Card */}
          <Card className="bg-primary/5 border-primary/20 max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">{plan || "Professional"}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Trial ends</span>
                <span className="font-medium">{formatTrialEnd()}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  {subscriptionStatus === "trialing" ? "Trial Active" : "Active"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-6 text-center">Get Started</h2>
          <p className="text-center text-muted-foreground mb-8">
            Here's what we recommend to make the most of your CleanFlow trial
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {onboardingSteps.map((step, idx) => (
              <Card
                key={step.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(step.link)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {step.title}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
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
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                    <Rocket className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Ready to explore?</h3>
                    <p className="text-muted-foreground text-sm">
                      Jump straight into your dashboard and start managing your business
                    </p>
                  </div>
                </div>
                <Button size="lg" onClick={() => navigate("/admin")} className="group">
                  Open Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Need help getting started?{" "}
            <a href="mailto:support@cleanflow.com.au" className="text-primary hover:underline">
              Contact our support team
            </a>
            {" "}or check out our{" "}
            <Link to="/help" className="text-primary hover:underline">
              help documentation
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
