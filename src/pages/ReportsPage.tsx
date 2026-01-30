import { AdminLayout } from "@/components/admin";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { PDFReports } from "@/components/PDFReports";
import { CSVReports } from "@/components/CSVReports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, FileSpreadsheet } from "lucide-react";

export default function ReportsPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            View metrics, generate PDF reports, and export CSV data
          </p>
        </div>

        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <MetricsDashboard />
          </TabsContent>

          <TabsContent value="pdf">
            <PDFReports />
          </TabsContent>

          <TabsContent value="csv">
            <CSVReports />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
