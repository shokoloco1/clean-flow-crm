import { usePWA } from "@/hooks/usePWA";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
      <WifiOff className="h-4 w-4" />
      <span>No connection - Offline mode active</span>
    </div>
  );
}
