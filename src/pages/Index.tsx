import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Users, ClipboardCheck, Camera, MapPin, Building2 } from "lucide-react";
import { t } from "@/lib/i18n";

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
      title: t("jobManagement"),
      description: t("jobManagementDesc")
    },
    {
      icon: Camera,
      title: t("proofOfWork"),
      description: t("proofOfWorkDesc")
    },
    {
      icon: MapPin,
      title: t("locationTracking"),
      description: t("locationTrackingDesc")
    },
    {
      icon: Users,
      title: t("teamCoordination"),
      description: t("teamCoordinationDesc")
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("appName")}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              {t("appDescription")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="h-12 px-8 text-lg"
                onClick={() => navigate("/auth")}
              >
                {t("getStarted")}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-12 px-8 text-lg"
                onClick={() => navigate("/auth")}
              >
                {t("signIn")}
              </Button>
            </div>
            
            {/* Client Portal Link */}
            <div className="mt-8 pt-8 border-t border-border/50">
              <Button 
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/portal")}
              >
                <Building2 className="h-4 w-4 mr-2" />
                {t("clientPortalAccess")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            {t("everythingYouNeed")}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-background border border-border hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{t("forBusinessOwners")}</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• {t("fullDashboardAnalytics")}</li>
                <li>• {t("createScheduleJobs")}</li>
                <li>• {t("manageClientsStaff")}</li>
                <li>• {t("trackJobCompletion")}</li>
              </ul>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{t("forCleaningStaff")}</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• {t("mobileFirstInterface")}</li>
                <li>• {t("viewDailyJobs")}</li>
                <li>• {t("oneTapNavigation")}</li>
                <li>• {t("uploadBeforeAfter")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">{t("appName")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("streamlineOperations")}
          </p>
        </div>
      </footer>
    </div>
  );
}
