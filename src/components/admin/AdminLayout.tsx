import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { NotificationCenter } from "@/components/NotificationCenter";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <SidebarInset className="flex flex-col">
          {/* Mobile Header */}
          <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border">
            <div className="flex items-center justify-between px-4 h-14">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">CleanFlow</span>
              </Link>
              <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationCenter />
              </div>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden md:flex sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="flex items-center justify-between w-full px-4 h-14">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Breadcrumbs />
              </div>
              <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationCenter />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </SidebarInset>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
