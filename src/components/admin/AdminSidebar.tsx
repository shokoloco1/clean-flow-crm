import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  Building2,
  RefreshCw,
  DollarSign,
  Loader2,
  Globe,
  Clock,
  Receipt,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

type NavItem = {
  titleKey: string;
  url: string;
  icon: typeof LayoutDashboard;
};

const mainNavItems: NavItem[] = [{ titleKey: "todays_view", url: "/admin", icon: LayoutDashboard }];

const operationsNavItems: NavItem[] = [
  { titleKey: "calendar", url: "/admin/calendar", icon: Calendar },
  { titleKey: "clients", url: "/admin/clients", icon: Users },
  { titleKey: "properties", url: "/admin/properties", icon: Building2 },
  { titleKey: "staff", url: "/admin/staff", icon: UserCog },
  { titleKey: "time_tracking", url: "/admin/time-tracking", icon: Clock },
  { titleKey: "pay_rates", url: "/admin/pay-rates", icon: DollarSign },
  { titleKey: "pay_reports", url: "/admin/pay-reports", icon: Receipt },
  { titleKey: "invoices", url: "/admin/invoices", icon: FileText },
  { titleKey: "recurring_jobs", url: "/admin/recurring", icon: RefreshCw },
  { titleKey: "pricing", url: "/admin/price-lists", icon: DollarSign },
];

const insightsNavItems: NavItem[] = [
  { titleKey: "reports", url: "/admin/reports", icon: BarChart3 },
  { titleKey: "settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { language, setLanguage, tAdmin } = useLanguage();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent double-click
    setIsSigningOut(true);
    await signOut();
    // signOut handles navigation, no need to reset state
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "es" : "en");
  };

  const isActive = (url: string) => {
    if (url === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(url);
  };

  const renderNavItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => {
        // Type assertion for admin translation keys
        const title = tAdmin(item.titleKey as Parameters<typeof tAdmin>[0]);
        return (
          <SidebarMenuItem key={item.titleKey}>
            <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={title}>
              <Link to={item.url}>
                <item.icon className="h-4 w-4" />
                <span>{title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-2 py-3 transition-opacity hover:opacity-80"
        >
          {isCollapsed ? (
            <PulcrixLogo variant="icon" size="sm" className="shrink-0 text-primary" />
          ) : (
            <div className="overflow-hidden">
              <PulcrixLogo size="sm" />
              <p className="truncate text-xs text-muted-foreground">Admin Panel</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>{renderNavItems(mainNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-2 my-2" />

        <SidebarGroup>
          <SidebarGroupContent>{renderNavItems(operationsNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-2 my-2" />

        <SidebarGroup>
          <SidebarGroupContent>{renderNavItems(insightsNavItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleLanguage}
              tooltip={language === "en" ? "Español" : "English"}
              className="text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              <span>{language === "en" ? "Español" : "English"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip={isSigningOut ? tAdmin("loading") : "Sign Out"}
              disabled={isSigningOut}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {isSigningOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{isSigningOut ? tAdmin("loading") : "Sign Out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
