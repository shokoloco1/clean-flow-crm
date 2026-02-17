import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface StaffAvailability {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS_OF_WEEK = [
  { short: "Sun", full: "Sunday" },
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
];

interface StaffAvailabilityEditorProps {
  staffUserId: string;
}

export function StaffAvailabilityEditor({ staffUserId }: StaffAvailabilityEditorProps) {
  const queryClient = useQueryClient();

  const { data: availability } = useQuery<StaffAvailability[]>({
    queryKey: ["staff-availability", staffUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_availability")
        .select("*")
        .eq("user_id", staffUserId)
        .order("day_of_week");
      if (error) throw error;
      return data as StaffAvailability[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (avail: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }) => {
      const { error } = await supabase.from("staff_availability").upsert(
        [
          {
            user_id: staffUserId,
            day_of_week: avail.day_of_week,
            start_time: avail.start_time,
            end_time: avail.end_time,
            is_available: avail.is_available,
          },
        ],
        { onConflict: "user_id,day_of_week" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-availability", staffUserId] });
    },
  });

  const getAvailabilityForDay = (dayIndex: number) => {
    return availability?.find((a) => a.day_of_week === dayIndex);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure the weekly availability schedule for this employee.
      </p>

      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day, index) => {
          const avail = getAvailabilityForDay(index);
          const isAvailable = avail?.is_available ?? (index >= 1 && index <= 5);

          return (
            <Card key={day.full} className={!isAvailable ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Switch
                      checked={isAvailable}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate({
                          day_of_week: index,
                          start_time: avail?.start_time || "08:00",
                          end_time: avail?.end_time || "17:00",
                          is_available: checked,
                        });
                      }}
                    />
                    <div>
                      <span className="font-medium">{day.full}</span>
                      {!isAvailable && (
                        <p className="text-xs text-muted-foreground">Not available</p>
                      )}
                    </div>
                  </div>

                  {isAvailable && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        className="w-24 text-sm"
                        value={avail?.start_time || "08:00"}
                        onChange={(e) => {
                          updateMutation.mutate({
                            day_of_week: index,
                            start_time: e.target.value,
                            end_time: avail?.end_time || "17:00",
                            is_available: true,
                          });
                        }}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        className="w-24 text-sm"
                        value={avail?.end_time || "17:00"}
                        onChange={(e) => {
                          updateMutation.mutate({
                            day_of_week: index,
                            start_time: avail?.start_time || "08:00",
                            end_time: e.target.value,
                            is_available: true,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
