import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, ClipboardList, TrendingUp } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import type { Stats } from "./StatsCards";

function AnimatedNumber({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  
  useEffect(() => {
    const numValue = typeof value === "string" ? parseInt(value) || 0 : value;
    const startValue = previousValue.current;
    const endValue = numValue;
    const duration = 500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <>{displayValue}{suffix}</>;
}

interface TodayStatsProps {
  stats: Stats;
  hasNoJobsToday?: boolean;
}

export function TodayStats({ stats, hasNoJobsToday = false }: TodayStatsProps) {
  const { tAdmin } = useLanguage();
  const inProgressCount = Math.max(0, stats.todayJobs - stats.completedToday);
  
  const statItems = [
    {
      label: tAdmin("total"),
      value: stats.todayJobs,
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      isPercent: false,
    },
    {
      label: tAdmin("in_progress"),
      value: inProgressCount,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      isPercent: false,
    },
    {
      label: tAdmin("completed"),
      value: stats.completedToday,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      isPercent: false,
    },
    {
      label: tAdmin("rate"),
      value: stats.completionRate,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      isPercent: true,
    },
  ];

  return (
    <div className="space-y-2">
      {hasNoJobsToday && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">
            📅 {tAdmin("no_jobs_scheduled_today")}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 transition-all hover:shadow-sm"
          >
            <div className={`p-2 rounded-lg ${item.bgColor}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">
                <AnimatedNumber 
                  value={item.value} 
                  suffix={item.isPercent ? "%" : ""} 
                />
              </p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
