import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Briefcase, UserPlus, ChevronRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface EmptyStateOnboardingProps {
  onCreateJob: () => void;
  hasClients?: boolean;
  hasJobs?: boolean;
  hasStaff?: boolean;
}

export function EmptyStateOnboarding({
  onCreateJob,
  hasClients = false,
  hasJobs = false,
  hasStaff = false,
}: EmptyStateOnboardingProps) {
  const navigate = useNavigate();
  const { tAdmin } = useLanguage();

  const completedSteps = [hasClients, hasJobs, hasStaff].filter(Boolean).length;
  const progressPercent = (completedSteps / 3) * 100;

  const steps = [
    {
      id: 1,
      title: tAdmin("add_your_first_client"),
      icon: Users,
      completed: hasClients,
      action: () => navigate("/admin/clients"),
    },
    {
      id: 2,
      title: tAdmin("create_a_job"),
      icon: Briefcase,
      completed: hasJobs,
      action: onCreateJob,
    },
    {
      id: 3,
      title: tAdmin("invite_team_member"),
      icon: UserPlus,
      completed: hasStaff,
      action: () => navigate("/admin/staff"),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
          {tAdmin("welcome_to_pulcrix")}
        </h2>
        <p className="text-lg text-muted-foreground">{tAdmin("lets_get_started")}</p>
      </div>

      {/* Progress */}
      <div className="mb-8 w-full max-w-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{tAdmin("setup_progress")}</span>
          <span className="text-sm font-medium text-foreground">
            {completedSteps}/3 {tAdmin("completed")}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Steps Cards */}
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <Card
            key={step.id}
            className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
              step.completed ? "border-primary/30 bg-primary/5" : ""
            }`}
            onClick={step.action}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                    step.completed ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 font-semibold text-foreground">{step.title}</h3>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant={step.completed ? "outline" : "default"}
                  size="sm"
                  className="w-full gap-2"
                >
                  {step.completed ? tAdmin("completed") : tAdmin("next")}
                  {!step.completed && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
