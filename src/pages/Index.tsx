import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, ClipboardCheck, Camera, MapPin, Building2, ArrowRight, CheckCircle, Star, Zap, Lock } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { t } = useTranslation(['landing', 'common']);

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
      title: t('landing:features.jobManagement.title'),
      description: t('landing:features.jobManagement.description'),
      color: "text-primary"
    },
    {
      icon: Camera,
      title: t('landing:features.proofOfWork.title'),
      description: t('landing:features.proofOfWork.description'),
      color: "text-success"
    },
    {
      icon: MapPin,
      title: t('landing:features.locationTracking.title'),
      description: t('landing:features.locationTracking.description'),
      color: "text-warning"
    },
    {
      icon: Users,
      title: t('landing:features.teamCoordination.title'),
      description: t('landing:features.teamCoordination.description'),
      color: "text-secondary"
    }
  ];

  const benefits = [
    t('landing:benefits.setupIn3Clicks'),
    t('landing:benefits.madeForAustralia'),
    t('landing:benefits.gstAbnReady'),
    t('landing:benefits.mobileFirstDesign')
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <PulcrixLogo variant="full" size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pricing")}
            >
              {t('common:nav.pricing')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              {t('landing:cta.signIn')}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/signup")}
            >
              {t('landing:cta.startTrial')}
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
              {t('landing:hero.title')} <span className="text-primary">{t('landing:hero.titleHighlight')}</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              {t('landing:hero.subtitle')}
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
                onClick={() => navigate("/signup")}
              >
                {t('landing:cta.startTrial')}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg"
                onClick={() => navigate("/auth")}
              >
                {t('landing:cta.alreadyHaveAccount')}
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 text-muted-foreground text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-warning" />
                <span>{t('landing:trust.setupTime')}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-warning" />
                <span>{t('landing:trust.noCreditCard')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Banner */}
      <section className="py-6 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground">
            {t('landing:trust.builtForAustralia')}
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            {t('landing:features.sectionTitle')}
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            {t('landing:features.sectionSubtitle')}
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
            {t('landing:roles.sectionTitle')}
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 md:p-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg transition-shadow">
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-6 shadow-md">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{t('landing:roles.businessOwners.title')}</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.businessOwners.feature1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.businessOwners.feature2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.businessOwners.feature3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.businessOwners.feature4')}</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 md:p-8 border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent hover:shadow-lg transition-shadow">
              <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center mb-6 shadow-md">
                <Users className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{t('landing:roles.cleaningStaff.title')}</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.cleaningStaff.feature1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.cleaningStaff.feature2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.cleaningStaff.feature3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span>{t('landing:roles.cleaningStaff.feature4')}</span>
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
              <span className="font-medium">{t('landing:badges.madeForAustralia')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5 text-success" />
              <span className="font-medium">{t('landing:badges.bankLevelSecurity')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="h-5 w-5 text-secondary" />
              <span className="font-medium">{t('landing:badges.worksOnAnyDevice')}</span>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <Link to="/" className="flex items-center justify-center mb-4 hover:opacity-80 transition-opacity">
            <PulcrixLogo variant="full" size="sm" />
          </Link>
          <p className="text-sm text-muted-foreground mb-4">
            {t('common:tagline')}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              {t('common:footer.termsOfService')}
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {t('common:footer.privacyPolicy')}
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} Pulcrix. {t('common:footer.allRightsReserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}
