import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Plus, Home, ClipboardList, Users, Calendar, UserCircle, Repeat } from "lucide-react";

interface QuickActionsProps {
  onNewJobClick: () => void;
}

export function QuickActions({ onNewJobClick }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      title: "New Job",
      subtitle: "Schedule cleaning",
      onClick: onNewJobClick,
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: Home,
      title: "Properties",
      subtitle: "Manage locations",
      onClick: () => navigate("/admin/properties"),
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary-foreground"
    },
    {
      icon: UserCircle,
      title: "Clients",
      subtitle: "Manage clients",
      onClick: () => navigate("/admin/clients"),
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: ClipboardList,
      title: "Checklists",
      subtitle: "Manage templates",
      onClick: () => navigate("/admin/checklists"),
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary-foreground"
    },
    {
      icon: Users,
      title: "Staff",
      subtitle: "Manage team",
      onClick: () => navigate("/admin/staff"),
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: Calendar,
      title: "Calendar",
      subtitle: "View schedule",
      onClick: () => navigate("/admin/calendar"),
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      icon: Repeat,
      title: "Recurring",
      subtitle: "Auto-schedule",
      onClick: () => navigate("/admin/recurring"),
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary-foreground"
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
