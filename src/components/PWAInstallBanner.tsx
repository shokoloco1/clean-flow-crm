import { forwardRef, ForwardRefRenderFunction } from "react";
import { useNavigate } from "react-router-dom";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";

const PWAInstallBannerComponent: ForwardRefRenderFunction<HTMLDivElement> = (_, ref) => {
  const navigate = useNavigate();
  const { canInstall, install, isInstalled, isStandalone, isIOS } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const wasDismissed = localStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Show banner after a short delay
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  const handleInstall = async () => {
    if (canInstall) {
      const installed = await install();
      if (installed) {
        setDismissed(true);
      }
    } else {
      navigate("/install");
    }
  };

  // Don't show if already installed, dismissed, or still loading
  if (isInstalled || isStandalone || dismissed || !showBanner) {
    return null;
  }

  // Only show for mobile or when install prompt is available
  if (!canInstall && !isIOS) {
    return null;
  }

  return (
    <div ref={ref} className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 safe-area-inset-bottom">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-7 w-7 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-base">
            Install Pulcrix
          </p>
          <p className="text-sm text-muted-foreground">
            Add to home screen for quick access
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="default" 
            onClick={handleInstall}
            className="gap-2 h-12 px-4"
          >
            <Download className="h-5 w-5" />
            <span className="hidden sm:inline">Install</span>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-10 w-10"
            aria-label="Dismiss install banner"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallBanner = forwardRef(PWAInstallBannerComponent);
PWAInstallBanner.displayName = "PWAInstallBanner";