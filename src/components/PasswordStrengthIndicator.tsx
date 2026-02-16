import { useMemo } from "react";
import { validatePassword } from "@/lib/passwordSecurity";
import { Check, X, AlertTriangle, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

const requirements = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Lowercase", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const validation = useMemo(() => validatePassword(password), [password]);

  if (!password) return null;

  const strengthConfig = {
    weak: {
      color: "bg-destructive",
      textColor: "text-destructive",
      label: "Weak",
      icon: ShieldAlert,
      width: "w-1/3",
    },
    medium: {
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      label: "Medium",
      icon: Shield,
      width: "w-2/3",
    },
    strong: {
      color: "bg-green-500",
      textColor: "text-green-600",
      label: "Strong",
      icon: ShieldCheck,
      width: "w-full",
    },
  };

  const config = strengthConfig[validation.strength];
  const Icon = config.icon;

  return (
    <div className="mt-2 space-y-3">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Strength:</span>
          <div className={cn("flex items-center gap-1 font-medium", config.textColor)}>
            <Icon className="h-3.5 w-3.5" />
            <span>{config.label}</span>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              config.color,
              config.width,
            )}
          />
        </div>
      </div>

      {/* Requirements */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1.5">
          {requirements.map((req) => {
            const passed = req.test(password);
            return (
              <div
                key={req.label}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  passed ? "text-green-600" : "text-muted-foreground",
                )}
              >
                {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Special warnings */}
      {validation.errors.includes("Leaked password") && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            This password appears in leaked databases. Hackers will try it first.
          </p>
        </div>
      )}

      {validation.errors.includes("Weak pattern") &&
        !validation.errors.includes("Leaked password") && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/10 p-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <p className="text-xs text-yellow-700 dark:text-yellow-500">
              Avoid predictable patterns like sequences or repetitions.
            </p>
          </div>
        )}
    </div>
  );
}
