import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Download,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  Share,
  MoreVertical,
  Plus,
  Wifi,
  WifiOff,
  Zap,
  Bell,
  Shield
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      // @ts-ignore - navigator.standalone is iOS-specific
      const iosStandalone = window.navigator.standalone === true;
      setIsStandalone(standalone || iosStandalone);
      setIsInstalled(standalone || iosStandalone);
    };
    checkInstalled();

    // Check if iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    };
    checkIOS();

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error installing PWA:", error);
    }
  };

  const features = [
    {
      icon: WifiOff,
      title: "Funciona Offline",
      description: "Accede a tus datos incluso sin conexión a internet"
    },
    {
      icon: Zap,
      title: "Carga Instantánea",
      description: "La app se carga rápidamente desde tu dispositivo"
    },
    {
      icon: Bell,
      title: "Notificaciones",
      description: "Recibe alertas de nuevos trabajos y actualizaciones"
    },
    {
      icon: Shield,
      title: "Seguro",
      description: "Tus datos están protegidos y encriptados"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Instalar App</h1>
              <p className="text-sm text-muted-foreground">CleanFlow PWA</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Online Status */}
        <div className={`flex items-center gap-2 mb-6 px-4 py-2 rounded-lg ${
          isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        }`}>
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">Sin conexión - Modo offline activo</span>
            </>
          )}
        </div>

        {/* Already Installed */}
        {isStandalone ? (
          <Card className="mb-8 border-success/30 bg-success/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  ¡Ya estás usando la app!
                </h2>
                <p className="text-muted-foreground mb-6">
                  CleanFlow está instalado y funcionando como aplicación nativa.
                </p>
                <Button onClick={() => navigate("/")}>
                  Ir al Inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isInstalled ? (
          <Card className="mb-8 border-success/30 bg-success/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  ¡App Instalada!
                </h2>
                <p className="text-muted-foreground">
                  Busca CleanFlow en tu pantalla de inicio para usarla.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Install Card */}
            <Card className="mb-8">
              <CardHeader className="text-center">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">Instala CleanFlow</CardTitle>
                <CardDescription>
                  Accede rápidamente desde tu pantalla de inicio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deferredPrompt ? (
                  <Button onClick={handleInstall} className="w-full h-12" size="lg">
                    <Download className="h-5 w-5 mr-2" />
                    Instalar Ahora
                  </Button>
                ) : isIOS ? (
                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      Para instalar en iPhone/iPad:
                    </p>
                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">1</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Toca el botón</span>
                          <Share className="h-5 w-5 text-primary" />
                          <span>Compartir</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">2</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Selecciona</span>
                          <Plus className="h-5 w-5 text-primary" />
                          <span>"Añadir a Inicio"</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">3</span>
                        </div>
                        <span>Confirma tocando "Añadir"</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      Para instalar en Android:
                    </p>
                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">1</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Toca el menú</span>
                          <MoreVertical className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">2</span>
                        </div>
                        <span>Selecciona "Instalar aplicación"</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">3</span>
                        </div>
                        <span>Confirma la instalación</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Features */}
        <h3 className="text-lg font-semibold text-foreground mb-4">Ventajas de la App</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Inicio
          </Button>
        </div>
      </main>
    </div>
  );
}
