import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
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
import { PulcrixLogo } from "@/components/PulcrixLogo";

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
      title: "Works Offline",
      description: "Access your data even without internet connection"
    },
    {
      icon: Zap,
      title: "Instant Loading",
      description: "The app loads quickly from your device"
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Receive alerts for new jobs and updates"
    },
    {
      icon: Shield,
      title: "Secure",
      description: "Your data is protected and encrypted"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 safe-area-inset-top">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-12 w-12">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <PulcrixLogo variant="icon" size="md" className="text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Install App</h1>
              <p className="text-sm text-muted-foreground">Pulcrix Mobile</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl pb-24">
        {/* Online Status */}
        <div className={`flex items-center gap-2 mb-6 px-4 py-3 rounded-xl ${
          isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        }`}>
          {isOnline ? (
            <>
              <Wifi className="h-5 w-5" />
              <span className="font-medium">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Offline - Offline mode active</span>
            </>
          )}
        </div>

        {/* Already Installed */}
        {isStandalone ? (
          <Card className="mb-8 border-success/30 bg-success/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  You're already using the app!
                </h2>
                <p className="text-muted-foreground mb-6 text-lg">
                  Pulcrix is installed and running as a native app.
                </p>
                <Button onClick={() => navigate("/")} size="lg" className="h-14 px-8">
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isInstalled ? (
          <Card className="mb-8 border-success/30 bg-success/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  App Installed!
                </h2>
                <p className="text-muted-foreground text-lg">
                  Find Pulcrix on your home screen to use it.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Install Card */}
            <Card className="mb-8">
              <CardHeader className="text-center">
                <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">Install Pulcrix</CardTitle>
                <CardDescription className="text-base">
                  Quick access from your home screen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deferredPrompt ? (
                  <Button onClick={handleInstall} className="w-full h-14" size="lg">
                    <Download className="h-6 w-6 mr-2" />
                    Install Now
                  </Button>
                ) : isIOS ? (
                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground text-lg">
                      To install on iPhone/iPad:
                    </p>
                    <div className="bg-muted rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-lg">1</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg">
                          <span>Tap</span>
                          <Share className="h-6 w-6 text-primary" />
                          <span className="font-medium">Share</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-lg">2</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg">
                          <span>Select</span>
                          <Plus className="h-6 w-6 text-primary" />
                          <span className="font-medium">"Add to Home Screen"</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-lg">3</span>
                        </div>
                        <span className="text-lg">Confirm by tapping "Add"</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground text-lg">
                      To install on Android:
                    </p>
                    <div className="bg-muted rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-lg">1</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg">
                          <span>Tap the menu</span>
                          <MoreVertical className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-lg">2</span>
                        </div>
                        <span className="text-lg">Select "Install app"</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-lg">3</span>
                        </div>
                        <span className="text-lg">Confirm installation</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Features */}
        <h3 className="text-lg font-semibold text-foreground mb-4">App Benefits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate("/")} size="lg" className="h-14 px-8">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Button>
        </div>
      </main>
    </div>
  );
}
