import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Plus, Home, ClipboardList, Users, Calendar, UserCircle, Repeat, Settings } from "lucide-react";
import { t } from "@/lib/i18n";

interface QuickActionsProps {
  onNewJobClick: () => void;
}

export function QuickActions({ onNewJobClick }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      title: t("newJob"),
      subtitle: t("scheduleClean"),
      onClick: onNewJobClick,
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: Home,
      title: t("properties"),
      subtitle: t("manageLocations"),
      onClick: () => navigate("/admin/properties"),
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary-foreground"
    },
    {
      icon: UserCircle,
      title: t("clients"),
      subtitle: t("manageClients"),
      onClick: () => navigate("/admin/clients"),
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: ClipboardList,
      title: t("checklists"),
      subtitle: t("manageTemplates"),
      onClick: () => navigate("/admin/checklists"),
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary-foreground"
    },
    {
      icon: Users,
      title: t("staff"),
      subtitle: t("manageTeam"),
      onClick: () => navigate("/admin/staff"),
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: Calendar,
      title: t("calendar"),
      subtitle: t("viewSchedule"),
      onClick: () => navigate("/admin/calendar"),
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: Repeat,
      title: t("recurring"),
      subtitle: t("autoSchedule"),
      onClick: () => navigate("/admin/recurring"),
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary-foreground"
    },
    {
      icon: Settings,
      title: t("settings"),
      subtitle: t("systemConfig"),
      onClick: () => navigate("/admin/settings"),
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {actions.map((action) => (
        <Card 
          key={action.title}
          className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={action.onClick}
        >
          <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
            <div className={`h-12 w-12 rounded-xl ${action.iconBg} flex items-center justify-center`}>
              <action.icon className={`h-6 w-6 ${action.iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{action.title}</h3>
              <p className="text-xs text-muted-foreground">{action.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
