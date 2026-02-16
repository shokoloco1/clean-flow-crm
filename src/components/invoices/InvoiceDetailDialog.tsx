import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2, Building2, Calendar, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { loadPdfLibs } from "@/lib/pdf-loader";
import { formatAUD, formatABN } from "@/lib/australian";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { logger } from "@/lib/logger";

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  clients?: { name: string; address?: string; email?: string; phone?: string; abn?: string } | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function InvoiceDetailDialog({ invoice, onClose, onUpdated }: InvoiceDetailDialogProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [clientDetails, setClientDetails] = useState<{
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    abn?: string;
  } | null>(null);

  const { settings: businessSettings } = useBusinessSettings();

  useEffect(() => {
    if (invoice) {
      fetchInvoiceDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  const fetchInvoiceDetails = async () => {
    if (!invoice) return;
    setLoading(true);

    const { data: itemsData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at");

    if (itemsData) {
      setItems(itemsData as InvoiceItem[]);
    }

    const { data: clientData } = await supabase
      .from("clients")
      .select("name, address, email, phone, abn")
      .eq("id", invoice.client_id)
      .single();

    if (clientData) {
      setClientDetails({
        name: clientData.name,
        address: clientData.address ?? undefined,
        email: clientData.email ?? undefined,
        phone: clientData.phone ?? undefined,
        abn: clientData.abn ?? undefined,
      });
    }

    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!invoice) return;
    setUpdatingStatus(true);

    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoice.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      onUpdated();
    }

    setUpdatingStatus(false);
  };

  const generatePDF = async () => {
    if (!invoice || !clientDetails) return;
    setGeneratingPDF(true);

    try {
      const { jsPDF, autoTable } = await loadPdfLibs();
      const doc = new jsPDF();
      const hasGST = invoice.tax_rate > 0;

      // === HEADER: TAX INVOICE ===
      doc.setFontSize(24);
      doc.setTextColor(37, 99, 235);
      doc.text("TAX INVOICE", 20, 25);

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(invoice.invoice_number, 20, 35);

      // === BUSINESS INFO (Right side) ===
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(businessSettings.company_name || "Pulcrix", 190, 20, { align: "right" });

      doc.setFontSize(9);
      doc.setTextColor(80);
      let businessY = 26;

      if (businessSettings.business_address) {
        doc.text(businessSettings.business_address, 190, businessY, { align: "right" });
        businessY += 5;
      }
      if (businessSettings.business_phone) {
        doc.text(businessSettings.business_phone, 190, businessY, { align: "right" });
        businessY += 5;
      }
      if (businessSettings.business_email) {
        doc.text(businessSettings.business_email, 190, businessY, { align: "right" });
        businessY += 5;
      }

      // Business ABN - IMPORTANT for tax invoices
      if (businessSettings.business_abn) {
        doc.setFont("helvetica", "bold");
        doc.text(`ABN: ${formatABN(businessSettings.business_abn)}`, 190, businessY, {
          align: "right",
        });
        doc.setFont("helvetica", "normal");
      }

      // === BILL TO (Client info) ===
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("Bill to:", 20, 55);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(clientDetails.name, 20, 62);
      doc.setFont("helvetica", "normal");

      doc.setFontSize(10);
      doc.setTextColor(80);
      let clientY = 69;

      if (clientDetails.address) {
        doc.text(clientDetails.address, 20, clientY);
        clientY += 6;
      }
      if (clientDetails.email) {
        doc.text(clientDetails.email, 20, clientY);
        clientY += 6;
      }
      if (clientDetails.phone) {
        doc.text(clientDetails.phone, 20, clientY);
        clientY += 6;
      }
      // Client ABN if applicable
      if (clientDetails.abn) {
        doc.setFont("helvetica", "bold");
        doc.text(`ABN: ${formatABN(clientDetails.abn)}`, 20, clientY);
        doc.setFont("helvetica", "normal");
      }

      // === INVOICE DETAILS (Right side) ===
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text(`Issue Date: ${format(parseISO(invoice.issue_date), "dd/MM/yyyy")}`, 190, 55, {
        align: "right",
      });
      doc.text(`Due Date: ${format(parseISO(invoice.due_date), "dd/MM/yyyy")}`, 190, 62, {
        align: "right",
      });

      // === ITEMS TABLE ===
      const tableData = items.map((item) => [
        item.description,
        item.quantity.toString(),
        formatAUD(Number(item.unit_price)),
        formatAUD(Number(item.total)),
      ]);

      autoTable(doc, {
        startY: 100,
        head: [["Description", "Qty", "Unit Price (Ex. GST)", "Total (Ex. GST)"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 85 },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 40, halign: "right" },
          3: { cellWidth: 40, halign: "right" },
        },
      });

      // === TOTALS SECTION ===
      const finalY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Box for totals
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(120, finalY - 3, 75, hasGST ? 40 : 25, 2, 2, "FD");

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text("Subtotal (Ex. GST):", 125, finalY + 5);
      doc.setTextColor(0);
      doc.text(formatAUD(Number(invoice.subtotal)), 190, finalY + 5, { align: "right" });

      if (hasGST) {
        doc.setTextColor(80);
        doc.text(`GST (${invoice.tax_rate}%):`, 125, finalY + 13);
        doc.setTextColor(0);
        doc.text(formatAUD(Number(invoice.tax_amount)), 190, finalY + 13, { align: "right" });

        // Total line
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(125, finalY + 20, 190, finalY + 20);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL (Inc. GST):", 125, finalY + 30);
        doc.text(formatAUD(Number(invoice.total)), 190, finalY + 30, { align: "right" });
      } else {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 125, finalY + 17);
        doc.text(formatAUD(Number(invoice.total)), 190, finalY + 17, { align: "right" });
      }

      // === NOTES ===
      if (invoice.notes) {
        const notesY = hasGST ? finalY + 50 : finalY + 35;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text("Notes:", 20, notesY);
        doc.text(invoice.notes, 20, notesY + 7);
      }

      // === FOOTER ===
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Tax Invoice generated by ${businessSettings.company_name || "Pulcrix"}`, 105, 280, {
        align: "center",
      });
      if (businessSettings.business_abn) {
        doc.text(`ABN: ${formatABN(businessSettings.business_abn)}`, 105, 285, { align: "center" });
      }

      // Save
      doc.save(`${invoice.invoice_number}.pdf`);
      toast.success("Tax Invoice PDF downloaded");
    } catch (error) {
      logger.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }

    setGeneratingPDF(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return { label: "Paid", className: "bg-success/10 text-success border-success/30" };
      case "sent":
        return { label: "Sent", className: "bg-primary/10 text-primary border-primary/30" };
      case "overdue":
        return {
          label: "Overdue",
          className: "bg-destructive/10 text-destructive border-destructive/30",
        };
      case "draft":
      default:
        return { label: "Draft", className: "bg-muted text-muted-foreground border-border" };
    }
  };

  if (!invoice) return null;

  const statusConfig = getStatusConfig(invoice.status);
  const hasGST = invoice.tax_rate > 0;

  return (
    <Dialog open={!!invoice} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <span>Tax Invoice</span>
                <span className="ml-2 text-muted-foreground">{invoice.invoice_number}</span>
              </div>
            </DialogTitle>
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Client & Dates */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Bill To</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{clientDetails?.name}</span>
                </div>
                {clientDetails?.address && (
                  <p className="ml-6 text-sm text-muted-foreground">{clientDetails.address}</p>
                )}
                {clientDetails?.abn && (
                  <p className="ml-6 mt-1 text-sm text-muted-foreground">
                    <span className="font-medium">ABN:</span> {formatABN(clientDetails.abn)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Issue: {format(parseISO(invoice.issue_date), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Due: {format(parseISO(invoice.due_date), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <p className="mb-3 text-sm font-medium">Line Items</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit (Ex. GST)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatAUD(Number(item.unit_price))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAUD(Number(item.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <Card>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal (Ex. GST)</span>
                    <span>{formatAUD(Number(invoice.subtotal))}</span>
                  </div>
                  {hasGST && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({invoice.tax_rate}%)</span>
                      <span>{formatAUD(Number(invoice.tax_amount))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>
                      Total{" "}
                      {hasGST && (
                        <span className="text-sm font-normal text-muted-foreground">
                          (Inc. GST)
                        </span>
                      )}
                    </span>
                    <span>{formatAUD(Number(invoice.total))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex-1">
                <Select
                  value={invoice.status}
                  onValueChange={updateStatus}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generatePDF} disabled={generatingPDF}>
                {generatingPDF ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
