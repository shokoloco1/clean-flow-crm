import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users, CheckCircle, TrendingUp } from "lucide-react";

export interface Stats {
  todayJobs: number;
  activeStaff: number;
  completedToday: number;
  completionRate: number;
}

interface StatsCardsProps {
  stats: Stats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Today's Jobs",
      value: stats.todayJobs,
      icon: Calendar,
      iconColor: "text-primary",
      tooltip: "Total jobs scheduled for today",
    },
    {
      title: "Completed Today",
      value: stats.completedToday,
      icon: CheckCircle,
      iconColor: "text-success",
      tooltip: "Jobs completed today",
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      iconColor: "text-primary",
      tooltip: "Percentage of jobs completed vs scheduled today",
    },
    {
      title: "Total Staff",
      value: stats.activeStaff,
      icon: Users,
      iconColor: "text-primary",
      tooltip: "Total active team members",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-4 md:gap-6">
      {cards.map((card) => (
        <Tooltip key={card.title}>
          <TooltipTrigger asChild>
            <Card className="cursor-help border-border shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="truncate text-xs font-medium text-muted-foreground md:text-sm">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-4 w-4 md:h-5 md:w-5 ${card.iconColor} flex-shrink-0`} />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-2xl font-bold text-foreground md:text-3xl">{card.value}</div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>{card.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
