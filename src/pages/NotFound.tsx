import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, MapPin, HelpCircle } from "lucide-react";

const SUGGESTED_PAGES = [
  { path: "/admin", label: "Admin Dashboard", icon: Home },
  { path: "/staff", label: "Staff Dashboard", icon: MapPin },
  { path: "/portal", label: "Client Portal", icon: Search },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log 404 errors for analytics - only in dev mode via logger
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Animated 404 */}
        <div className="relative">
          <div className="text-[150px] font-bold text-primary/10 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Page not found
          </h1>
          <p className="text-muted-foreground">
            Sorry, the page <code className="px-2 py-1 rounded bg-muted text-sm">{location.pathname}</code> does not exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Link>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </Button>
        </div>

        {/* Suggested pages */}
        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Perhaps you were looking for one of these pages?
          </p>
          <div className="grid gap-2">
            {SUGGESTED_PAGES.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <page.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{page.label}</p>
                  <p className="text-xs text-muted-foreground">{page.path}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
