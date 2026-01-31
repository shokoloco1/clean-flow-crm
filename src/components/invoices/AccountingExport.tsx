import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  FileSpreadsheet, 
  Loader2, 
  AlertCircle,
  Calendar,
  Building2,
  Receipt
} from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string | null;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  clients?: { name: string; abn?: string | null; email?: string | null; address?: string | null } | null;
}

interface InvoiceItem {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface AccountingExportProps {
  invoices: Invoice[];
}

type ExportFormat = "xero" | "myob";

/**
 * Australian Accounting Software Export Component
 * Supports Xero and MYOB CSV formats with GST compliance
 */
export function AccountingExport({ invoices }: AccountingExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xero");
  const [dateFrom, setDateFrom] = useState(() => format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Filter exportable invoices (sent or paid) within date range
  const exportableInvoices = invoices.filter((inv) => {
    const isExportableStatus = inv.status === "sent" || inv.status === "paid";
    const invoiceDate = parseISO(inv.issue_date);
    const isInDateRange = isWithinInterval(invoiceDate, {
      start: parseISO(dateFrom),
      end: parseISO(dateTo),
    });
    return isExportableStatus && isInDateRange;
  });

  // Calculate GST summary for selected invoices
  const selectedInvoices = exportableInvoices.filter((inv) => selectedIds.has(inv.id));
  const gstSummary = {
    totalExGST: selectedInvoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0),
    totalGST: selectedInvoices.reduce((sum, inv) => sum + Number(inv.tax_amount), 0),
    totalIncGST: selectedInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
    invoiceCount: selectedInvoices.length,
  };

  const handleOpenDialog = () => {
    setSelectedIds(new Set(exportableInvoices.map((inv) => inv.id)));
    setIsOpen(true);
  };

  const toggleInvoice = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === exportableInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(exportableInvoices.map((inv) => inv.id)));
    }
  };

  const downloadCSV = (data: string, filename: string) => {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const generateXeroCSV = async (items: InvoiceItem[]) => {
    const itemsByInvoice = new Map<string, InvoiceItem[]>();
    items?.forEach((item) => {
      const existing = itemsByInvoice.get(item.invoice_id) || [];
      existing.push(item);
      itemsByInvoice.set(item.invoice_id, existing);
    });

    // Xero standard invoice import format
    const headers = [
      "*ContactName",
      "EmailAddress",
      "POAddressLine1",
      "POCity",
      "POPostalCode",
      "POCountry",
      "*InvoiceNumber",
      "Reference",
      "*InvoiceDate",
      "*DueDate",
      "Total",
      "TaxTotal",
      "Description",
      "*Quantity",
      "*UnitAmount",
      "*AccountCode",
      "*TaxType",
      "Currency",
    ];

    const rows: string[] = [];

    for (const invoice of invoices.filter((inv) => selectedIds.has(inv.id))) {
      const invoiceItems = itemsByInvoice.get(invoice.id) || [];
      const invoiceDate = format(parseISO(invoice.issue_date), "dd/MM/yyyy");
      const dueDate = format(parseISO(invoice.due_date), "dd/MM/yyyy");
      const taxType = Number(invoice.tax_rate) > 0 ? "GST on Income" : "GST Free Income";

      if (invoiceItems.length === 0) {
        rows.push(
          [
            escapeCSV(invoice.clients?.name || "Unknown Client"),
            escapeCSV(invoice.clients?.email || ""),
            escapeCSV(invoice.clients?.address || ""),
            "", // City
            "", // PostalCode
            "Australia",
            escapeCSV(invoice.invoice_number),
            escapeCSV(invoice.clients?.abn ? `ABN: ${invoice.clients.abn}` : ""),
            escapeCSV(invoiceDate),
            escapeCSV(dueDate),
            escapeCSV(invoice.total.toFixed(2)),
            escapeCSV(invoice.tax_amount.toFixed(2)),
            escapeCSV("Cleaning Services"),
            "1",
            escapeCSV(invoice.subtotal.toFixed(2)),
            "200", // Sales account
            escapeCSV(taxType),
            "AUD",
          ].join(",")
        );
      } else {
        for (const item of invoiceItems) {
          rows.push(
            [
              escapeCSV(invoice.clients?.name || "Unknown Client"),
              escapeCSV(invoice.clients?.email || ""),
              escapeCSV(invoice.clients?.address || ""),
              "",
              "",
              "Australia",
              escapeCSV(invoice.invoice_number),
              escapeCSV(invoice.clients?.abn ? `ABN: ${invoice.clients.abn}` : ""),
              escapeCSV(invoiceDate),
              escapeCSV(dueDate),
              "", // Total only on first line
              "",
              escapeCSV(item.description),
              escapeCSV(item.quantity.toString()),
              escapeCSV(item.unit_price.toFixed(2)),
              "200",
              escapeCSV(taxType),
              "AUD",
            ].join(",")
          );
        }
      }
    }

    return [headers.join(","), ...rows].join("\n");
  };

  const generateMYOBCSV = async (items: InvoiceItem[]) => {
    const itemsByInvoice = new Map<string, InvoiceItem[]>();
    items?.forEach((item) => {
      const existing = itemsByInvoice.get(item.invoice_id) || [];
      existing.push(item);
      itemsByInvoice.set(item.invoice_id, existing);
    });

    // MYOB AccountRight/Essentials invoice import format
    const headers = [
      "Co./Last Name",
      "First Name",
      "Invoice #",
      "Date",
      "Ship Date",
      "Customer PO",
      "Terms",
      "Item Number",
      "Description",
      "Quantity",
      "Price",
      "Discount",
      "Total",
      "Job",
      "Tax Code",
      "Tax Amount",
      "Freight",
      "Freight Tax Code",
      "Freight Tax Amount",
      "Memo",
      "Currency Code",
    ];

    const rows: string[] = [];

    for (const invoice of invoices.filter((inv) => selectedIds.has(inv.id))) {
      const invoiceItems = itemsByInvoice.get(invoice.id) || [];
      // MYOB uses DD/MM/YYYY format
      const invoiceDate = format(parseISO(invoice.issue_date), "dd/MM/yyyy");
      // MYOB tax code: GST = GST on Income, FRE = GST Free, N-T = No Tax
      const taxCode = Number(invoice.tax_rate) > 0 ? "GST" : "FRE";

      if (invoiceItems.length === 0) {
        rows.push(
          [
            escapeCSV(invoice.clients?.name || "Unknown Client"),
            "", // First Name
            escapeCSV(invoice.invoice_number),
            escapeCSV(invoiceDate),
            escapeCSV(invoiceDate), // Ship Date
            "", // Customer PO
            "Net 30", // Terms
            "CLEAN", // Item Number
            escapeCSV("Cleaning Services"),
            "1",
            escapeCSV(invoice.subtotal.toFixed(2)),
            "0", // Discount
            escapeCSV(invoice.total.toFixed(2)),
            "", // Job
            escapeCSV(taxCode),
            escapeCSV(invoice.tax_amount.toFixed(2)),
            "0", // Freight
            "", // Freight Tax Code
            "0", // Freight Tax Amount
            escapeCSV(invoice.notes || ""),
            "AUD",
          ].join(",")
        );
      } else {
        for (let i = 0; i < invoiceItems.length; i++) {
          const item = invoiceItems[i];
          const itemTax = Number(invoice.tax_rate) > 0 
            ? (item.total * 0.1).toFixed(2) 
            : "0";
          
          rows.push(
            [
              escapeCSV(invoice.clients?.name || "Unknown Client"),
              "",
              escapeCSV(invoice.invoice_number),
              escapeCSV(invoiceDate),
              escapeCSV(invoiceDate),
              "",
              "Net 30",
              `CLEAN${i + 1}`,
              escapeCSV(item.description),
              escapeCSV(item.quantity.toString()),
              escapeCSV(item.unit_price.toFixed(2)),
              "0",
              escapeCSV(item.total.toFixed(2)),
              "",
              escapeCSV(taxCode),
              escapeCSV(itemTax),
              "0",
              "",
              "0",
              i === 0 ? escapeCSV(invoice.notes || "") : "",
              "AUD",
            ].join(",")
          );
        }
      }
    }

    return [headers.join(","), ...rows].join("\n");
  };

  const generateGSTSummaryCSV = () => {
    const headers = [
      "Period",
      "Total Sales (Ex GST)",
      "GST Collected",
      "Total Sales (Inc GST)",
      "Invoice Count",
    ];

    const row = [
      `${format(parseISO(dateFrom), "dd/MM/yyyy")} - ${format(parseISO(dateTo), "dd/MM/yyyy")}`,
      gstSummary.totalExGST.toFixed(2),
      gstSummary.totalGST.toFixed(2),
      gstSummary.totalIncGST.toFixed(2),
      gstSummary.invoiceCount.toString(),
    ];

    return [headers.join(","), row.join(",")].join("\n");
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one invoice to export");
      return;
    }

    setIsExporting(true);

    try {
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("invoice_id, description, quantity, unit_price, total")
        .in("invoice_id", Array.from(selectedIds));

      if (error) throw error;

      let csvContent: string;
      let filename: string;

      if (exportFormat === "xero") {
        csvContent = await generateXeroCSV(items || []);
        filename = `xero_invoices_${format(new Date(), "yyyy-MM-dd")}.csv`;
      } else {
        csvContent = await generateMYOBCSV(items || []);
        filename = `myob_invoices_${format(new Date(), "yyyy-MM-dd")}.csv`;
      }

      downloadCSV(csvContent, filename);

      // Also offer GST summary
      const gstCSV = generateGSTSummaryCSV();
      downloadCSV(gstCSV, `gst_summary_${format(new Date(), "yyyy-MM-dd")}.csv`);

      toast.success(`Exported ${selectedIds.size} invoices for ${exportFormat.toUpperCase()}`, {
        description: "Invoice CSV + GST Summary downloaded",
      });

      setIsOpen(false);
    } catch (error: any) {
      console.error("Error exporting:", error);
      toast.error("Failed to export invoices", { description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success/10 text-success border-success/30">Paid</Badge>;
      case "sent":
        return <Badge className="bg-primary/10 text-primary border-primary/30">Sent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handleOpenDialog} className="gap-2">
        <FileSpreadsheet className="h-4 w-4" />
        Export to Accounting
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Export to Accounting Software
            </DialogTitle>
            <DialogDescription>
              Export invoices in Xero or MYOB format with GST summary for BAS reporting.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="xero" className="gap-2">
                <img src="https://www.xero.com/etc/designs/xero-cms/clientlib/assets/img/favicon/favicon-32x32.png" className="h-4 w-4" alt="Xero" />
                Xero
              </TabsTrigger>
              <TabsTrigger value="myob" className="gap-2">
                <Building2 className="h-4 w-4" />
                MYOB
              </TabsTrigger>
            </TabsList>

            <TabsContent value="xero" className="mt-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm mb-4">
                <p className="font-medium mb-1">Xero Import Instructions:</p>
                <ol className="text-muted-foreground text-xs space-y-1 list-decimal list-inside">
                  <li>Go to Xero → Business → Invoices</li>
                  <li>Click Import → Import invoices</li>
                  <li>Select the downloaded CSV file</li>
                  <li>Map fields and complete import</li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="myob" className="mt-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm mb-4">
                <p className="font-medium mb-1">MYOB Import Instructions:</p>
                <ol className="text-muted-foreground text-xs space-y-1 list-decimal list-inside">
                  <li>Open MYOB AccountRight/Essentials</li>
                  <li>Go to File → Import Data → Sales</li>
                  <li>Select "Item Sales" and choose the CSV</li>
                  <li>Map fields and import</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                From Date
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                To Date
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* GST Summary Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">GST Summary (for BAS)</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Ex GST</p>
                  <p className="font-bold">${gstSummary.totalExGST.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">GST Collected</p>
                  <p className="font-bold text-primary">${gstSummary.totalGST.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Inc GST</p>
                  <p className="font-bold">${gstSummary.totalIncGST.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Invoices</p>
                  <p className="font-bold">{gstSummary.invoiceCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {exportableInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No invoices in selected date range. Adjust dates or mark invoices as "Sent".
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedIds.size === exportableInvoices.length}
                    onCheckedChange={toggleAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All ({exportableInvoices.length})
                  </Label>
                </div>
                <Badge variant="secondary">{selectedIds.size} selected</Badge>
              </div>

              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {exportableInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(invoice.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                      onClick={() => toggleInvoice(invoice.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(invoice.id)}
                        onCheckedChange={() => toggleInvoice(invoice.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{invoice.invoice_number}</span>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {invoice.clients?.name || "Unknown Client"}
                          {invoice.clients?.abn && (
                            <span className="ml-2 text-xs">ABN: {invoice.clients.abn}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">${Number(invoice.total).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          GST: ${Number(invoice.tax_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || selectedIds.size === 0}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export to {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
