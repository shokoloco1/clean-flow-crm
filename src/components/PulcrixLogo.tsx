import { cn } from "@/lib/utils";

interface PulcrixLogoProps {
  variant?: "full" | "icon" | "wordmark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { icon: 24, text: "text-sm", gap: "gap-1.5" },
  md: { icon: 32, text: "text-lg", gap: "gap-2" },
  lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
};

function PulcrixIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="20" cy="20" r="6" fill="currentColor" />
    </svg>
  );
}

export function PulcrixLogo({ variant = "full", size = "md", className }: PulcrixLogoProps) {
  const config = sizeConfig[size];

  if (variant === "icon") {
    return <PulcrixIcon size={config.icon} className={className} />;
  }

  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          "font-bold tracking-wider",
          config.text,
          className
        )}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        PULCRIX
      </span>
    );
  }

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <PulcrixIcon size={config.icon} className="text-primary" />
      <span
        className={cn("font-bold tracking-wider text-foreground", config.text)}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        PULCRIX
      </span>
    </div>
  );
}
