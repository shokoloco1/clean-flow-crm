import { useMemo } from "react";
import { validatePassword } from "@/lib/passwordSecurity";
import { Check, X, AlertTriangle, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

const requirements = [
  { label: "8+ caracteres", test: (p: string) => p.length >= 8 },
  { label: "Minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Carácter especial", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const validation = useMemo(() => validatePassword(password), [password]);
  
  if (!password) return null;
  
  const strengthConfig = {
    weak: {
      color: "bg-destructive",
      textColor: "text-destructive",
      label: "Débil",
      icon: ShieldAlert,
      width: "w-1/3"
    },
    medium: {
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      label: "Media",
      icon: Shield,
      width: "w-2/3"
    },
    strong: {
      color: "bg-green-500",
      textColor: "text-green-600",
      label: "Fuerte",
      icon: ShieldCheck,
      width: "w-full"
    }
  };
  
  const config = strengthConfig[validation.strength];
  const Icon = config.icon;
  
  return (
    <div className="space-y-3 mt-2">
      {/* Barra de fortaleza */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fortaleza:</span>
          <div className={cn("flex items-center gap-1 font-medium", config.textColor)}>
            <Icon className="h-3.5 w-3.5" />
            <span>{config.label}</span>
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300 rounded-full", config.color, config.width)} 
          />
        </div>
      </div>
      
      {/* Requisitos */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1.5">
          {requirements.map((req) => {
            const passed = req.test(password);
            return (
              <div 
                key={req.label}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  passed ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {passed ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Advertencias especiales */}
      {validation.errors.includes("Contraseña filtrada") && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">
            Esta contraseña aparece en bases de datos filtradas. 
            Los hackers la probarán primero.
          </p>
        </div>
      )}
      
      {validation.errors.includes("Patrón débil") && !validation.errors.includes("Contraseña filtrada") && (
        <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-500">
            Evita patrones predecibles como secuencias o repeticiones.
          </p>
        </div>
      )}
    </div>
  );
}
