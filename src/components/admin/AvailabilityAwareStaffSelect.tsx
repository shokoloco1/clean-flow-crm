import { useAvailableStaff } from "@/hooks/useStaffAvailability";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityAwareStaffSelectProps {
  date: string;
  time: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function AvailabilityAwareStaffSelect({
  date,
  time,
  value,
  onValueChange,
  placeholder = "Select staff member",
}: AvailabilityAwareStaffSelectProps) {
  const { availableStaff, loading } = useAvailableStaff(date, time);

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading staff...</span>
      </div>
    );
  }

  const selectedStaff = availableStaff.find((s) => s.user_id === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(selectedStaff?.hasConflict && "border-warning text-warning")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableStaff.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No staff members found
            </div>
          ) : (
            availableStaff.map((staff) => (
              <SelectItem
                key={staff.user_id}
                value={staff.user_id}
                className={cn(
                  "flex items-center gap-2",
                  staff.hasConflict && "text-muted-foreground",
                )}
              >
                <div className="flex w-full items-center gap-2">
                  {staff.hasConflict ? (
                    <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />
                  ) : (
                    <CheckCircle className="h-3 w-3 shrink-0 text-primary" />
                  )}
                  <span>{staff.full_name}</span>
                  {staff.hasConflict && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Busy
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedStaff?.hasConflict && (
        <p className="flex items-center gap-1 text-xs text-warning">
          <AlertTriangle className="h-3 w-3" />
          This staff member may have a conflict at this time
        </p>
      )}
    </div>
  );
}
