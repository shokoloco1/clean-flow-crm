import { formatAUD, GST_RATE, calculateGST } from "@/lib/australian";

interface GSTSummaryProps {
  subtotal: number;
  showExGST?: boolean;
  className?: string;
}

/**
 * Displays a proper Australian GST breakdown
 * Shows: Subtotal (Ex. GST), GST (10%), Total (Inc. GST)
 */
export function GSTSummary({ subtotal, showExGST = true, className = "" }: GSTSummaryProps) {
  const { gst, total } = calculateGST(subtotal);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal {showExGST && <span className="text-xs">(Ex. GST)</span>}
        </span>
        <span>{formatAUD(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          GST ({GST_RATE * 100}%)
        </span>
        <span>{formatAUD(gst)}</span>
      </div>
      <div className="flex justify-between text-lg font-bold border-t pt-2">
        <span>
          Total <span className="text-sm font-normal text-muted-foreground">(Inc. GST)</span>
        </span>
        <span>{formatAUD(total)}</span>
      </div>
    </div>
  );
}

/**
 * Compact GST display for inline use
 */
export function GSTBadge({ 
  amount, 
  isIncGST = true,
  className = "" 
}: { 
  amount: number; 
  isIncGST?: boolean;
  className?: string;
}) {
  return (
    <span className={`text-xs text-muted-foreground ${className}`}>
      {formatAUD(amount)} {isIncGST ? "Inc. GST" : "Ex. GST"}
    </span>
  );
}
