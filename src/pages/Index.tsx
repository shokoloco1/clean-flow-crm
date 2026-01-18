import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Shield, Users, ClipboardCheck, Camera, MapPin, Building2, ArrowRight, CheckCircle, Star, Zap } from "lucide-react";
import { t } from "@/lib/i18n";

export default function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && role) {
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/staff");
      }
    }
  }, [user, role, loading, navigate]);

  const features = [
    {
      icon: ClipboardCheck,
      title: t("jobManagement"),
      description: t("jobManagementDesc"),
      color: "text-primary"
    },
    {
      icon: Camera,
      title: t("proofOfWork"),
      description: t("proofOfWorkDesc"),
      color: "text-success"
    },
    {
      icon: MapPin,
      title: t("locationTracking"),
      description: t("locationTrackingDesc"),
      color: "text-warning"
    },
    {
      icon: Users,
      title: t("teamCoordination"),
      description: t("teamCoordinationDesc"),
      color: "text-secondary"
    }
  ];

  const benefits = [
    "Ahorra hasta 5 horas a la semana",
    "Mejora la comunicación con clientes",
    "Aumenta la productividad del equipo",
    "Reduce errores y olvidos"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20" />
        
        <div className="relative container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              Gestiona tu negocio de limpieza <span className="text-primary">sin estrés</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              La herramienta más fácil para organizar trabajos, clientes y empleados. ¡Empieza gratis!
            </p>

            {/* Benefits list */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="h-14 px-8 text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all group"
                onClick={() => navigate("/auth")}
              >
                Empezar Gratis
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-lg"
                onClick={() => navigate("/auth")}
              >
                Ya tengo cuenta
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm flex-wrap">
              <Zap className="h-4 w-4 text-warning" />
              <span>Configuración en menos de 2 minutos</span>
              <span className="mx-2 hidden sm:inline">•</span>
              <Star className="h-4 w-4 text-warning" />
              <span>Sin tarjeta de crédito</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            Diseñado especialmente para empresas de limpieza como la tuya
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group p-6 border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
              >
                <CardContent className="p-0">
                  <div className={`h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
            Perfecto para todo tu equipo
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 md:p-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg transition-shadow">
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-6 shadow-md">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">👔 Para Dueños y Admins</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Dashboard con todas las métricas clave</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Crea y programa trabajos fácilmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Gestiona clientes y personal en un clic</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Recibe alertas cuando algo no va bien</span>
                </li>
              </ul>
            </Card>
            
            <Card className="p-6 md:p-8 border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent hover:shadow-lg transition-shadow">
              <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center mb-6 shadow-md">
                <Users className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">🧹 Para el Equipo de Limpieza</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>App súper fácil de usar desde el celular</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Ve tus trabajos del día de un vistazo</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Navega al lugar con un solo toque</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Sube fotos antes y después fácilmente</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Client Portal CTA */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            ¿Eres cliente de una empresa de limpieza?
          </h3>
          <p className="text-muted-foreground mb-6">
            Accede al portal de clientes para ver el historial de servicios
          </p>
          <Button 
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/portal")}
          >
            <Building2 className="h-4 w-4" />
            Acceder al Portal de Clientes
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">{t("appName")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("streamlineOperations")}
          </p>
        </div>
      </footer>
    </div>
  );
}
