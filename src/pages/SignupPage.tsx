import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { signupSchema, validatePassword } from "@/lib/passwordSecurity";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { PlanSelection, type PlanType } from "@/components/signup/PlanSelection";
import { PaymentStep } from "@/components/signup/PaymentStep";
import { PRICE_IDS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

type Step = "account" | "plan" | "payment";

const steps: { id: Step; title: string; description: string }[] = [
  { id: "account", title: "Create Account", description: "Your business details" },
  { id: "plan", title: "Choose Plan", description: "Select your subscription" },
  { id: "payment", title: "Start Trial", description: "14 days free" },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, signUp, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>("account");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Account form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Plan selection state - check URL params for pre-selected plan
  const urlPlan = searchParams.get("plan") as PlanType | null;
  const urlBilling = searchParams.get("billing");
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(
    urlPlan && ["starter", "professional", "business"].includes(urlPlan) ? urlPlan : null
  );
  const [isAnnual, setIsAnnual] = useState(urlBilling === "annual");

  // Check for checkout canceled
  useEffect(() => {
    if (searchParams.get("checkout") === "canceled") {
      toast.error("Checkout was canceled. You can try again when ready.");
    }
  }, [searchParams]);

  // If user is already logged in, redirect or advance to plan step
  useEffect(() => {
    if (!authLoading && user && session) {
      // User has account, check if they have a subscription
      supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.status === "trialing" || data?.status === "active") {
            // Already has subscription, redirect to admin
            navigate("/admin", { replace: true });
          } else if (currentStep === "account") {
            // Advance to plan selection
            setCurrentStep("plan");
          }
        });
    }
  }, [user, session, authLoading, navigate, currentStep]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate with zod
    const result = signupSchema.safeParse({
      email,
      password,
      name: fullName,
      role: "admin", // New signups are always admins
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setFormErrors(errors);
      toast.error("Please check the highlighted fields");
      return;
    }

    setIsSubmitting(true);

    const { error } = await signUp(email, password, fullName, "admin");

    if (error) {
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
        setFormErrors({ email: "Email already registered" });
      } else {
        toast.error(error.message || "Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
      return;
    }

    toast.success("Account created! Now choose your plan.");
    setCurrentStep("plan");
    setIsSubmitting(false);
  };

  const handlePlanSelect = (plan: PlanType, annual: boolean) => {
    setSelectedPlan(plan);
    setIsAnnual(annual);
  };

  const handleContinueToPayment = () => {
    if (!selectedPlan) {
      toast.error("Please select a plan to continue");
      return;
    }
    setCurrentStep("payment");
  };

  const handleStartCheckout = async () => {
    if (!selectedPlan || !session?.access_token) {
      toast.error("Please complete all steps first");
      return;
    }

    setIsSubmitting(true);

    try {
      const priceId = isAnnual
        ? PRICE_IDS[selectedPlan].annual
        : PRICE_IDS[selectedPlan].monthly;

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, isNewSignup: true },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (currentStep === "plan") {
      setCurrentStep("account");
    } else if (currentStep === "payment") {
      setCurrentStep("plan");
    }
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CleanFlow</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Already have an account?
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors",
                      idx < currentStepIndex
                        ? "bg-primary text-primary-foreground"
                        : idx === currentStepIndex
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx < currentStepIndex ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        idx <= currentStepIndex
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2 mt-[-20px]",
                      idx < currentStepIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Account */}
          {currentStep === "account" && (
            <Card className="max-w-md mx-auto border-border shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create Your Account</CardTitle>
                <CardDescription>
                  Start your 14-day free trial of CleanFlow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Smith"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setFormErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      className={formErrors.name ? "border-destructive" : ""}
                      required
                    />
                    {formErrors.name && (
                      <p className="text-xs text-destructive">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name (optional)</Label>
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="ABC Cleaning Services"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFormErrors((prev) => ({ ...prev, email: "" }));
                      }}
                      className={formErrors.email ? "border-destructive" : ""}
                      required
                    />
                    {formErrors.email && (
                      <p className="text-xs text-destructive">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFormErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        className={
                          formErrors.password ? "border-destructive pr-10" : "pr-10"
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={password} />
                    {formErrors.password && (
                      <p className="text-xs text-destructive">{formErrors.password}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base group"
                    disabled={
                      isSubmitting || validatePassword(password).strength === "weak"
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Plan Selection */}
          {currentStep === "plan" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Choose Your Plan</h2>
                <p className="text-muted-foreground mt-1">
                  All plans include a 14-day free trial
                </p>
              </div>

              <PlanSelection
                selectedPlan={selectedPlan}
                onSelectPlan={handlePlanSelect}
                isAnnual={isAnnual}
                onToggleAnnual={setIsAnnual}
              />

              <div className="flex items-center justify-between max-w-md mx-auto pt-4">
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleContinueToPayment}
                  disabled={!selectedPlan}
                  className="group"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === "payment" && selectedPlan && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Start Your Free Trial</h2>
                <p className="text-muted-foreground mt-1">
                  Add payment details to begin your 14-day trial
                </p>
              </div>

              <PaymentStep
                selectedPlan={selectedPlan}
                isAnnual={isAnnual}
                userEmail={email || user?.email || ""}
                userName={fullName || user?.user_metadata?.full_name || ""}
                onStartCheckout={handleStartCheckout}
                isLoading={isSubmitting}
              />

              <div className="flex justify-center pt-4">
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to plans
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CleanFlow - Professional Cleaning Business Management</p>
        </div>
      </footer>
    </div>
  );
};

export default SignupPage;
