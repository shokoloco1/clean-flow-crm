import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Eye, EyeOff, AlertTriangle, Lock, CheckCircle, ArrowRight } from "lucide-react";

import { loginSchema } from "@/lib/passwordSecurity";
import { PulcrixLogo } from "@/components/PulcrixLogo";

export default function Auth() {
  const navigate = useNavigate();
  const { user, session, role, loading, signIn, signOut, refreshRole } = useAuth();
  const { rateLimitState, checkRateLimit, recordAttempt } = useRateLimit();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapTried, setBootstrapTried] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Clear any in-progress signup flag — user navigated to login instead
  useEffect(() => {
    try {
      sessionStorage.removeItem("pulcrix_signup_in_progress");
    } catch {
      /* sessionStorage may be unavailable */
    }
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast.error("Please enter your email");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast.error(error.message || "Failed to send email");
    } else {
      setResetSent(true);
      toast.success("Email sent. Check your inbox.");
    }

    setIsSubmitting(false);
  };

  useEffect(() => {
    // If we have a user and role, redirect immediately
    if (!loading && user && role) {
      navigate(role === "admin" ? "/admin" : "/staff", { replace: true });
    }
  }, [user, role, loading, navigate]);

  // Separate effect for bootstrap - only runs when user exists but has no role
  useEffect(() => {
    if (!loading && user && !role && session && !bootstrapTried) {
      setBootstrapTried(true);
      // Only try bootstrap after a brief delay to allow role fetch to complete
      const timer = setTimeout(async () => {
        // Re-check if role was fetched
        if (!role) {
          try {
            await supabase.functions.invoke("bootstrap-role");
            await refreshRole();
          } catch {
            // User might already have a role or bootstrap failed
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, role, loading, session, bootstrapTried, refreshRole]);

  const handleBootstrapAdmin = async () => {
    setIsBootstrapping(true);
    const { error } = await supabase.functions.invoke("bootstrap-role");
    if (error) {
      toast.error("Your account has no role assigned. Please ask an admin to assign one.");
    } else {
      await refreshRole();
      toast.success("Admin role assigned. Redirecting...");
    }
    setIsBootstrapping(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Check rate limiting first
    const isBlocked = await checkRateLimit(loginEmail);
    if (isBlocked) {
      toast.error(
        `Too many failed attempts. Please try again in ${rateLimitState.remainingMinutes} minutes.`,
      );
      return;
    }

    // Validate with zod
    const result = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[`login_${field}`] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      await recordAttempt(loginEmail, false);
      toast.error("Invalid credentials. Please check your email and password.");
    } else {
      await recordAttempt(loginEmail, true);
      toast.success("Welcome back!");
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // Logged in but no role assigned
  if (user && !role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center">
              <PulcrixLogo variant="icon" size="lg" className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Pulcrix</h1>
            <p className="text-muted-foreground">Your account doesn't have a role assigned</p>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle>Access pending</CardTitle>
              <CardDescription>
                To access the system, an admin must assign you a role (admin or staff).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleBootstrapAdmin} disabled={isBootstrapping}>
                {isBootstrapping ? "Configuring..." : "Configure as Admin (first time only)"}
              </Button>
              <Button variant="outline" className="w-full" onClick={signOut}>
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-area-inset-top safe-area-inset-bottom flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Logo and branding */}
        <div className="space-y-2 text-center sm:space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center transition-opacity hover:opacity-80"
          >
            <PulcrixLogo variant="icon" size="lg" className="text-primary" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pulcrix</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Clean Living. Pure Solutions.
          </p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="px-4 pb-2 text-center sm:px-6">
            <CardTitle className="text-lg sm:text-xl">👋 Welcome Back</CardTitle>
            <CardDescription className="text-sm">Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Password Reset Form */}
            {showResetForm ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="font-semibold text-foreground">Email sent!</h3>
                    <p className="text-sm text-muted-foreground">
                      Check your inbox at <strong>{resetEmail}</strong> and follow the instructions.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowResetForm(false);
                        setResetSent(false);
                        setResetEmail("");
                      }}
                    >
                      Back to sign in
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="mb-4 text-center">
                      <h3 className="font-semibold text-foreground">Forgot your password?</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter your email and we'll send you a reset link.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send reset link"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowResetForm(false)}
                    >
                      Back to sign in
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <>
                {/* Rate limit warning */}
                {rateLimitState.isBlocked && (
                  <Alert variant="destructive" className="mb-4">
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      Account temporarily blocked. Please try again in{" "}
                      {rateLimitState.remainingMinutes} minutes.
                    </AlertDescription>
                  </Alert>
                )}

                {rateLimitState.failedAttempts > 0 && !rateLimitState.isBlocked && (
                  <Alert variant="default" className="mb-4 border-warning/50 bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      {5 - rateLimitState.failedAttempts} attempts remaining before lockout.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setFormErrors((prev) => ({ ...prev, login_email: "" }));
                      }}
                      className={`h-11 text-base sm:h-10 sm:text-sm ${formErrors.login_email ? "border-destructive" : ""}`}
                      disabled={rateLimitState.isBlocked}
                      required
                      autoComplete="email"
                    />
                    {formErrors.login_email && (
                      <p className="text-xs text-destructive">{formErrors.login_email}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowResetForm(true)}
                        className="py-1 text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setFormErrors((prev) => ({ ...prev, login_password: "" }));
                        }}
                        className={`h-11 pr-11 text-base sm:h-10 sm:text-sm ${formErrors.login_password ? "border-destructive" : ""}`}
                        disabled={rateLimitState.isBlocked}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                        disabled={rateLimitState.isBlocked}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" />
                        ) : (
                          <Eye className="h-5 w-5 sm:h-4 sm:w-4" />
                        )}
                      </button>
                    </div>
                    {formErrors.login_password && (
                      <p className="text-xs text-destructive">{formErrors.login_password}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="mt-2 h-12 w-full text-base"
                    disabled={isSubmitting || rateLimitState.isBlocked}
                  >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                {/* Create account link */}
                <div className="mt-4 border-t border-border pt-4 sm:mt-6 sm:pt-6">
                  <p className="mb-3 text-center text-sm text-muted-foreground">
                    Don't have an account yet?
                  </p>
                  <Button variant="outline" className="group h-11 w-full sm:h-10" asChild>
                    <Link to="/signup">
                      Start your 14-day free trial
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground sm:text-sm">
          Pulcrix — Clean Living. Pure Solutions.
        </p>
      </div>
    </div>
  );
}
