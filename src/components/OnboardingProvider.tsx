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
import { t } from "@/lib/i18n";

interface OnboardingStep {
  icon: React.ElementType;
  titleKey: string;
  descriptionKey: string;
  detailKeys: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: Sparkles,
    titleKey: "welcomeToCleanFlow",
    descriptionKey: "yourProfessionalPlatform",
    detailKeys: [
      "onboardingDetail1",
      "onboardingDetail2",
      "onboardingDetail3",
    ],
  },
  {
    icon: ClipboardList,
    titleKey: "jobManagement",
    descriptionKey: "jobManagementDesc",
    detailKeys: [
      "jobManagementDetail1",
      "jobManagementDetail2",
      "jobManagementDetail3",
    ],
  },
  {
    icon: Users,
    titleKey: "clientsAndProperties",
    descriptionKey: "clientsAndPropertiesDesc",
    detailKeys: [
      "clientsDetail1",
      "clientsDetail2",
      "clientsDetail3",
    ],
  },
  {
    icon: MapPin,
    titleKey: "geofencingControl",
    descriptionKey: "geofencingDesc",
    detailKeys: [
      "geofencingDetail1",
      "geofencingDetail2",
      "geofencingDetail3",
    ],
  },
  {
    icon: Calendar,
    titleKey: "calendarRecurrence",
    descriptionKey: "calendarDesc",
    detailKeys: [
      "calendarDetail1",
      "calendarDetail2",
      "calendarDetail3",
    ],
  },
  {
    icon: BarChart3,
    titleKey: "reportsMetrics",
    descriptionKey: "reportsDesc",
    detailKeys: [
      "reportsDetail1",
      "reportsDetail2",
      "reportsDetail3",
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
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setHasCompletedOnboarding(false);
      // Delay showing onboarding to let page load
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

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
                <DialogTitle className="text-left">{t(step.titleKey as any)}</DialogTitle>
                <DialogDescription className="text-left">
                  {t(step.descriptionKey as any)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-1" />
            
            <div className="space-y-3">
              {step.detailKeys.map((detailKey, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{t(detailKey as any)}</p>
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
              {t("previous")}
            </Button>
            <Button onClick={nextStep} className="flex-1">
              {isLastStep ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("letsStart")}
                </>
              ) : (
                <>
                  {t("next")}
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
