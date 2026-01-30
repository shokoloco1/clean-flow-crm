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
  className 
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed z-50 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all",
        "rounded-full h-14 px-5 gap-2",
        // Position: bottom-right, accounting for mobile bottom nav
        "bottom-24 md:bottom-8 right-4 md:right-8",
        className
      )}
    >
      <Plus className="h-5 w-5" />
      <span className="font-semibold">{label}</span>
    </Button>
  );
}
