import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

import { useNavigate } from "react-router-dom";
import { Plus, Home, Users, Calendar, UserCircle, Repeat, Settings, FileText, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface QuickActionsProps {
  onNewJobClick: () => void;
}

interface Counts {
  properties: number;
  clients: number;
  staff: number;
  recurring: number;
  invoices: number;
  pendingJobs: number;
}

export function QuickActions({ onNewJobClick }: QuickActionsProps) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>({
    properties: 0,
    clients: 0,
    staff: 0,
    recurring: 0,
    invoices: 0,
    pendingJobs: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      const [
        { count: propertiesCount },
        { count: clientsCount },
        { count: staffCount },
        { count: recurringCount },
        { count: invoicesCount },
        { count: pendingJobsCount },
      ] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "staff"),
        supabase.from("recurring_schedules").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("invoices").select("*", { count: "exact", head: true }).in("status", ["draft", "sent"]),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setCounts({
        properties: propertiesCount || 0,
        clients: clientsCount || 0,
        staff: staffCount || 0,
        recurring: recurringCount || 0,
        invoices: invoicesCount || 0,
        pendingJobs: pendingJobsCount || 0,
      });
    };

    fetchCounts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('quick-actions-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, fetchCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const actions = [
    {
      icon: Plus,
      title: "New Job",
      subtitle: "Schedule cleaning",
      onClick: onNewJobClick,
      badge: counts.pendingJobs > 0 ? counts.pendingJobs : undefined,
      badgeClassName: "bg-warning text-warning-foreground",
    },
    {
      icon: Home,
      title: "Properties",
      subtitle: "Manage locations",
      onClick: () => navigate("/admin/properties"),
      badge: counts.properties,
    },
    {
      icon: UserCircle,
      title: "Clients",
      subtitle: "Manage clients",
      onClick: () => navigate("/admin/clients"),
      badge: counts.clients,
    },
    {
      icon: Users,
      title: "Staff",
      subtitle: "Manage team",
      onClick: () => navigate("/admin/staff"),
      badge: counts.staff,
    },
    {
      icon: Calendar,
      title: "Calendar",
      subtitle: "View schedule",
      onClick: () => navigate("/admin/calendar"),
    },
    {
      icon: Repeat,
      title: "Recurring Jobs",
      subtitle: "Auto-schedule",
      onClick: () => navigate("/admin/recurring"),
      badge: counts.recurring,
    },
    {
      icon: FileText,
      title: "Invoices",
      subtitle: "Generate invoices",
      onClick: () => navigate("/admin/invoices"),
      badge: counts.invoices > 0 ? counts.invoices : undefined,
    },
    {
      icon: DollarSign,
      title: "Pricing",
      subtitle: "Price list",
      onClick: () => navigate("/admin/price-lists"),
    },
    {
      icon: Settings,
      title: "Settings",
      subtitle: "System settings",
      onClick: () => navigate("/admin/settings"),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {actions.map((action) => (
        <Card 
          key={action.title}
          className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
          onClick={action.onClick}
        >
          <CardContent className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 text-center">
            {action.badge !== undefined && action.badge > 0 && (
              <span 
                className={`absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs rounded-full border font-semibold px-1.5 bg-secondary text-secondary-foreground ${action.badgeClassName || ""}`}
              >
                {action.badge > 99 ? "99+" : action.badge}
              </span>
            )}
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <action.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-xs md:text-sm">{action.title}</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{action.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}