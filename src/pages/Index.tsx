import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Shield, Users, ClipboardCheck, Camera, MapPin, Building2, ArrowRight, CheckCircle, Star, Zap, Lock } from "lucide-react";

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
      color: "text-primary"
    },
    {
      icon: Camera,
      title: "Proof of Work",
      description: "Capture before & after photos for accountability",
      color: "text-success"
    },
    {
      icon: MapPin,
      title: "Location Tracking",
      description: "One-tap navigation to job site",
      color: "text-warning"
    },
    {
      icon: Users,
      title: "Team Coordination",
      description: "Assign jobs and monitor staff performance",
      color: "text-secondary"
    }
  ];

  const benefits = [
    "Setup in 3 clicks",
    "Made for Australia",
    "GST & ABN ready",
    "Mobile-first design"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">CleanFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/pricing")}
            >
              Pricing
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20" />
        
        <div className="relative container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              Manage your cleaning business without the <span className="text-primary">stress</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              100% specialised in cleaning. No features you don't need. No complications you don't want.
            </p>

            {/* Benefits list */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="h-14 px-8 text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all group"
                onClick={() => navigate("/auth")}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-lg"
                onClick={() => navigate("/auth")}
              >
                Already have an account
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 text-muted-foreground text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-warning" />
                <span>Setup in less than 2 minutes</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-warning" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Banner */}
      <section className="py-6 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground">
            Built specifically for Australian cleaning businesses. Start your 14-day free trial today.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            Everything You Need for Your Business
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            100% specialised in cleaning. No features you don't need. No complications you don't want.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group p-6 border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
              >
                <CardContent className="p-0">
                  <div className={`h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
            Built for Two Roles
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 md:p-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg transition-shadow">
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-6 shadow-md">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">For Business Owners</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Full dashboard with analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Create and schedule jobs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Manage clients and staff</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Real-time job tracking</span>
                </li>
              </ul>
            </Card>
            
            <Card className="p-6 md:p-8 border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent hover:shadow-lg transition-shadow">
              <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center mb-6 shadow-md">
                <Users className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">For Cleaning Staff</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Mobile-first interface</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>View assigned jobs for the day</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>One-tap navigation to sites</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>Upload before/after photos</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="font-medium">Made for Australia</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5 text-success" />
              <span className="font-medium">Bank-level Security</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="h-5 w-5 text-secondary" />
              <span className="font-medium">Works on Any Device</span>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">CleanFlow</span>
          </Link>
          <p className="text-sm text-muted-foreground mb-4">
            Streamline your cleaning business operations
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} CleanFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}