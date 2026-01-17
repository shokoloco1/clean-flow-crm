import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users, CheckCircle, TrendingUp } from "lucide-react";
import { t } from "@/lib/i18n";

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
      title: t("todaysJobs"),
      value: stats.todayJobs,
      icon: Calendar,
      iconColor: "text-primary",
      tooltip: "Total de trabajos programados para hoy",
    },
    {
      title: t("completedToday"),
      value: stats.completedToday,
      icon: CheckCircle,
      iconColor: "text-success",
      tooltip: "Trabajos completados hoy",
    },
    {
      title: t("completionRate"),
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      iconColor: "text-primary",
      tooltip: "Porcentaje de trabajos completados vs programados hoy",
    },
    {
      title: t("totalStaff"),
      value: stats.activeStaff,
      icon: Users,
      iconColor: "text-primary",
      tooltip: "Total de miembros del equipo activos",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
      {cards.map((card) => (
        <Tooltip key={card.title}>
          <TooltipTrigger asChild>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow cursor-help">
              <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-4 w-4 md:h-5 md:w-5 ${card.iconColor} flex-shrink-0`} />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-2xl md:text-3xl font-bold text-foreground">{card.value}</div>
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
