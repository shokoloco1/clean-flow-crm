import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ClipboardList,
  Users,
  MapPin,
  Calendar,
  BarChart3,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: string;
  details: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "Welcome to CleanFlow!",
    description: "Your professional cleaning management platform",
    details: [
      "Manage all your cleaning jobs in one place",
      "Track your team's performance in real-time",
      "Generate professional reports for your clients",
    ],
  },
  {
    icon: ClipboardList,
    title: "Job Management",
    description: "Schedule and track jobs easily",
    details: [
      "Create jobs with custom checklists",
      "Assign staff to each job",
      "Real-time progress tracking",
    ],
  },
  {
    icon: Users,
    title: "Clients & Properties",
    description: "Organise your client portfolio",
    details: [
      "Register clients with contact details",
      "Manage multiple properties per client",
      "Exclusive portal for clients to view their history",
    ],
  },
  {
    icon: MapPin,
    title: "Geofencing & Control",
    description: "Automatic location verification",
    details: [
      "GPS-validated check-in/check-out",
      "Automatic alerts for late arrivals",
      "Before and after photo evidence",
    ],
  },
  {
    icon: Calendar,
    title: "Calendar & Recurrence",
    description: "Plan ahead",
    details: [
      "Interactive calendar view",
      "Automatic recurring jobs",
      "Manage staff availability",
    ],
  },
  {
    icon: BarChart3,
    title: "Reports & Metrics",
    description: "Make informed decisions",
    details: [
      "Dashboard with key metrics",
      "Export reports as PDF and CSV",
      "Performance analysis by period",
    ],
  },
];

const ONBOARDING_KEY = "cleanflow_onboarding_completed";

interface OnboardingContextType {
  showOnboarding: () => void;
  hasCompletedOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // Check localStorage synchronously on init to avoid flash
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    }
    return true;
  });

  useEffect(() => {
    // Only show onboarding after a delay if not completed and not already open
    if (!hasCompletedOnboarding && !isOpen) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, isOpen]);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setHasCompletedOnboarding(true);
    setIsOpen(false);
    setCurrentStep(0);
  };

  const showOnboarding = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <OnboardingContext.Provider value={{ showOnboarding, hasCompletedOnboarding }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && completeOnboarding()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-left">{step.title}</DialogTitle>
                <DialogDescription className="text-left">
                  {step.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-1" />
            
            <div className="space-y-3">
              {step.details.map((detail, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{detail}</p>
                </div>
              ))}
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-1.5 pt-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === currentStep
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button onClick={nextStep} className="flex-1">
              {isLastStep ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Let's Start!
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
}