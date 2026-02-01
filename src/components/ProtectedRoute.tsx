import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { memo } from "react";
import { EmailVerificationPending } from "./EmailVerificationPending";
import { SubscriptionGate } from "./SubscriptionGate";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "staff")[];
  requireEmailVerification?: boolean;
  requireSubscription?: boolean; // Gate behind subscription
}

export const ProtectedRoute = memo(function ProtectedRoute({
  children,
  allowedRoles,
  requireEmailVerification = true, // Default to requiring email verification
  requireSubscription = true // Default to requiring subscription (with trial)
}: ProtectedRouteProps) {
  const { user, role, loading, emailVerified } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check email verification if required
  if (requireEmailVerification && !emailVerified) {
    return <EmailVerificationPending />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === "admin" ? "/admin" : "/staff"} replace />;
  }

  // Check subscription (with trial period support)
  if (requireSubscription) {
    return <SubscriptionGate>{children}</SubscriptionGate>;
  }

  return <>{children}</>;
});
