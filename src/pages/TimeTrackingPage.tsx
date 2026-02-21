import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { usePayRates } from "@/hooks/usePayRates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { Link } from "react-router-dom";
import type { TimeEntryWithDetails } from "@/types/time-tracking";

type PeriodFilter = "this_week" | "last_week" | "custom";

export default function TimeTrackingPage() {
  const { tAdmin } = useLanguage();
  const { staffWithRates, getStaffRate } = usePayRates();

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_week");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithDetails | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editBreak, setEditBreak] = useState("");

  // Calculate date range
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    if (periodFilter === "last_week") {
      const lastWeek = subWeeks(now, 1);
      return {
        dateFrom: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        dateTo: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
    // this_week or custom (default to this week)
    return {
      dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      dateTo: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }, [periodFilter]);

  const { entries, isLoading, editEntry, forceClockOut } = useTimeEntries({
    staffId: staffFilter !== "all" ? staffFilter : undefined,
    dateFrom,
    dateTo,
  });

  // Stale entries (active > 12 hours)
  const staleEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.status === "active" &&
          !e.clock_out &&
          Date.now() - new Date(e.clock_in).getTime() > 12 * 60 * 60 * 1000,
      ),
    [entries],
  );

  // Group by staff for summary table
  const staffSummary = useMemo(() => {
    const map = new Map<
      string,
      { name: string; totalMinutes: number; jobCount: number; entries: TimeEntryWithDetails[] }
    >();

    for (const entry of entries) {
      const sid = entry.staff_id;
      if (!map.has(sid)) {
        map.set(sid, {
          name: entry.profiles?.full_name ?? "Unknown",
          totalMinutes: 0,
          jobCount: 0,
          entries: [],
        });
      }
      const s = map.get(sid)!;
      if (entry.status === "completed") {
        s.totalMinutes += entry.billable_minutes ?? entry.total_minutes ?? 0;
        s.jobCount += 1;
      }
      s.entries.push(entry);
    }

    return Array.from(map.entries()).map(([staffId, data]) => {
      const hours = Math.round((data.totalMinutes / 60) * 100) / 100;
      const rate = getStaffRate(staffId);
      return {
        staffId,
        name: data.name,
        hours,
        jobCount: data.jobCount,
        payEstimate: Math.round(hours * rate * 100) / 100,
        entries: data.entries,
      };
    });
  }, [entries, getStaffRate]);

  const grandTotalHours = staffSummary.reduce((s, e) => s + e.hours, 0);
  const grandTotalPay = staffSummary.reduce((s, e) => s + e.payEstimate, 0);

  // CSV export for current view
  const handleExportCSV = () => {
    const rows = [["Staff Name", "Date", "Client", "Hours", "Rate", "Amount"]];
    for (const staff of staffSummary) {
      const rate = getStaffRate(staff.staffId);
      for (const entry of staff.entries.filter((e) => e.status === "completed")) {
        const hrs = ((entry.billable_minutes ?? entry.total_minutes ?? 0) / 60).toFixed(2);
        const amt = (parseFloat(hrs) * rate).toFixed(2);
        rows.push([
          staff.name,
          format(new Date(entry.clock_in), "yyyy-MM-dd"),
          entry.jobs?.clients?.name ?? "Unknown",
          hrs,
          `$${rate.toFixed(2)}`,
          `$${amt}`,
        ]);
      }
    }
    rows.push(["TOTAL", "", "", grandTotalHours.toFixed(2), "", `$${grandTotalPay.toFixed(2)}`]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-tracking-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    await editEntry(editingEntry.id, {
      break_minutes: editBreak ? parseInt(editBreak, 10) : undefined,
      admin_notes: editNotes || undefined,
    });
    setEditingEntry(null);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">{tAdmin("time_tracking")}</h1>
          <div className="flex flex-wrap gap-2">
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">{tAdmin("this_week")}</SelectItem>
                <SelectItem value="last_week">{tAdmin("last_week")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={tAdmin("all_staff")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdmin("all_staff")}</SelectItem>
                {staffWithRates
                  .filter((s) => s.is_active !== false)
                  .map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              {tAdmin("export_csv")}
            </Button>

            <Button asChild size="sm">
              <Link to="/admin/pay-reports">
                <FileText className="mr-2 h-4 w-4" />
                {tAdmin("generate_report")}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stale entries alert */}
        {staleEntries.length > 0 && (
          <Card className="mb-4 border-warning/50 bg-warning/5">
            <CardContent className="py-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" />
                {tAdmin("stale_entries_alert")}
              </div>
              {staleEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded bg-background/50 px-3 py-2 text-sm"
                >
                  <span>
                    {entry.profiles?.full_name ?? "Unknown"} — clocked in{" "}
                    {format(new Date(entry.clock_in), "MMM d, h:mm a")}
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => forceClockOut(entry.id)}>
                    {tAdmin("force_clock_out")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Summary table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              {dateFrom} — {dateTo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : staffSummary.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{tAdmin("no_time_entries")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tAdmin("staff_member")}</TableHead>
                    <TableHead className="text-right">{tAdmin("hours")}</TableHead>
                    <TableHead className="text-right">{tAdmin("jobs_count")}</TableHead>
                    <TableHead className="text-right">{tAdmin("pay_estimate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffSummary.map((staff) => (
                    <>
                      <TableRow
                        key={staff.staffId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedStaff(expandedStaff === staff.staffId ? null : staff.staffId)
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {expandedStaff === staff.staffId ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {staff.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{staff.hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">{staff.jobCount}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${staff.payEstimate.toFixed(2)}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail rows */}
                      {expandedStaff === staff.staffId &&
                        staff.entries
                          .filter((e) => e.status === "completed")
                          .map((entry) => {
                            const mins = entry.billable_minutes ?? entry.total_minutes ?? 0;
                            return (
                              <TableRow key={entry.id} className="bg-muted/20">
                                <TableCell className="pl-10 text-sm text-muted-foreground">
                                  {entry.jobs?.clients?.name ?? "Unknown"} —{" "}
                                  {format(new Date(entry.clock_in), "MMM d, h:mm a")}
                                  {entry.status === "edited" && (
                                    <span className="ml-2 text-xs text-warning">(edited)</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {(mins / 60).toFixed(1)}h
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingEntry(entry);
                                      setEditBreak(String(entry.break_minutes ?? 0));
                                      setEditNotes(entry.admin_notes ?? "");
                                    }}
                                  >
                                    {tAdmin("edit")}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                    </>
                  ))}

                  {/* Grand total */}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{grandTotalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">
                      {staffSummary.reduce((s, e) => s + e.jobCount, 0)}
                    </TableCell>
                    <TableCell className="text-right">${grandTotalPay.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit entry dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tAdmin("edit_entry")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{tAdmin("hours")}</label>
              <Input
                type="number"
                min={0}
                value={editBreak}
                onChange={(e) => setEditBreak(e.target.value)}
                placeholder="Break minutes"
              />
              <p className="mt-1 text-xs text-muted-foreground">Break minutes to deduct</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tAdmin("admin_notes")}</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Admin notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              {tAdmin("cancel")}
            </Button>
            <Button onClick={handleSaveEdit}>{tAdmin("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
