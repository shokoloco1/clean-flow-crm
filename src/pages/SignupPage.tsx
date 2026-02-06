import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Users, CheckCircle, Chrome } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { signupSchema, validatePassword } from "@/lib/passwordSecurity";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { PlanSelection, type PlanType } from "@/components/signup/PlanSelection";
import { PaymentStep } from "@/components/signup/PaymentStep";
import { PRICE_IDS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type Step = "account" | "plan" | "payment";

const SIGNUP_FLOW_KEY = "pulcrix_signup_in_progress";

const ownerSteps: { id: Step; title: string; description: string }[] = [
  { id: "account", title: "Create Account", description: "Your business details" },
  { id: "plan", title: "Choose Plan", description: "Select your subscription" },
  { id: "payment", title: "Start Trial", description: "14 days free" },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, signUp, loading: authLoading, role } = useAuth();

  // Check if this is an invited staff member
  const isInvitedStaff = searchParams.get("invited") === "true";

  const [currentStep, setCurrentStep] = useState<Step>("account");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Track signup flow with MULTIPLE layers to prevent race conditions:
  // 1. React state (for re-renders)
  // 2. Ref (synchronous access, immune to React batching)
  // 3. sessionStorage (survives page reloads and OAuth redirects)
  const [isSigningUp, setIsSigningUp] = useState(() => {
    try {
      return sessionStorage.getItem(SIGNUP_FLOW_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Ref for synchronous access - critical for avoiding race conditions
  // Use IIFE to immediately evaluate the sessionStorage check
  const isSigningUpRef = useRef<boolean>((() => {
    try {
      return sessionStorage.getItem(SIGNUP_FLOW_KEY) === "true";
    } catch {
      return false;
    }
  })());

  // Initialize ref from sessionStorage on mount
  useEffect(() => {
    try {
      isSigningUpRef.current = sessionStorage.getItem(SIGNUP_FLOW_KEY) === "true";
    } catch {}
  }, []);

  // Persist signup flag to ALL layers (ref + sessionStorage + state)
  const markSignupStarted = () => {
    isSigningUpRef.current = true;
    try { sessionStorage.setItem(SIGNUP_FLOW_KEY, "true"); } catch {}
    setIsSigningUp(true);
  };
  const clearSignupFlag = () => {
    isSigningUpRef.current = false;
    try { sessionStorage.removeItem(SIGNUP_FLOW_KEY); } catch {}
    setIsSigningUp(false);
  };

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

  // Determine which steps to show based on user type
  const steps = isInvitedStaff
    ? [{ id: "account" as Step, title: "Set Up Account", description: "Complete your profile" }]
    : ownerSteps;

  // Check for checkout canceled
  useEffect(() => {
    if (searchParams.get("checkout") === "canceled") {
      toast.error("Checkout was canceled. You can try again when ready.");
    }
  }, [searchParams]);

  // Handle already logged-in users (but NOT users actively in signup flow)
  useEffect(() => {
    if (!authLoading && user && session) {
      // ROBUST GUARD: Check MULTIPLE sources to prevent race conditions
      // React state updates are async/batched, so we check:
      // 1. URL parameter (survives OAuth redirects)
      // 2. Ref (synchronous, immune to React batching)
      // 3. React state (for completeness)
      // 4. sessionStorage directly (ground truth)
      const sessionStorageFlag = (() => {
        try { return sessionStorage.getItem(SIGNUP_FLOW_KEY) === "true"; }
        catch { return false; }
      })();
      const isSignupFromUrl = searchParams.get("flow") === "signup";

      const inSignupFlow = isSignupFromUrl || isSigningUpRef.current || isSigningUp || sessionStorageFlag;

      if (inSignupFlow) {
        // User is actively signing up — advance to next step, DO NOT redirect
        if (currentStep === "account") {
          setCurrentStep("plan");
        }
        return; // CRITICAL: Prevent all redirects during signup
      }

      // For invited staff who just set their password
      if (isInvitedStaff) {
        // They should go to staff dashboard after setting password
        setTimeout(() => {
          navigate("/staff", { replace: true });
        }, 1000);
        return;
      }

      // Only redirect if user navigated to /signup while already logged in
      // (not during an active signup flow)
      if (role) {
        // Check subscription status first — maybe they need to complete payment
        supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.status === "trialing" || data?.status === "active") {
              clearSignupFlag();
              navigate(role === "admin" ? "/admin" : "/staff", { replace: true });
            } else {
              // User has role but no active subscription — let them pick a plan
              if (currentStep === "account") {
                setCurrentStep("plan");
              }
            }
          });
        return;
      }

      // No role yet, check subscription
      supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.status === "trialing" || data?.status === "active") {
            clearSignupFlag();
            navigate("/admin", { replace: true });
          } else if (currentStep === "account") {
            setCurrentStep("plan");
          }
        });
    }
  }, [user, session, authLoading, navigate, currentStep, isInvitedStaff, role, isSigningUp, searchParams]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Clear stale role cache from previous sessions to prevent interference
    try {
      localStorage.removeItem("pulcrix_user_role");
      localStorage.removeItem("pulcrix_user_id");
    } catch {}

    // For invited staff, role should be "staff"
    const userRole = isInvitedStaff ? "staff" : "admin";

    // Validate with zod
    const result = signupSchema.safeParse({
      email,
      password,
      name: fullName,
      role: userRole,
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

    // Mark that we're actively signing up — prevents premature redirect
    if (!isInvitedStaff) {
      markSignupStarted();
    }

    const { error } = await signUp(email, password, fullName, userRole);

    if (error) {
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
        setFormErrors({ email: "Email already registered" });
      } else {
        toast.error(error.message || "Something went wrong. Please try again.");
      }
      clearSignupFlag();
      setIsSubmitting(false);
      return;
    }

    if (isInvitedStaff) {
      toast.success("Account setup complete! Redirecting to dashboard...");
      // Redirect will happen via the useEffect
    } else {
      toast.success("Account created! Now choose your plan.");
      setCurrentStep("plan");
    }
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
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      logger.error("Checkout error:", error);
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

  // Invited Staff - Simplified Flow
  if (isInvitedStaff) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <PulcrixLogo variant="full" size="md" />
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

        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="max-w-md w-full border-border shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Welcome to the Team!</CardTitle>
              <CardDescription>
                You've been invited to join Pulcrix. Set up your account to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 border-primary/20 bg-primary/5">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  Your admin has already set up your profile. Just create a password to access your account.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
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
                  <p className="text-xs text-muted-foreground">
                    Use the same email your admin invited you with
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
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
                      Setting up account...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t border-border py-4">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>Pulcrix - Professional Cleaning Business Management</p>
          </div>
        </footer>
      </div>
    );
  }

  // Owner/Admin - Full Multi-Step Flow
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <PulcrixLogo variant="full" size="md" />
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
                  Start your 14-day free trial of Pulcrix
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

                {/* Social login divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign Up */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={async () => {
                    setIsSubmitting(true);
                    // Clear stale cache and mark signup in progress BEFORE the OAuth redirect
                    try {
                      localStorage.removeItem("pulcrix_user_role");
                      localStorage.removeItem("pulcrix_user_id");
                    } catch {}
                    markSignupStarted();
                    // Use /signup without query params - sessionStorage handles the flow tracking
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: `${window.location.origin}/signup`,
                    });
                    if (error) {
                      toast.error("Failed to sign up with Google");
                      clearSignupFlag();
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <Chrome className="mr-2 h-5 w-5" />
                  Sign up with Google
                </Button>
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
          <p>Pulcrix - Professional Cleaning Business Management</p>
        </div>
      </footer>
    </div>
  );
};

export default SignupPage;
