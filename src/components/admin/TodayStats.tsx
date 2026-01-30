import { CheckCircle, Clock, ListTodo, TrendingUp } from "lucide-react";
import type { Stats } from "./StatsCards";

interface TodayStatsProps {
  stats: Stats;
}

export function TodayStats({ stats }: TodayStatsProps) {
  const statItems = [
    {
      label: "Total",
      value: stats.todayJobs,
      icon: ListTodo,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "In Progress",
      value: stats.todayJobs - stats.completedToday,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Completed",
      value: stats.completedToday,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Rate",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
        >
          <div className={`p-2 rounded-lg ${item.bgColor}`}>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
