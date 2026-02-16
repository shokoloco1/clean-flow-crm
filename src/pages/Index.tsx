import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Users,
  ClipboardCheck,
  Camera,
  MapPin,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Lock,
} from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";

export default function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && role) {
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/staff");
      }
    }
  }, [user, role, loading, navigate]);

  const features = [
    {
      icon: ClipboardCheck,
      title: "Job Management",
      description: "Schedule and track jobs easily",
      color: "text-primary",
    },
    {
      icon: Camera,
      title: "Proof of Work",
      description: "Capture before & after photos for accountability",
      color: "text-success",
    },
    {
      icon: MapPin,
      title: "Location Tracking",
      description: "One-tap navigation to job site",
      color: "text-warning",
    },
    {
      icon: Users,
      title: "Team Coordination",
      description: "Assign jobs and monitor staff performance",
      color: "text-secondary",
    },
  ];

  const benefits = [
    "Setup in 3 clicks",
    "Made for Australia",
    "GST & ABN ready",
    "Mobile-first design",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mobile Optimized */}
      <header className="safe-area-inset-top fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4">
          <Link to="/" className="shrink-0 transition-opacity hover:opacity-80">
            <PulcrixLogo variant="icon" size="sm" className="sm:hidden" />
            <PulcrixLogo variant="full" size="sm" className="hidden sm:block" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>
              Pricing
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>
              Start Free Trial
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex items-center gap-1 sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
            <Button size="sm" className="h-9 px-3 text-sm" onClick={() => navigate("/signup")}>
              Start Trial
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile Optimized */}
      <div className="relative overflow-hidden pt-14 sm:pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20" />

        <div className="container relative mx-auto px-4 py-8 sm:py-12 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-3 px-2 text-2xl font-bold leading-tight text-foreground sm:mb-4 sm:text-3xl md:text-5xl lg:text-6xl">
              Manage your cleaning business without the <span className="text-primary">stress</span>
            </h1>

            <p className="mx-auto mb-5 max-w-2xl px-2 text-base text-muted-foreground sm:mb-6 sm:text-lg md:text-xl">
              100% specialised in cleaning. No features you don't need. No complications you don't
              want.
            </p>

            {/* Benefits list - Scrollable on mobile */}
            <div className="mb-6 flex flex-wrap justify-center gap-2 px-2 sm:mb-8 sm:gap-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
                >
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons - Stacked on mobile */}
            <div className="mb-6 flex flex-col justify-center gap-3 px-4 sm:mb-8 sm:flex-row sm:gap-4 sm:px-0">
              <Button
                size="lg"
                className="group h-12 w-full px-6 text-base shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
                onClick={() => navigate("/signup")}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full px-6 text-base sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
                onClick={() => navigate("/auth")}
              >
                Already have an account
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground sm:flex-row sm:gap-4 sm:text-sm">
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-warning sm:h-4 sm:w-4" />
                <span>Setup in less than 2 minutes</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-warning sm:h-4 sm:w-4" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Banner */}
      <section className="border-y border-border bg-muted/30 py-4 sm:py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground sm:text-base">
            Built specifically for Australian cleaning businesses. Start your 14-day free trial
            today.
          </p>
        </div>
      </section>

      {/* Features Section - Mobile Grid */}
      <section className="bg-card py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-3 text-center text-xl font-bold text-foreground sm:mb-4 sm:text-2xl md:text-3xl">
            Everything You Need for Your Business
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-center text-sm text-muted-foreground sm:mb-10 sm:text-base">
            100% specialised in cleaning. No features you don't need. No complications you don't
            want.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group border-border p-4 transition-all hover:border-primary/50 hover:shadow-lg sm:p-6"
              >
                <CardContent className="p-0">
                  <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-110 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-xl`}
                  >
                    <feature.icon className={`h-5 w-5 sm:h-7 sm:w-7 ${feature.color}`} />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-foreground sm:mb-2 sm:text-lg">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground sm:text-base">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground md:text-3xl">
            Built for Two Roles
          </h2>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6 transition-shadow hover:shadow-lg md:p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">For Business Owners</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>Full dashboard with analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>Create and schedule jobs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>Manage clients and staff</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>Real-time job tracking</span>
                </li>
              </ul>
            </Card>

            <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent p-6 transition-shadow hover:shadow-lg md:p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary shadow-md">
                <Users className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">For Cleaning Staff</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>Mobile-first interface</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>View assigned jobs for the day</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>One-tap navigation to sites</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span>Upload before/after photos</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Badges - Mobile Optimized */}
      <section className="bg-muted/30 py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row sm:gap-6 md:gap-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              <span className="text-sm font-medium sm:text-base">Made for Australia</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4 text-success sm:h-5 sm:w-5" />
              <span className="text-sm font-medium sm:text-base">Bank-level Security</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="h-4 w-4 text-secondary sm:h-5 sm:w-5" />
              <span className="text-sm font-medium sm:text-base">Works on Any Device</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <Link
            to="/"
            className="mb-4 flex items-center justify-center transition-opacity hover:opacity-80"
          >
            <PulcrixLogo variant="full" size="sm" />
          </Link>
          <p className="mb-4 text-sm text-muted-foreground">Clean Living. Pure Solutions.</p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pulcrix. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
