import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickStatusButtonProps {
  currentStatus: string;
  isUpdating: boolean;
  onAdvance: () => void;
  size?: "sm" | "default";
  className?: string;
}

export function QuickStatusButton({
  currentStatus,
  isUpdating,
  onAdvance,
  size = "sm",
  className,
}: QuickStatusButtonProps) {
  const getButtonConfig = () => {
    switch (currentStatus) {
      case "scheduled":
      case "pending":
        return {
          label: "Start",
          icon: Play,
          className: "bg-blue-500 hover:bg-blue-600 text-white",
        };
      case "in_progress":
        return {
          label: "Complete",
          icon: CheckCircle,
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
      default:
        return null;
    }
  };

  const config = getButtonConfig();

  if (!config) return null;

  const Icon = config.icon;

  return (
    <Button
      size={size}
      className={cn(config.className, className)}
      onClick={(e) => {
        e.stopPropagation();
        onAdvance();
      }}
      disabled={isUpdating}
    >
      {isUpdating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Icon className="mr-1 h-4 w-4" />
          {config.label}
        </>
      )}
    </Button>
  );
}

// Compact version for kanban cards
export function QuickStatusChip({
  currentStatus,
  isUpdating,
  onAdvance,
}: Omit<QuickStatusButtonProps, "size" | "className">) {
  if (currentStatus === "completed" || currentStatus === "cancelled") {
    return null;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAdvance();
      }}
      disabled={isUpdating}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all",
        "hover:scale-105 active:scale-95",
        currentStatus === "in_progress"
          ? "bg-green-500 text-white hover:bg-green-600"
          : "bg-blue-500 text-white hover:bg-blue-600",
        isUpdating && "cursor-not-allowed opacity-50",
      )}
    >
      {isUpdating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          <ArrowRight className="h-3 w-3" />
          {currentStatus === "in_progress" ? "Done" : "Start"}
        </>
      )}
    </button>
  );
}
