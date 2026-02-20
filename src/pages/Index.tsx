import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  BarChart3,
  Globe,
  X,
  CheckCheck,
  TrendingUp,
  Smartphone,
} from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { cn } from "@/lib/utils";

// ─── Translations ─────────────────────────────────────────────────────────────
const copy = {
  en: {
    nav: { pricing: "Pricing", signin: "Sign In", trial: "Start Free Trial", trialShort: "Start Trial" },
    hero: {
      badge: "Built for Australian Cleaning Businesses",
      h1a: "Manage your cleaning business",
      h1b: "without the stress",
      sub: "100% specialised in cleaning. No features you don't need. No complications you don't want.",
      cta1: "Start Free Trial",
      cta2: "Already have an account",
      trust1: "Setup in less than 2 minutes",
      trust2: "No credit card required",
    },
    stats: { jobs: "Jobs Managed", satisfaction: "Client Satisfaction", time: "Time Saved / Week", businesses: "Active Businesses" },
    pain: {
      title: "Sound familiar?",
      sub: "Cleaning businesses waste hours every week on admin that should be automatic.",
      pains: ["Chasing staff via WhatsApp", "Losing track of invoices", "No proof of work done", "Scheduling conflicts every week"],
      sol: "Pulcrix fixes all of this — in one app, built for cleaning.",
      solCta: "See how it works",
    },
    features: {
      title: "Everything Your Business Needs",
      sub: "Four powerful modules, one clean interface.",
      tabs: ["Jobs", "Staff", "Invoices", "Reports"],
    },
    roles: {
      title: "Built for Two Roles",
      ownerTitle: "For Business Owners",
      ownerItems: ["Full dashboard with analytics", "Create and schedule jobs", "Manage clients and staff", "Real-time job tracking"],
      staffTitle: "For Cleaning Staff",
      staffItems: ["Mobile-first interface", "View assigned jobs for the day", "One-tap navigation to sites", "Upload before/after photos"],
    },
    testimonials: {
      title: "Trusted by cleaning businesses across Australia",
    },
    pricing: {
      title: "Simple, Transparent Pricing",
      sub: "Start free, upgrade when you're ready.",
      popular: "Most Popular",
      mo: "/mo",
      cta: "Get Started",
      ctaPro: "Start Free Trial",
    },
    footer: { tagline: "Clean Living. Pure Solutions.", terms: "Terms of Service", privacy: "Privacy Policy" },
  },
  es: {
    nav: { pricing: "Precios", signin: "Iniciar Sesión", trial: "Prueba Gratuita", trialShort: "Probar Gratis" },
    hero: {
      badge: "Para empresas de limpieza en Australia",
      h1a: "Gestiona tu empresa de limpieza",
      h1b: "sin el estrés",
      sub: "100% especializado en limpieza. Sin funciones que no necesitas. Sin complicaciones.",
      cta1: "Prueba Gratuita",
      cta2: "Ya tengo una cuenta",
      trust1: "Configuración en menos de 2 minutos",
      trust2: "Sin tarjeta de crédito",
    },
    stats: { jobs: "Trabajos Gestionados", satisfaction: "Satisfacción del Cliente", time: "Tiempo Ahorrado / Semana", businesses: "Empresas Activas" },
    pain: {
      title: "¿Te suena familiar?",
      sub: "Las empresas de limpieza pierden horas cada semana en administración que debería ser automática.",
      pains: ["Persiguiendo al personal por WhatsApp", "Perdiendo facturas y pagos", "Sin prueba del trabajo realizado", "Conflictos de horarios cada semana"],
      sol: "Pulcrix soluciona todo esto — en una app, hecha para limpieza.",
      solCta: "Ver cómo funciona",
    },
    features: {
      title: "Todo lo que Tu Negocio Necesita",
      sub: "Cuatro módulos potentes, una interfaz limpia.",
      tabs: ["Trabajos", "Personal", "Facturas", "Reportes"],
    },
    roles: {
      title: "Diseñado para Dos Roles",
      ownerTitle: "Para Dueños de Negocio",
      ownerItems: ["Dashboard completo con analíticas", "Crear y programar trabajos", "Gestionar clientes y personal", "Seguimiento de trabajos en tiempo real"],
      staffTitle: "Para el Personal de Limpieza",
      staffItems: ["Interfaz optimizada para móvil", "Ver trabajos asignados del día", "Navegación con un toque al sitio", "Subir fotos antes/después"],
    },
    testimonials: {
      title: "Empresas de limpieza confían en Pulcrix en toda Australia",
    },
    pricing: {
      title: "Precios Simples y Transparentes",
      sub: "Comienza gratis, actualiza cuando estés listo.",
      popular: "Más Popular",
      mo: "/mes",
      cta: "Comenzar",
      ctaPro: "Prueba Gratuita",
    },
    footer: { tagline: "Vida Limpia. Soluciones Puras.", terms: "Términos de Servicio", privacy: "Política de Privacidad" },
  },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useScrollY() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrolled;
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("revealed"); obs.unobserve(el); } },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useCounter(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.floor(eased * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return { ref, value };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AnimatedStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { ref, value } = useCounter(target);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-3xl font-bold text-primary sm:text-4xl md:text-5xl">
        {value.toLocaleString()}{suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground sm:text-base">{label}</div>
    </div>
  );
}

function DashboardMockup() {
  const jobs = [
    { client: "Marina Bay Apartments", time: "09:00", status: "completed", staff: "Sarah K." },
    { client: "Harbour View Office", time: "11:30", status: "in_progress", staff: "Tim V." },
    { client: "Bondi Beach House", time: "14:00", status: "pending", staff: "Emma R." },
  ];
  const statusConfig = {
    completed: { label: "Completed", cls: "bg-success/10 text-success border-success/20" },
    in_progress: { label: "In Progress", cls: "bg-warning/10 text-warning border-warning/20" },
    pending: { label: "Scheduled", cls: "bg-info/10 text-info border-info/20" },
  };
  return (
    <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
      {/* Mock header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-2 text-xs text-muted-foreground">Pulcrix Dashboard</span>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-0 border-b border-border">
        {[["12", "Today's Jobs"], ["$2,840", "Revenue"], ["98%", "On Time"]].map(([v, l]) => (
          <div key={l} className="border-r border-border p-3 last:border-0 text-center">
            <div className="text-sm font-bold text-foreground">{v}</div>
            <div className="text-[10px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      {/* Job list */}
      <div className="divide-y divide-border">
        {jobs.map((job) => {
          const cfg = statusConfig[job.status as keyof typeof statusConfig];
          return (
            <div key={job.client} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-foreground">{job.client}</div>
                <div className="text-[10px] text-muted-foreground">{job.time} · {job.staff}</div>
              </div>
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.cls)}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="border-t border-border px-4 py-3">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Daily Progress</span><span>8/12 jobs</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary transition-all" />
        </div>
      </div>
    </div>
  );
}

function FeatureTabs({ lang }: { lang: "en" | "es" }) {
  const [active, setActive] = useState(0);
  const tabs = [
    {
      icon: ClipboardCheck,
      title: lang === "en" ? "Jobs" : "Trabajos",
      desc: lang === "en"
        ? "Schedule, assign and track every cleaning job from creation to completion."
        : "Programa, asigna y rastrea cada trabajo de limpieza desde la creación hasta la finalización.",
      points: lang === "en"
        ? ["Drag-and-drop scheduler", "Recurring job templates", "Real-time status updates", "GPS location linking"]
        : ["Planificador drag-and-drop", "Plantillas de trabajos recurrentes", "Actualizaciones de estado en tiempo real", "Enlace de ubicación GPS"],
    },
    {
      icon: Users,
      title: lang === "en" ? "Staff" : "Personal",
      desc: lang === "en"
        ? "Manage your team's availability, performance, and payroll in one place."
        : "Gestiona la disponibilidad, el rendimiento y la nómina de tu equipo en un solo lugar.",
      points: lang === "en"
        ? ["Availability calendar", "Performance metrics", "Photo proof of work", "Mobile staff app"]
        : ["Calendario de disponibilidad", "Métricas de rendimiento", "Prueba fotográfica del trabajo", "App móvil para personal"],
    },
    {
      icon: FileText,
      title: lang === "en" ? "Invoices" : "Facturas",
      desc: lang === "en"
        ? "Generate GST-compliant invoices in seconds and track payments automatically."
        : "Genera facturas conformes a GST en segundos y rastrea los pagos automáticamente.",
      points: lang === "en"
        ? ["One-click invoice creation", "GST & ABN ready", "Automated reminders", "Xero export"]
        : ["Creación de facturas con un clic", "GST y ABN incluidos", "Recordatorios automáticos", "Exportación a Xero"],
    },
    {
      icon: BarChart3,
      title: lang === "en" ? "Reports" : "Reportes",
      desc: lang === "en"
        ? "Data-driven insights to grow your cleaning business with confidence."
        : "Análisis basados en datos para hacer crecer tu empresa de limpieza con confianza.",
      points: lang === "en"
        ? ["Revenue analytics", "Staff performance reports", "Client satisfaction scores", "CSV & PDF export"]
        : ["Análisis de ingresos", "Reportes de rendimiento del personal", "Puntuaciones de satisfacción del cliente", "Exportación CSV y PDF"],
    },
  ];

  const TabIcon = tabs[active].icon;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Tab buttons */}
      <div className="mb-8 flex justify-center gap-2 overflow-x-auto pb-2">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
                active === i
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.title}
            </button>
          );
        })}
      </div>
      {/* Tab content */}
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <TabIcon className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-display mb-3 text-2xl font-bold text-foreground">{tabs[active].title}</h3>
          <p className="mb-5 text-muted-foreground">{tabs[active].desc}</p>
          <ul className="space-y-2.5">
            {tabs[active].points.map((pt) => (
              <li key={pt} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center">
          <DashboardMockup />
        </div>
      </div>
    </div>
  );
}

const testimonials = [
  { name: "Jessica M.", company: "Sparkle Clean Co.", text: "We went from spending 3 hours on admin to under 30 minutes. Game changer for our team.", rating: 5 },
  { name: "Carlos R.", company: "Elite Cleaning Services", text: "The before/after photos feature alone saved us from two dispute situations with clients.", rating: 5 },
  { name: "Priya S.", company: "Fresh Start Cleaning", text: "GST invoices in seconds. My accountant is very happy. I'm very happy. Setup was easy.", rating: 5 },
];

const pricingPlans = [
  { name: "Starter", price: 49, mo: "month", features: ["Up to 2 staff", "50 jobs/month", "Basic invoicing", "Email support"], featured: false },
  { name: "Professional", price: 89, mo: "month", features: ["Up to 10 staff", "Unlimited jobs", "GST invoicing + Xero", "Photo documentation", "Reports & analytics", "Priority support"], featured: true },
  { name: "Enterprise", price: 149, mo: "month", features: ["Unlimited staff", "Unlimited jobs", "All Pro features", "Custom branding", "Dedicated account manager", "API access"], featured: false },
];

const marqueeItems = [
  { icon: ClipboardCheck, label: "Job Scheduling" },
  { icon: Camera, label: "Photo Proof" },
  { icon: FileText, label: "GST Invoicing" },
  { icon: Users, label: "Staff Management" },
  { icon: BarChart3, label: "Analytics" },
  { icon: MapPin, label: "GPS Navigation" },
  { icon: Lock, label: "Secure Data" },
  { icon: Smartphone, label: "Mobile First" },
  { icon: TrendingUp, label: "Growth Tools" },
  { icon: CheckCheck, label: "Audit Trail" },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const scrolled = useScrollY();

  const c = copy[language as "en" | "es"] ?? copy.en;
  const lang = language as "en" | "es";

  useEffect(() => {
    if (!loading && user && role) {
      if (role === "admin") navigate("/admin");
      else navigate("/staff");
    }
  }, [user, role, loading, navigate]);

  // Scroll reveal refs
  const revealStats = useScrollReveal();
  const revealPain = useScrollReveal();
  const revealFeatures = useScrollReveal();
  const revealRoles = useScrollReveal();
  const revealTestimonials = useScrollReveal();
  const revealPricing = useScrollReveal();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Nav ── */}
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-border bg-background/95 shadow-sm backdrop-blur-md"
            : "bg-transparent"
        )}
      >
        <div className="safe-area-inset-top container mx-auto flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4">
          <Link to="/" className="shrink-0 transition-opacity hover:opacity-80">
            <PulcrixLogo variant="icon" size="sm" className="sm:hidden" />
            <PulcrixLogo variant="full" size="sm" className="hidden sm:block" />
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>{c.nav.pricing}</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>{c.nav.signin}</Button>
            <Button size="sm" onClick={() => navigate("/signup")}>{c.nav.trial}</Button>
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            <Button variant="ghost" size="sm" className="h-9 px-2 text-sm" onClick={() => navigate("/auth")}>{c.nav.signin}</Button>
            <Button size="sm" className="h-9 px-3 text-sm" onClick={() => navigate("/signup")}>{c.nav.trialShort}</Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden pt-14 sm:pt-16">
        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle fill='%230D9488' cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E\")" }}
        />

        {/* Animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob-float absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" style={{ animationDelay: "0s" }} />
          <div className="animate-blob-float absolute -right-20 top-10 h-80 w-80 rounded-full bg-amber/10 blur-3xl" style={{ animationDelay: "3s" }} />
          <div className="animate-blob-float absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" style={{ animationDelay: "1.5s" }} />
        </div>

        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary)/0.08) 0%, transparent 70%)" }} />

        <div className="container relative mx-auto px-4 py-10 sm:py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
            {/* Copy */}
            <div className="text-center md:text-left">
              <Badge className="mb-4 inline-flex" variant="secondary">
                <MapPin className="mr-1 h-3 w-3" />
                {c.hero.badge}
              </Badge>

              <h1 className="font-display mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                {c.hero.h1a}{" "}
                <span className="text-primary">{c.hero.h1b}</span>
              </h1>

              <p className="mx-auto mb-6 max-w-lg text-base text-muted-foreground sm:text-lg md:mx-0">
                {c.hero.sub}
              </p>

              <div className="mb-6 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                <Button
                  size="lg"
                  className="group h-12 w-full px-6 text-base shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 sm:h-14 sm:w-auto sm:px-8"
                  onClick={() => navigate("/signup")}
                >
                  {c.hero.cta1}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full px-6 text-base sm:h-14 sm:w-auto sm:px-8"
                  onClick={() => navigate("/auth")}
                >
                  {c.hero.cta2}
                </Button>
              </div>

              <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground sm:flex-row sm:gap-4 sm:text-sm md:justify-start">
                <div className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-warning" />
                  <span>{c.hero.trust1}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-warning" />
                  <span>{c.hero.trust2}</span>
                </div>
              </div>
            </div>

            {/* Dashboard mockup + floating cards */}
            <div className="relative hidden md:block">
              <DashboardMockup />

              {/* Floating notification cards */}
              <div className="animate-float-card absolute -right-4 top-8 z-10 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">Job #234 completed</div>
                  <div className="text-[10px] text-muted-foreground">Marina Bay · just now</div>
                </div>
              </div>

              <div className="animate-float-card-delayed absolute -left-8 bottom-12 z-10 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">Invoice sent · $480</div>
                  <div className="text-[10px] text-muted-foreground">Harbour View · 2m ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Marquee ── */}
      <section className="overflow-hidden border-y border-border bg-muted/30 py-4">
        <div className="flex w-max animate-marquee items-center gap-8">
          {[...marqueeItems, ...marqueeItems].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {item.label}
                <span className="ml-4 text-border">|</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 md:py-16">
        <div ref={revealStats} className="scroll-reveal container mx-auto px-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            <AnimatedStat target={12400} suffix="+" label={c.stats.jobs} />
            <AnimatedStat target={98} suffix="%" label={c.stats.satisfaction} />
            <AnimatedStat target={8} suffix="h" label={c.stats.time} />
            <AnimatedStat target={340} suffix="+" label={c.stats.businesses} />
          </div>
        </div>
      </section>

      {/* ── Pain → Solution ── */}
      <section className="bg-muted/20 py-12 md:py-16">
        <div ref={revealPain} className="scroll-reveal container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h2 className="font-display mb-3 text-2xl font-bold text-foreground sm:text-3xl">{c.pain.title}</h2>
              <p className="text-muted-foreground">{c.pain.sub}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pain */}
              <Card className="border-destructive/20 bg-destructive/5 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <X className="h-5 w-5 text-destructive" />
                  <span className="font-semibold text-destructive">{lang === "en" ? "Without Pulcrix" : "Sin Pulcrix"}</span>
                </div>
                <ul className="space-y-3">
                  {c.pain.pains.map((pain) => (
                    <li key={pain} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <X className="h-4 w-4 shrink-0 text-destructive/60" />
                      <span className="line-through">{pain}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              {/* Solution */}
              <Card className="border-success/20 bg-success/5 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCheck className="h-5 w-5 text-success" />
                  <span className="font-semibold text-success">{lang === "en" ? "With Pulcrix" : "Con Pulcrix"}</span>
                </div>
                <ul className="space-y-3">
                  {c.pain.pains.map((pain) => (
                    <li key={pain} className="flex items-center gap-2.5 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                      <span>{lang === "en"
                        ? pain.replace("Chasing staff via WhatsApp", "Automated staff notifications")
                            .replace("Losing track of invoices", "Invoices tracked automatically")
                            .replace("No proof of work done", "Photo proof on every job")
                            .replace("Scheduling conflicts every week", "Smart conflict-free scheduling")
                        : pain.replace("Persiguiendo al personal por WhatsApp", "Notificaciones automáticas al personal")
                            .replace("Perdiendo facturas y pagos", "Facturas rastreadas automáticamente")
                            .replace("Sin prueba del trabajo realizado", "Prueba fotográfica en cada trabajo")
                            .replace("Conflictos de horarios cada semana", "Programación inteligente sin conflictos")
                      }</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <div className="mt-6 text-center">
              <Button size="lg" onClick={() => navigate("/signup")} className="gap-2">
                {c.pain.solCta} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Tabs ── */}
      <section className="bg-card py-12 md:py-16">
        <div ref={revealFeatures} className="scroll-reveal container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="font-display mb-3 text-2xl font-bold text-foreground sm:text-3xl">{c.features.title}</h2>
            <p className="text-muted-foreground">{c.features.sub}</p>
          </div>
          <FeatureTabs lang={lang} />
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="py-12 md:py-16">
        <div ref={revealRoles} className="scroll-reveal container mx-auto px-4">
          <h2 className="font-display mb-8 text-center text-2xl font-bold text-foreground md:text-3xl">{c.roles.title}</h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Card className="group card-hover border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6 md:p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">{c.roles.ownerTitle}</h3>
              <ul className="space-y-3 text-muted-foreground">
                {c.roles.ownerItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="group card-hover border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent p-6 md:p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary shadow-md">
                <Users className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">{c.roles.staffTitle}</h3>
              <ul className="space-y-3 text-muted-foreground">
                {c.roles.staffItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="mt-8 text-center">
            <Button size="lg" onClick={() => navigate("/signup")} className="gap-2">
              {c.hero.cta1} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-muted/20 py-12 md:py-16">
        <div ref={revealTestimonials} className="scroll-reveal container mx-auto px-4">
          <h2 className="font-display mb-8 text-center text-2xl font-bold text-foreground">{c.testimonials.title}</h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="card-hover border-border bg-card p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="mb-4 text-sm text-muted-foreground">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.company}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-12 md:py-16">
        <div ref={revealPricing} className="scroll-reveal container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="font-display mb-3 text-2xl font-bold text-foreground sm:text-3xl">{c.pricing.title}</h2>
            <p className="text-muted-foreground">{c.pricing.sub}</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3 md:items-center">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative border p-6 transition-all",
                  plan.featured
                    ? "scale-105 border-primary/50 shadow-xl shadow-primary/10"
                    : "border-border card-hover"
                )}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-md">{c.pricing.popular}</Badge>
                  </div>
                )}
                <CardContent className="p-0">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-sm text-muted-foreground">{c.pricing.mo}</span>
                    </div>
                  </div>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.featured ? "default" : "outline"}
                    onClick={() => navigate("/signup")}
                  >
                    {plan.featured ? c.pricing.ctaPro : c.pricing.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border bg-gradient-to-br from-primary/5 to-transparent py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            {lang === "en" ? "Ready to grow your cleaning business?" : "¿Listo para hacer crecer tu empresa de limpieza?"}
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            {lang === "en"
              ? "Join hundreds of Australian cleaning businesses. Start your 14-day free trial today."
              : "Únete a cientos de empresas de limpieza en Australia. Comienza tu prueba gratuita de 14 días hoy."}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="group h-12 gap-2 px-8 shadow-lg shadow-primary/30" onClick={() => navigate("/signup")}>
              {c.hero.cta1}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate("/pricing")}>{c.nav.pricing} →</Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Link to="/" className="flex items-center transition-opacity hover:opacity-80">
              <PulcrixLogo variant="full" size="sm" />
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <Link to="/terms" className="transition-colors hover:text-foreground">{c.footer.terms}</Link>
              <span>•</span>
              <Link to="/privacy" className="transition-colors hover:text-foreground">{c.footer.privacy}</Link>
              <span>•</span>
              {/* Language toggle */}
              <button
                onClick={() => setLanguage(language === "en" ? "es" : "en")}
                className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:border-primary hover:text-foreground"
              >
                <Globe className="h-3 w-3" />
                {language === "en" ? "ES" : "EN"}
              </button>
            </div>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <p>{c.footer.tagline}</p>
            <p className="mt-1">© {new Date().getFullYear()} Pulcrix. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
