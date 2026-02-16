import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { NotificationCenter } from "@/components/NotificationCenter";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { Link } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex flex-col">
          {/* Mobile Header */}
          <header className="safe-area-inset-top sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md md:hidden">
            <div className="flex h-14 items-center justify-between px-3">
              <Link to="/" className="flex shrink-0 items-center gap-2">
                <PulcrixLogo size="sm" />
              </Link>
              <div className="flex items-center gap-1">
                <GlobalSearch />
                <NotificationCenter />
              </div>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="sticky top-0 z-40 hidden border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex">
            <div className="flex h-14 w-full items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Breadcrumbs />
              </div>
              <div className="flex items-center gap-2">
                <GlobalSearch />
                <KeyboardShortcutsHelp />
                <NotificationCenter />
              </div>
            </div>
          </header>

          {/* Main Content - Extra bottom padding for mobile nav */}
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </SidebarInset>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
