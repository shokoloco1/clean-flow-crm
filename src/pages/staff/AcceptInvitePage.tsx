import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { Loader2 } from "lucide-react";

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionReadyRef = useRef(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        setSessionError("Error al procesar la invitación. Por favor, intenta de nuevo.");
        return;
      }

      if (session) {
        sessionReadyRef.current = true;
        setIsSessionReady(true);
      } else {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
          if (event === "SIGNED_IN" && sess) {
            sessionReadyRef.current = true;
            setIsSessionReady(true);
            subscription.unsubscribe();
          }
        });

        // Timeout after 10 seconds - use ref to avoid stale closure
        setTimeout(() => {
          if (!sessionReadyRef.current) {
            setSessionError("No se pudo verificar la invitación. El enlace puede haber expirado.");
          }
        }, 10000);
      }
    };

    checkSession();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      toast.success("¡Cuenta configurada exitosamente!");
      
      // Small delay before redirect
      setTimeout(() => {
        navigate("/staff", { replace: true });
      }, 1000);
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast.error(error.message || "Error al configurar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{sessionError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Ir a Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <PulcrixLogo variant="icon" size="lg" className="text-primary" />
          </div>
          <CardTitle className="text-2xl">¡Bienvenido a Pulcrix!</CardTitle>
          <CardDescription>
            Configura tu contraseña para acceder a tu cuenta de staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                "Crear mi cuenta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
