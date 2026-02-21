import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { usePayReport } from "@/hooks/usePayReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FileDown, Loader2, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { PayReportData } from "@/types/time-tracking";
// PayReport type inferred from usePayReport hook

export default function PayReportsPage() {
  const { tAdmin } = useLanguage();
  const { reports, isLoading, generateReport, exportCSV, exportPDF } = usePayReport();

  const [periodStart, setPeriodStart] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  );
  const [periodEnd, setPeriodEnd] = useState(
    format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateReport(periodStart, periodEnd);
    } finally {
      setIsGenerating(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">{tAdmin("draft")}</Badge>;
      case "approved":
        return <Badge className="bg-success text-success-foreground">{tAdmin("approved")}</Badge>;
      case "exported":
        return <Badge className="bg-primary">{tAdmin("exported")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{tAdmin("pay_reports")}</h1>
          <p className="text-sm text-muted-foreground">
            Generate pay reports for specific date ranges
          </p>
        </div>

        {/* Generate new report */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              {tAdmin("generate_report")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating} className="sm:w-auto">
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {tAdmin("generate_report")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previous Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{tAdmin("no_reports")}</p>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const data = report.report_data as PayReportData;
                  const isExpanded = expandedReport === report.id;

                  return (
                    <Card key={report.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium">
                                  {report.period_start} — {report.period_end}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {data.totals.total_staff} staff ·{" "}
                                  {data.totals.total_hours.toFixed(1)}h · $
                                  {data.totals.total_pay.toFixed(2)}
                                </p>
                              </div>
                              {statusBadge(report.status)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={tAdmin("export_csv")}
                              onClick={() => exportCSV(report)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={tAdmin("export_pdf")}
                              onClick={() => exportPDF(report)}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mt-4 border-t pt-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{tAdmin("staff_member")}</TableHead>
                                  <TableHead className="text-right">{tAdmin("hours")}</TableHead>
                                  <TableHead className="text-right">Rate</TableHead>
                                  <TableHead className="text-right">
                                    {tAdmin("total_pay")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.staff.map((s) => (
                                  <TableRow key={s.staff_id}>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell className="text-right">
                                      {s.total_hours.toFixed(1)}h
                                      {s.overtime_hours > 0 && (
                                        <span className="ml-1 text-xs text-warning">
                                          ({s.overtime_hours.toFixed(1)}h OT)
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      ${s.hourly_rate.toFixed(2)}
                                      {tAdmin("per_hour")}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      ${s.total_pay.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2 font-bold">
                                  <TableCell>TOTAL</TableCell>
                                  <TableCell className="text-right">
                                    {data.totals.total_hours.toFixed(1)}h
                                  </TableCell>
                                  <TableCell />
                                  <TableCell className="text-right">
                                    ${data.totals.total_pay.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
