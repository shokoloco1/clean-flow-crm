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
  Shield,
} from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { logger } from "@/lib/logger";

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
      // @ts-expect-error -- navigator.standalone is iOS-specific, not in standard TS DOM types
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
      logger.error("Error installing PWA:", error);
    }
  };

  const features = [
    {
      icon: WifiOff,
      title: "Works Offline",
      description: "Access your data even without internet connection",
    },
    {
      icon: Zap,
      title: "Instant Loading",
      description: "The app loads quickly from your device",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Receive alerts for new jobs and updates",
    },
    {
      icon: Shield,
      title: "Secure",
      description: "Your data is protected and encrypted",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="safe-area-inset-top sticky top-0 z-10 border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
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

      <main className="container mx-auto max-w-2xl px-4 py-8 pb-24">
        {/* Online Status */}
        <div
          className={`mb-6 flex items-center gap-2 rounded-xl px-4 py-3 ${
            isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}
        >
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
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">
                  You're already using the app!
                </h2>
                <p className="mb-6 text-lg text-muted-foreground">
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
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">App Installed!</h2>
                <p className="text-lg text-muted-foreground">
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
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10">
                  <Smartphone className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">Install Pulcrix</CardTitle>
                <CardDescription className="text-base">
                  Quick access from your home screen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deferredPrompt ? (
                  <Button onClick={handleInstall} className="h-14 w-full" size="lg">
                    <Download className="mr-2 h-6 w-6" />
                    Install Now
                  </Button>
                ) : isIOS ? (
                  <div className="space-y-4">
                    <p className="text-center text-lg text-muted-foreground">
                      To install on iPhone/iPad:
                    </p>
                    <div className="space-y-4 rounded-xl bg-muted p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">1</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg">
                          <span>Tap</span>
                          <Share className="h-6 w-6 text-primary" />
                          <span className="font-medium">Share</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">2</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg">
                          <span>Select</span>
                          <Plus className="h-6 w-6 text-primary" />
                          <span className="font-medium">"Add to Home Screen"</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">3</span>
                        </div>
                        <span className="text-lg">Confirm by tapping "Add"</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-lg text-muted-foreground">
                      To install on Android:
                    </p>
                    <div className="space-y-4 rounded-xl bg-muted p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">1</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg">
                          <span>Tap the menu</span>
                          <MoreVertical className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">2</span>
                        </div>
                        <span className="text-lg">Select "Install app"</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">3</span>
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
        <h3 className="mb-4 text-lg font-semibold text-foreground">App Benefits</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
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
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </div>
      </main>
    </div>
  );
}
