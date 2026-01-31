import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Briefcase, UserPlus, ChevronRight, CheckCircle2 } from "lucide-react";

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
  hasStaff = false 
}: EmptyStateOnboardingProps) {
  const navigate = useNavigate();
  
  const completedSteps = [hasClients, hasJobs, hasStaff].filter(Boolean).length;
  const progressPercent = (completedSteps / 3) * 100;

  const steps = [
    {
      id: 1,
      title: "Agregar tu primer cliente",
      description: "Registra los datos de tu primer cliente",
      icon: Users,
      completed: hasClients,
      action: () => navigate("/admin/clients"),
    },
    {
      id: 2,
      title: "Crear tu primer trabajo",
      description: "Programa tu primera limpieza",
      icon: Briefcase,
      completed: hasJobs,
      action: onCreateJob,
    },
    {
      id: 3,
      title: "Invitar a tu equipo",
      description: "Añade miembros de tu staff",
      icon: UserPlus,
      completed: hasStaff,
      action: () => navigate("/admin/staff"),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          ¡Bienvenido a CleanFlow! 🎉
        </h2>
        <p className="text-muted-foreground text-lg">
          Configura tu negocio en 3 pasos
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Progreso</span>
          <span className="text-sm font-medium text-foreground">
            {completedSteps}/3 completados
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Steps Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
        {steps.map((step) => (
          <Card
            key={step.id}
            className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
              step.completed ? "border-primary/30 bg-primary/5" : ""
            }`}
            onClick={step.action}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.completed
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {step.description}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant={step.completed ? "outline" : "default"}
                  size="sm"
                  className="w-full gap-2"
                >
                  {step.completed ? "Completado" : "Comenzar"}
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
