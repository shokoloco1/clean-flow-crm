import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { toast } from "sonner";

export function EmailVerificationPending() {
  const { user, signOut, resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    const { error } = await resendVerificationEmail();

    if (error) {
      toast.error("Failed to resend email. Please try again.");
    } else {
      setResent(true);
      toast.success("Verification email sent!");
    }

    setIsResending(false);
  };

  const handleRefresh = () => {
    // Reload the page to check if email was verified
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center">
            <PulcrixLogo size="lg" />
          </div>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription>We sent a verification link to</CardDescription>
            <p className="mt-1 font-medium text-foreground">{user?.email}</p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="mb-2">
                Click the link in your email to verify your account and get started.
              </p>
              <p>The link will expire in 24 hours.</p>
            </div>

            {resent ? (
              <div className="flex items-center justify-center gap-2 py-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Email sent!</span>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            )}

            <Button variant="default" className="w-full" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              I've Verified - Continue
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Didn't receive the email? Check your spam folder or try resending.
        </p>
      </div>
    </div>
  );
}
