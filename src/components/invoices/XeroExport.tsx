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
import { Download, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

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
  clients?: { name: string; abn?: string | null } | null;
}

interface InvoiceItem {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface XeroExportProps {
  invoices: Invoice[];
}

/**
 * Xero CSV Export Component
 * Generates CSV in Xero's standard import format for Australian businesses
 * Format: ContactName, InvoiceNumber, InvoiceDate, DueDate, Description, Quantity, UnitAmount, TaxType
 */
export function XeroExport({ invoices }: XeroExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Filter to only exportable invoices (sent or paid)
  const exportableInvoices = invoices.filter(
    (inv) => inv.status === "sent" || inv.status === "paid",
  );

  const handleOpenDialog = () => {
    // Pre-select all exportable invoices
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
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one invoice to export");
      return;
    }

    setIsExporting(true);

    try {
      // Fetch invoice items for selected invoices
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("invoice_id, description, quantity, unit_price, total")
        .in("invoice_id", Array.from(selectedIds));

      if (error) throw error;

      // Group items by invoice
      const itemsByInvoice = new Map<string, InvoiceItem[]>();
      items?.forEach((item) => {
        const existing = itemsByInvoice.get(item.invoice_id) || [];
        existing.push(item);
        itemsByInvoice.set(item.invoice_id, existing);
      });

      // Xero CSV Header
      // Standard Xero invoice import format
      const headers = [
        "*ContactName",
        "*InvoiceNumber",
        "*InvoiceDate",
        "*DueDate",
        "Description",
        "*Quantity",
        "*UnitAmount",
        "*AccountCode",
        "*TaxType",
        "TrackingName1",
        "TrackingOption1",
      ];

      const rows: string[] = [];

      // Generate rows for each invoice + items
      for (const invoice of invoices.filter((inv) => selectedIds.has(inv.id))) {
        const invoiceItems = itemsByInvoice.get(invoice.id) || [];

        // Format dates as DD/MM/YYYY for Xero (Australian format)
        const invoiceDate = format(parseISO(invoice.issue_date), "dd/MM/yyyy");
        const dueDate = format(parseISO(invoice.due_date), "dd/MM/yyyy");

        // Determine tax type based on invoice tax_rate
        const taxType = invoice.tax_rate > 0 ? "GST on Income" : "GST Free Income";

        // Account code - default to Sales (200) which is standard Xero
        const accountCode = "200";

        if (invoiceItems.length === 0) {
          // Invoice with no line items - create a single row with total
          rows.push(
            [
              escapeCSV(invoice.clients?.name || "Unknown Client"),
              escapeCSV(invoice.invoice_number),
              escapeCSV(invoiceDate),
              escapeCSV(dueDate),
              escapeCSV("Cleaning Services"),
              "1",
              escapeCSV(invoice.subtotal.toFixed(2)),
              escapeCSV(accountCode),
              escapeCSV(taxType),
              "", // TrackingName1
              "", // TrackingOption1
            ].join(","),
          );
        } else {
          // Multiple line items
          for (const item of invoiceItems) {
            rows.push(
              [
                escapeCSV(invoice.clients?.name || "Unknown Client"),
                escapeCSV(invoice.invoice_number),
                escapeCSV(invoiceDate),
                escapeCSV(dueDate),
                escapeCSV(item.description),
                escapeCSV(item.quantity.toString()),
                escapeCSV(item.unit_price.toFixed(2)),
                escapeCSV(accountCode),
                escapeCSV(taxType),
                "", // TrackingName1
                "", // TrackingOption1
              ].join(","),
            );
          }
        }
      }

      const csvContent = [headers.join(","), ...rows].join("\n");
      const filename = `xero_invoices_${format(new Date(), "yyyy-MM-dd")}.csv`;

      downloadCSV(csvContent, filename);

      toast.success(`Exported ${selectedIds.size} invoices for Xero`, {
        description: "Ready to import in Xero > Business > Invoices > Import",
      });

      setIsOpen(false);
    } catch (error) {
      logger.error("Error exporting to Xero:", error);
      toast.error("Failed to export invoices", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="border-success/30 bg-success/10 text-success">Paid</Badge>;
      case "sent":
        return <Badge className="border-primary/30 bg-primary/10 text-primary">Sent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpenDialog}
        disabled={exportableInvoices.length === 0}
        className="gap-2"
        title="Download CSV file compatible with Xero import"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV for Xero
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Export to Xero
            </DialogTitle>
            <DialogDescription>
              Download a CSV file to manually import into Xero. This is not a direct sync - you'll
              need to import the file in Xero.
            </DialogDescription>
          </DialogHeader>

          {exportableInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No invoices ready for export. Mark invoices as "Sent" first.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedIds.size === exportableInvoices.length}
                    onCheckedChange={toggleAll}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                    Select All ({exportableInvoices.length})
                  </Label>
                </div>
                <Badge variant="secondary">{selectedIds.size} selected</Badge>
              </div>

              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {exportableInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{invoice.invoice_number}</span>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {invoice.clients?.name || "Unknown Client"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${invoice.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(invoice.issue_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="mb-1 font-medium">Xero Import Instructions:</p>
                <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                  <li>Go to Xero → Business → Invoices</li>
                  <li>Click Import → Import invoices</li>
                  <li>Select the downloaded CSV file</li>
                  <li>Map fields and complete import</li>
                </ol>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || selectedIds.size === 0}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {selectedIds.size} Invoice{selectedIds.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
