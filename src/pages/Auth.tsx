import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Eye, EyeOff, AlertTriangle, Lock, CheckCircle, ArrowRight, Chrome } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { loginSchema } from "@/lib/passwordSecurity";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Auth() {
  const navigate = useNavigate();
  const { user, session, role, loading, signIn, signOut, refreshRole } = useAuth();
  const { rateLimitState, checkRateLimit, recordAttempt, clearRateLimitState } = useRateLimit();
  const { t } = useTranslation(['auth', 'common']);

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
    try { sessionStorage.removeItem("pulcrix_signup_in_progress"); } catch {}
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast.error(t('auth:toast.enterEmail'));
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast.error(t('auth:toast.resetEmailFailed'));
    } else {
      setResetSent(true);
      toast.success(t('auth:toast.resetEmailSent'));
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
      toast.error(t('auth:toast.noRoleAssigned'));
    } else {
      await refreshRole();
      toast.success(t('auth:toast.adminRoleAssigned'));
    }
    setIsBootstrapping(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Check rate limiting first
    const isBlocked = await checkRateLimit(loginEmail);
    if (isBlocked) {
      toast.error(t('auth:rateLimit.blocked', { minutes: rateLimitState.remainingMinutes }));
      return;
    }

    // Validate with zod
    const result = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword
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
      toast.error(t('auth:toast.invalidCredentials'));
    } else {
      await recordAttempt(loginEmail, true);
      toast.success(t('auth:toast.welcomeBack'));
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">{t('common:loading')}</div>
      </div>
    );
  }

  // Logged in but no role assigned
  if (user && !role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <PulcrixLogo variant="icon" size="lg" className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Pulcrix</h1>
            <p className="text-muted-foreground">{t('auth:noRole.subtitle')}</p>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle>{t('auth:noRole.title')}</CardTitle>
              <CardDescription>
                {t('auth:noRole.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={handleBootstrapAdmin}
                disabled={isBootstrapping}
              >
                {isBootstrapping ? t('auth:noRole.configuring') : t('auth:noRole.configureAdmin')}
              </Button>
              <Button variant="outline" className="w-full" onClick={signOut}>
                {t('auth:noRole.signOut')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-6">
        {/* Logo and branding */}
        <div className="text-center space-y-3">
          <Link to="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
            <PulcrixLogo variant="icon" size="lg" className="text-primary" />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Pulcrix</h1>
          <p className="text-muted-foreground">{t('common:tagline')}</p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl">{t('auth:signIn.title')}</CardTitle>
            <CardDescription>
              {t('auth:signIn.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Password Reset Form */}
            {showResetForm ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="font-semibold text-foreground">{t('auth:passwordReset.successTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('auth:passwordReset.successMessage', { email: resetEmail })}
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
                      {t('auth:passwordReset.backToSignIn')}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-foreground">{t('auth:passwordReset.title')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('auth:passwordReset.subtitle')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">{t('auth:passwordReset.emailLabel')}</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder={t('auth:signIn.emailPlaceholder')}
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t('auth:passwordReset.submitting') : t('auth:passwordReset.submitButton')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowResetForm(false)}
                    >
                      {t('auth:passwordReset.backToSignIn')}
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
                      {t('auth:rateLimit.blocked', { minutes: rateLimitState.remainingMinutes })}
                    </AlertDescription>
                  </Alert>
                )}

                {rateLimitState.failedAttempts > 0 && !rateLimitState.isBlocked && (
                  <Alert variant="default" className="mb-4 border-warning/50 bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      {t('auth:rateLimit.attemptsRemaining', { attempts: 5 - rateLimitState.failedAttempts })}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth:signIn.emailLabel')}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t('auth:signIn.emailPlaceholder')}
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setFormErrors((prev) => ({ ...prev, login_email: "" }));
                      }}
                      className={formErrors.login_email ? "border-destructive" : ""}
                      disabled={rateLimitState.isBlocked}
                      required
                    />
                    {formErrors.login_email && (
                      <p className="text-xs text-destructive">{formErrors.login_email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">{t('auth:signIn.passwordLabel')}</Label>
                      <button
                        type="button"
                        onClick={() => setShowResetForm(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        {t('auth:signIn.forgotPassword')}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder={t('auth:signIn.passwordPlaceholder')}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setFormErrors((prev) => ({ ...prev, login_password: "" }));
                        }}
                        className={formErrors.login_password ? "border-destructive pr-10" : "pr-10"}
                        disabled={rateLimitState.isBlocked}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={rateLimitState.isBlocked}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.login_password && (
                      <p className="text-xs text-destructive">{formErrors.login_password}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base"
                    disabled={isSubmitting || rateLimitState.isBlocked}
                  >
                    {isSubmitting ? t('auth:signIn.submitting') : t('auth:signIn.submitButton')}
                  </Button>
                </form>

                {/* Social login divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('auth:signIn.orContinueWith')}</span>
                  </div>
                </div>

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={async () => {
                    setIsSubmitting(true);
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) {
                      toast.error(t('auth:toast.googleSignInFailed'));
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting || rateLimitState.isBlocked}
                >
                  <Chrome className="mr-2 h-5 w-5" />
                  {t('auth:signIn.signInWithGoogle')}
                </Button>

                {/* Create account link */}
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-center text-sm text-muted-foreground mb-3">
                    {t('auth:signUp.noAccount')}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full group"
                    asChild
                  >
                    <Link to="/signup">
                      {t('auth:signUp.startTrial')}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Pulcrix — {t('common:tagline')}
        </p>
      </div>
    </div>
  );
}
