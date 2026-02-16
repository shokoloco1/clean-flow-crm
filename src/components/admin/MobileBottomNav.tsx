import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, UserCog, FileText, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Jobs", url: "/admin/calendar", icon: Calendar },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Staff", url: "/admin/staff", icon: UserCog },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isActive = (url: string) => {
    if (url === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(url);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
  };

  return (
    <nav className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-1">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.title}
              to={item.url}
              className={cn(
                "flex min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 transition-all active:scale-95",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span
                className={cn("text-[10px] font-medium leading-tight", active && "text-primary")}
              >
                {item.title}
              </span>
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={cn(
            "flex min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 transition-all active:scale-95",
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          {isSigningOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium leading-tight">
            {isSigningOut ? "..." : "Logout"}
          </span>
        </button>
      </div>
    </nav>
  );
}
