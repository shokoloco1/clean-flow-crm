import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, MapPin, Sparkles } from "lucide-react";

const SUGGESTED_PAGES = [
  { path: "/admin", label: "Admin Dashboard", description: "Manage your business", icon: Home },
  { path: "/staff", label: "Staff Dashboard", description: "View your jobs", icon: MapPin },
  { path: "/pricing", label: "Pricing", description: "View our plans", icon: Sparkles },
];

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Branding */}
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">CleanFlow</span>
        </Link>

        {/* 404 Display */}
        <div className="relative">
          <div className="text-[120px] font-bold text-primary/10 leading-none select-none">
            404
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
            Try one of these instead:
          </p>
          <div className="grid gap-2">
            {SUGGESTED_PAGES.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <page.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{page.label}</p>
                  <p className="text-xs text-muted-foreground">{page.description}</p>
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
