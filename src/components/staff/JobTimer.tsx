import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface JobTimerProps {
  startedAt: Date;
  estimatedHours?: number;
  compact?: boolean;
}

export function JobTimer({ startedAt, estimatedHours, compact = false }: JobTimerProps) {
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const now = new Date();
      const start = new Date(startedAt);
      return Math.floor((now.getTime() - start.getTime()) / 1000);
    };

    setElapsed(calculateElapsed());

    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const formatTime = (num: number) => num.toString().padStart(2, "0");
  const timeString = `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`;

  // Determine if over time
  const estimatedSeconds = estimatedHours ? estimatedHours * 3600 : null;
  const isOverTime = estimatedSeconds ? elapsed > estimatedSeconds : false;
  const isNearLimit = estimatedSeconds ? elapsed > estimatedSeconds * 0.8 : false;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-mono font-medium",
          isOverTime
            ? "bg-warning/20 text-warning"
            : isNearLimit
              ? "bg-warning/20 text-warning"
              : "bg-success/20 text-success"
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        <span>{timeString}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 p-4 rounded-xl",
        isOverTime
          ? "bg-warning/10 border border-warning/30"
          : isNearLimit
            ? "bg-warning/10 border border-warning/30"
            : "bg-success/10 border border-success/30"
      )}
    >
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {t("time_elapsed")}
      </span>
      <div
        className={cn(
          "text-3xl font-mono font-bold",
          isOverTime ? "text-warning" : isNearLimit ? "text-warning" : "text-success"
        )}
      >
        {timeString}
      </div>
      {estimatedHours && (
        <span
          className={cn(
            "text-xs font-medium",
            isOverTime ? "text-warning" : "text-muted-foreground"
          )}
        >
          {isOverTime ? t("over_time") : t("on_track")} ({estimatedHours}h {t("estimated")})
        </span>
      )}
    </div>
  );
}
