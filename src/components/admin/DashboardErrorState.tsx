import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DashboardErrorStateProps {
  error: string;
  isFromCache: boolean;
  retryCount: number;
  onRetry: () => void;
}

export function DashboardErrorState({
  error,
  isFromCache,
  retryCount,
  onRetry,
}: DashboardErrorStateProps) {
  const isTimeout = error.toLowerCase().includes("timeout");

  return (
    <Alert variant="destructive" className="mb-6">
      <div className="flex items-start gap-3">
        {isTimeout ? (
          <WifiOff className="mt-0.5 h-5 w-5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <AlertTitle className="text-base font-semibold">
            {isTimeout ? "Connection slow" : "Error loading data"}
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {isFromCache ? (
              <span>
                Showing cached data. {isTimeout ? "Server is taking too long to respond." : error}
              </span>
            ) : (
              <span>{error}</span>
            )}
            {retryCount > 0 && (
              <span className="mt-1 block text-xs opacity-75">
                Retry attempt {retryCount} failed
              </span>
            )}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 gap-2 border-destructive/50 hover:bg-destructive/10"
          >
            <RefreshCw className="h-4 w-4" />
            Tap to retry
          </Button>
        </div>
      </div>
    </Alert>
  );
}
