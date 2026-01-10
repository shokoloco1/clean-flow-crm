import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Shield, Users, Eye, EyeOff } from "lucide-react";
import { signupSchema, loginSchema, validatePassword } from "@/lib/passwordSecurity";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export default function Auth() {
  const navigate = useNavigate();
  const { user, session, role, loading, signIn, signUp, signOut, refreshRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState<"admin" | "staff">("staff");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapTried, setBootstrapTried] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "admin" ? "/admin" : "/staff", { replace: true });
      return;
    }

    // If user is logged in but has no role, try one-time bootstrap (first user becomes admin)
    if (!loading && user && !role && session && !bootstrapTried) {
      setBootstrapTried(true);
      supabase.functions
        .invoke("bootstrap-role")
        .then(async ({ error }) => {
          if (error) return;
          await refreshRole();
        })
        .catch(() => undefined);
    }
  }, [user, role, loading, navigate, session, bootstrapTried, refreshRole]);

  const handleBootstrapAdmin = async () => {
    setIsBootstrapping(true);
    const { error } = await supabase.functions.invoke("bootstrap-role");
    if (error) {
      toast.error("Tu cuenta no tiene rol asignado. Pídele al admin que te asigne uno.");
    } else {
      await refreshRole();
      toast.success("Rol admin asignado. Redirigiendo...");
    }
    setIsBootstrapping(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    // Validar con zod
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
      // No revelar si el email existe o no (seguridad)
      toast.error("Credenciales inválidas. Verifica tu email y contraseña.");
    } else {
      toast.success("¡Bienvenido de vuelta!");
    }
    
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    // Validar con zod
    const result = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      name: signupName,
      role: signupRole
    });
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[`signup_${field}`] = err.message;
      });
      setFormErrors(errors);
      toast.error("Por favor corrige los errores del formulario");
      return;
    }
    
    setIsSubmitting(true);
    
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole);
    
    if (error) {
      if (error.message?.includes("already registered")) {
        toast.error("Este email ya está registrado. Inicia sesión en su lugar.");
      } else {
        toast.error(error.message || "Error al crear la cuenta");
      }
    } else {
      toast.success("¡Cuenta creada exitosamente!");
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // Logged in but no role assigned
  if (user && !role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">CleanFlow</h1>
            <p className="text-muted-foreground">Tu cuenta no tiene un rol asignado</p>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle>Acceso pendiente</CardTitle>
              <CardDescription>
                Para entrar, un administrador debe asignarte un rol (admin o staff).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={handleBootstrapAdmin}
                disabled={isBootstrapping}
              >
                {isBootstrapping ? "Configurando..." : "Configurar como Admin (solo 1ª vez)"}
              </Button>
              <Button variant="outline" className="w-full" onClick={signOut}>
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and branding */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">CleanFlow</h1>
          <p className="text-muted-foreground">Professional cleaning management</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setFormErrors((prev) => ({ ...prev, login_email: "" }));
                      }}
                      className={formErrors.login_email ? "border-destructive" : ""}
                      required
                    />
                    {formErrors.login_email && (
                      <p className="text-xs text-destructive">{formErrors.login_email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
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
                        className={formErrors.login_password ? "border-destructive pr-10" : "pr-10"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.login_password && (
                      <p className="text-xs text-destructive">{formErrors.login_password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value);
                        setFormErrors((prev) => ({ ...prev, signup_name: "" }));
                      }}
                      className={formErrors.signup_name ? "border-destructive" : ""}
                      required
                    />
                    {formErrors.signup_name && (
                      <p className="text-xs text-destructive">{formErrors.signup_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@ejemplo.com"
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value);
                        setFormErrors((prev) => ({ ...prev, signup_email: "" }));
                      }}
                      className={formErrors.signup_email ? "border-destructive" : ""}
                      required
                    />
                    {formErrors.signup_email && (
                      <p className="text-xs text-destructive">{formErrors.signup_email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => {
                          setSignupPassword(e.target.value);
                          setFormErrors((prev) => ({ ...prev, signup_password: "" }));
                        }}
                        className={formErrors.signup_password ? "border-destructive pr-10" : "pr-10"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={signupPassword} />
                    {formErrors.signup_password && (
                      <p className="text-xs text-destructive">{formErrors.signup_password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Cuenta</Label>
                    <Select value={signupRole} onValueChange={(v) => setSignupRole(v as "admin" | "staff")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Admin (Propietario)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="staff">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Staff (Limpiador)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || validatePassword(signupPassword).strength === "weak"}
                  >
                    {isSubmitting ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          CleanFlow — Gestiona tu negocio de limpieza
        </p>
      </div>
    </div>
  );
}
