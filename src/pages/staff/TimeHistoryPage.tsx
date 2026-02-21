import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { usePayRates } from "@/hooks/usePayRates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, parseISO } from "date-fns";
import type { TimeEntryWithDetails } from "@/types/time-tracking";

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default function TimeHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset],
  );
  const currentWeekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart],
  );

  const { entries, totalHours, isLoading } = useTimeEntries({
    staffId: user?.id,
    dateFrom: format(currentWeekStart, "yyyy-MM-dd"),
    dateTo: format(currentWeekEnd, "yyyy-MM-dd"),
  });

  // Group entries by day
  const groupedByDay = useMemo(() => {
    const groups = new Map<string, TimeEntryWithDetails[]>();
    for (const entry of entries) {
      const day = format(parseISO(entry.clock_in), "yyyy-MM-dd");
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(entry);
    }
    // Sort days descending
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  // Rough pay estimate (using first staff rate found or profile rate)
  const { staffWithRates } = usePayRates();
  const myRate = useMemo(() => {
    if (!user?.id) return 30;
    const found = staffWithRates.find((s) => s.user_id === user.id);
    return found?.effectiveRate ?? 30;
  }, [staffWithRates, user?.id]);

  const totalPay = Math.round(totalHours * myRate * 100) / 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="safe-area-inset-top sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{t("my_hours")}</h1>
            <p className="text-xs text-muted-foreground">{t("this_week")}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-24">
        {/* Week navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("previous_week")}
          </Button>
          <span className="text-sm font-medium">
            {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
          >
            {t("next_week")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Clock className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("no_entries_this_week")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedByDay.map(([day, dayEntries]) => {
              const dayMinutes = dayEntries.reduce(
                (sum, e) => sum + (e.billable_minutes ?? e.total_minutes ?? 0),
                0,
              );
              const dayPay = Math.round((dayMinutes / 60) * myRate * 100) / 100;

              return (
                <div key={day}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {format(parseISO(day), "EEEE, MMM d")}
                  </h3>
                  <Card>
                    <CardContent className="divide-y divide-border p-0">
                      {dayEntries.map((entry) => {
                        const mins = entry.billable_minutes ?? entry.total_minutes ?? 0;
                        const entryPay = Math.round((mins / 60) * myRate * 100) / 100;
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {entry.jobs?.clients?.name ?? "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(entry.clock_in).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {entry.clock_out && (
                                  <>
                                    {" → "}
                                    {new Date(entry.clock_out).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </>
                                )}
                                {entry.break_minutes > 0 && (
                                  <span className="ml-2 text-warning">
                                    ({entry.break_minutes}m break)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatMinutes(mins)}</p>
                              <p className="text-xs text-muted-foreground">
                                ${entryPay.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {/* Daily total */}
                      <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("daily_total")}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{formatMinutes(dayMinutes)}</span>
                          <span className="ml-3 text-sm font-semibold text-primary">
                            ${dayPay.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {/* Weekly total */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between py-4">
                <span className="font-semibold">{t("weekly_total")}</span>
                <div className="text-right">
                  <p className="text-lg font-bold">{totalHours.toFixed(1)}h</p>
                  <p className="text-lg font-bold text-primary">${totalPay.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
