import { usePWA } from "@/hooks/usePWA";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning text-warning-foreground py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>No connection - Offline mode active</span>
    </div>
  );
}
