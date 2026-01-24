import { forwardRef, ForwardRefRenderFunction } from "react";
import { useNavigate } from "react-router-dom";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { t } from "@/lib/i18n";

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
    <div ref={ref} className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">
            {t("appName")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("mobileFirst")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={handleInstall}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t("create")}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDismiss}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallBanner = forwardRef(PWAInstallBannerComponent);
PWAInstallBanner.displayName = "PWAInstallBanner";
