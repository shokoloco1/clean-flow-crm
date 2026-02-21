import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";
import type {
  PayReport,
  PayReportData,
  PayReportStaffEntry,
  PayReportJobEntry,
} from "@/types/time-tracking";

export function usePayReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: queryKeys.payReports.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pay_reports")
        .select("*")
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return data as PayReport[];
    },
    enabled: !!user?.id,
  });

  // Generate a pay report for a date range
  const generateReport = async (
    periodStart: string,
    periodEnd: string,
  ): Promise<PayReport | null> => {
    try {
      // 1. Fetch all completed time entries in the period
      const { data: entries, error: entriesError } = await supabase
        .from("time_entries")
        .select(
          `
          *,
          profiles!time_entries_staff_id_fkey (full_name),
          jobs!time_entries_job_id_fkey (
            id,
            scheduled_date,
            clients (name)
          )
        `,
        )
        .eq("status", "completed")
        .gte("clock_in", `${periodStart}T00:00:00.000Z`)
        .lte("clock_in", `${periodEnd}T23:59:59.999Z`)
        .order("clock_in");

      if (entriesError) throw entriesError;

      // 2. Fetch pay rates
      const { data: rates, error: ratesError } = await supabase
        .from("staff_pay_rates")
        .select("*")
        .or(`effective_to.is.null,effective_to.gte.${periodStart}`)
        .lte("effective_from", periodEnd);

      if (ratesError) throw ratesError;

      // 3. Fetch profiles for fallback hourly_rate
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, hourly_rate");

      if (profilesError) throw profilesError;

      // Build rate lookup: staff_id -> hourly_rate
      const rateMap = new Map<string, number>();
      for (const rate of rates ?? []) {
        if (!rateMap.has(rate.staff_id)) {
          rateMap.set(rate.staff_id, Number(rate.hourly_rate));
        }
      }
      for (const profile of profiles ?? []) {
        if (!rateMap.has(profile.user_id) && profile.hourly_rate != null) {
          rateMap.set(profile.user_id, profile.hourly_rate);
        }
      }

      // Name lookup
      const nameMap = new Map<string, string>();
      for (const profile of profiles ?? []) {
        nameMap.set(profile.user_id, profile.full_name);
      }

      // 4. Aggregate per staff
      const staffMap = new Map<string, PayReportStaffEntry>();

      for (const entry of entries ?? []) {
        const staffId = entry.staff_id;
        const hours = (entry.billable_minutes ?? entry.total_minutes ?? 0) / 60;
        const rate = rateMap.get(staffId) ?? 30;
        const clientName =
          (entry.jobs as { clients: { name: string } | null })?.clients?.name ?? "Unknown";
        const jobDate = (entry.jobs as { scheduled_date: string })?.scheduled_date ?? "";

        const jobEntry: PayReportJobEntry = {
          job_id: entry.job_id,
          client_name: clientName,
          date: jobDate,
          hours: Math.round(hours * 100) / 100,
          amount: Math.round(hours * rate * 100) / 100,
        };

        if (!staffMap.has(staffId)) {
          staffMap.set(staffId, {
            staff_id: staffId,
            name: nameMap.get(staffId) ?? "Unknown",
            hourly_rate: rate,
            total_hours: 0,
            overtime_hours: 0,
            regular_hours: 0,
            regular_pay: 0,
            overtime_pay: 0,
            total_pay: 0,
            jobs: [],
          });
        }

        const staffEntry = staffMap.get(staffId)!;
        staffEntry.total_hours += jobEntry.hours;
        staffEntry.jobs.push(jobEntry);
      }

      // Calculate pay per staff (with overtime threshold at 38h/week)
      const staffEntries: PayReportStaffEntry[] = [];
      for (const entry of staffMap.values()) {
        entry.total_hours = Math.round(entry.total_hours * 100) / 100;
        const overtimeThreshold = 38;
        if (entry.total_hours > overtimeThreshold) {
          entry.regular_hours = overtimeThreshold;
          entry.overtime_hours = Math.round((entry.total_hours - overtimeThreshold) * 100) / 100;
        } else {
          entry.regular_hours = entry.total_hours;
          entry.overtime_hours = 0;
        }
        entry.regular_pay = Math.round(entry.regular_hours * entry.hourly_rate * 100) / 100;
        entry.overtime_pay = Math.round(entry.overtime_hours * entry.hourly_rate * 1.5 * 100) / 100;
        entry.total_pay = Math.round((entry.regular_pay + entry.overtime_pay) * 100) / 100;
        staffEntries.push(entry);
      }

      // 5. Build report data
      const reportData: PayReportData = {
        staff: staffEntries,
        totals: {
          total_hours: Math.round(staffEntries.reduce((s, e) => s + e.total_hours, 0) * 100) / 100,
          total_pay: Math.round(staffEntries.reduce((s, e) => s + e.total_pay, 0) * 100) / 100,
          total_staff: staffEntries.length,
        },
      };

      // 6. Insert report
      const { data: report, error: insertError } = await supabase
        .from("pay_reports")
        .insert({
          period_start: periodStart,
          period_end: periodEnd,
          generated_by: user!.id,
          report_data: reportData as unknown as Record<string, unknown>,
          status: "draft",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Pay report generated");
      queryClient.invalidateQueries({ queryKey: queryKeys.payReports.list() });
      return report as PayReport;
    } catch (err) {
      console.error("Generate report error:", err);
      toast.error("Failed to generate report");
      return null;
    }
  };

  // Export as CSV
  const exportCSV = (report: PayReport): void => {
    const data = report.report_data as PayReportData;
    const rows = [["Staff Name", "Date", "Job", "Client", "Hours", "Rate", "Amount"]];

    for (const staff of data.staff) {
      for (const job of staff.jobs) {
        rows.push([
          staff.name,
          job.date,
          job.job_id,
          job.client_name,
          job.hours.toFixed(2),
          `$${staff.hourly_rate.toFixed(2)}`,
          `$${job.amount.toFixed(2)}`,
        ]);
      }
      // Staff total row
      rows.push([
        staff.name,
        "",
        "",
        "TOTAL",
        staff.total_hours.toFixed(2),
        "",
        `$${staff.total_pay.toFixed(2)}`,
      ]);
    }

    // Grand total
    rows.push([
      "GRAND TOTAL",
      "",
      "",
      "",
      data.totals.total_hours.toFixed(2),
      "",
      `$${data.totals.total_pay.toFixed(2)}`,
    ]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pay-report-${report.period_start}-to-${report.period_end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as PDF
  const exportPDF = async (report: PayReport): Promise<void> => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const data = report.report_data as PayReportData;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("Pay Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${report.period_start} to ${report.period_end}`, 14, 30);
    doc.text(`Generated: ${new Date(report.generated_at).toLocaleDateString("en-AU")}`, 14, 36);

    // Summary table
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Summary", 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [["Staff Member", "Hours", "Regular Pay", "Overtime Pay", "Total Pay"]],
      body: data.staff.map((s) => [
        s.name,
        `${s.total_hours.toFixed(1)}h`,
        `$${s.regular_pay.toFixed(2)}`,
        `$${s.overtime_pay.toFixed(2)}`,
        `$${s.total_pay.toFixed(2)}`,
      ]),
      foot: [
        [
          "TOTAL",
          `${data.totals.total_hours.toFixed(1)}h`,
          "",
          "",
          `$${data.totals.total_pay.toFixed(2)}`,
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Detail per staff
    let currentY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    for (const staff of data.staff) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.text(`${staff.name} — $${staff.hourly_rate.toFixed(2)}/hr`, 14, currentY);
      currentY += 6;

      autoTable(doc, {
        startY: currentY,
        head: [["Date", "Client", "Hours", "Amount"]],
        body: staff.jobs.map((j) => [
          j.date,
          j.client_name,
          `${j.hours.toFixed(2)}h`,
          `$${j.amount.toFixed(2)}`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontSize: 9 },
        styles: { fontSize: 9 },
      });

      currentY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Generated by Pulcrix", 14, doc.internal.pageSize.height - 10);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 40,
        doc.internal.pageSize.height - 10,
      );
    }

    doc.save(`pay-report-${report.period_start}-to-${report.period_end}.pdf`);
  };

  return {
    reports,
    isLoading,
    generateReport,
    exportCSV,
    exportPDF,
  };
}
