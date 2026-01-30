import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Download, Loader2, Building2, Calendar, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatAUD } from "@/lib/australian";

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
  clients?: { name: string; address?: string; email?: string; phone?: string } | null;
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

export function InvoiceDetailDialog({
  invoice,
  onClose,
  onUpdated,
}: InvoiceDetailDialogProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [clientDetails, setClientDetails] = useState<{
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    if (invoice) {
      fetchInvoiceDetails();
    }
  }, [invoice]);

  const fetchInvoiceDetails = async () => {
    if (!invoice) return;
    setLoading(true);

    // Fetch items
    const { data: itemsData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at");

    if (itemsData) {
      setItems(itemsData as InvoiceItem[]);
    }

    // Fetch client details
    const { data: clientData } = await supabase
      .from("clients")
      .select("name, address, email, phone")
      .eq("id", invoice.client_id)
      .single();

    if (clientData) {
      setClientDetails(clientData);
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
      toast.error(t("error"));
    } else {
      toast.success(t("success"));
      onUpdated();
    }

    setUpdatingStatus(false);
  };

  const generatePDF = async () => {
    if (!invoice || !clientDetails) return;
    setGeneratingPDF(true);

    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(24);
      doc.setTextColor(37, 99, 235); // Primary blue
      doc.text("TAX INVOICE", 20, 25);

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(invoice.invoice_number, 20, 35);

      // Company info (right side)
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text("CleanFlow", 190, 20, { align: "right" });
      doc.text("Cleaning Management System", 190, 26, { align: "right" });

      // Client info
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("Bill to:", 20, 55);
      doc.setFontSize(12);
      doc.text(clientDetails.name, 20, 62);
      doc.setFontSize(10);
      doc.setTextColor(80);
      if (clientDetails.address) doc.text(clientDetails.address, 20, 69);
      if (clientDetails.email) doc.text(clientDetails.email, 20, 76);
      if (clientDetails.phone) doc.text(clientDetails.phone, 20, 83);

      // Invoice details (right side)
      doc.setTextColor(0);
      doc.text(`Date: ${format(parseISO(invoice.issue_date), "dd/MM/yyyy")}`, 190, 55, { align: "right" });
      doc.text(`Due: ${format(parseISO(invoice.due_date), "dd/MM/yyyy")}`, 190, 62, { align: "right" });

      // Items table
      const tableData = items.map((item) => [
        item.description,
        item.quantity.toString(),
        formatAUD(Number(item.unit_price)),
        formatAUD(Number(item.total)),
      ]);

      autoTable(doc, {
        startY: 95,
        head: [["Description", "Qty", "Unit Price", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: 35, halign: "right" },
          3: { cellWidth: 35, halign: "right" },
        },
      });

      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(10);
      doc.text("Subtotal:", 140, finalY);
      doc.text(formatAUD(Number(invoice.subtotal)), 190, finalY, { align: "right" });

      doc.text(`GST (${invoice.tax_rate}%):`, 140, finalY + 7);
      doc.text(formatAUD(Number(invoice.tax_amount)), 190, finalY + 7, { align: "right" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", 140, finalY + 17);
      doc.text(formatAUD(Number(invoice.total)), 190, finalY + 17, { align: "right" });

      // Notes
      if (invoice.notes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text("Notes:", 20, finalY + 30);
        doc.text(invoice.notes, 20, finalY + 37);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        "Generated with CleanFlow - Cleaning Management System",
        105,
        285,
        { align: "center" }
      );

      // Save
      doc.save(`${invoice.invoice_number}.pdf`);
      toast.success(t("success"));
    } catch (error) {
      console.error(error);
      toast.error(t("error"));
    }

    setGeneratingPDF(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return { label: t("paid"), className: "bg-success/10 text-success border-success/30" };
      case "sent":
        return { label: t("sent"), className: "bg-primary/10 text-primary border-primary/30" };
      case "overdue":
        return { label: t("overdue"), className: "bg-destructive/10 text-destructive border-destructive/30" };
      case "draft":
      default:
        return { label: t("draft"), className: "bg-muted text-muted-foreground border-border" };
    }
  };

  if (!invoice) return null;

  const statusConfig = getStatusConfig(invoice.status);

  return (
    <Dialog open={!!invoice} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              {invoice.invoice_number}
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
                <p className="text-sm text-muted-foreground mb-1">{t("client")}</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{clientDetails?.name}</span>
                </div>
                {clientDetails?.address && (
                  <p className="text-sm text-muted-foreground ml-6">{clientDetails.address}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {t("issueDate")}: {format(parseISO(invoice.issue_date), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {t("dueDate")}: {format(parseISO(invoice.due_date), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <p className="text-sm font-medium mb-3">{t("details")}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
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
                    <span className="text-muted-foreground">{t("subtotal")}</span>
                    <span>{formatAUD(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("gst")}
                    </span>
                    <span>{formatAUD(Number(invoice.tax_amount))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t("total")}</span>
                    <span>{formatAUD(Number(invoice.total))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("notes")}</p>
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
                    <SelectItem value="draft">{t("draft")}</SelectItem>
                    <SelectItem value="sent">{t("sent")}</SelectItem>
                    <SelectItem value="paid">{t("paid")}</SelectItem>
                    <SelectItem value="overdue">{t("overdue")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generatePDF} disabled={generatingPDF}>
                {generatingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t("downloadPDF")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
