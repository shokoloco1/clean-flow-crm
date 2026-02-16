import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FloatingActionButton({
  onClick,
  label = "New Job",
  className,
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed z-50 shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40",
        "h-14 gap-2 rounded-full px-5",
        // Position: bottom-right, accounting for mobile bottom nav
        // Hidden on mobile (< 768px) - use header button instead
        "bottom-8 right-8 hidden md:flex",
        className,
      )}
    >
      <Plus className="h-5 w-5" />
      <span className="font-semibold">{label}</span>
    </Button>
  );
}
