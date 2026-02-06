import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatAUD, formatABN } from "@/lib/australian";
import { logger } from "@/lib/logger";

interface InvoiceForEmail {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
}

interface ClientForEmail {
  name: string;
  email: string;
  abn?: string | null;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface BusinessSettings {
  company_name: string;
  business_abn: string;
  business_address: string;
  business_phone: string;
  business_email: string;
}

/**
 * Hook for sending invoices via email
 */
export function useInvoiceEmail() {
  const [isSending, setIsSending] = useState(false);

  const fetchBusinessSettings = async (): Promise<BusinessSettings> => {
    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "company_name",
        "business_abn",
        "business_address",
        "business_phone",
        "business_email",
      ]);

    const settings: BusinessSettings = {
      company_name: "Pulcrix",
      business_abn: "",
      business_address: "",
      business_phone: "",
      business_email: "",
    };

    if (data) {
      data.forEach((item) => {
        const key = item.key as keyof BusinessSettings;
        if (key in settings) {
          settings[key] = String(item.value || "");
        }
      });
    }

    return settings;
  };

  const generateInvoicePDFBase64 = async (
    invoice: InvoiceForEmail,
    client: ClientForEmail,
    items: InvoiceItem[],
    businessSettings: BusinessSettings
  ): Promise<string> => {
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
    doc.text(businessSettings.company_name, 190, 20, { align: "right" });

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

    if (businessSettings.business_abn) {
      doc.setFont("helvetica", "bold");
      doc.text(`ABN: ${formatABN(businessSettings.business_abn)}`, 190, businessY, { align: "right" });
      doc.setFont("helvetica", "normal");
    }

    // === BILL TO ===
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Bill to:", 20, 55);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(client.name, 20, 62);
    doc.setFont("helvetica", "normal");

    doc.setFontSize(10);
    doc.setTextColor(80);
    let clientY = 69;

    if (client.email) {
      doc.text(client.email, 20, clientY);
      clientY += 6;
    }
    if (client.abn) {
      doc.setFont("helvetica", "bold");
      doc.text(`ABN: ${formatABN(client.abn)}`, 20, clientY);
      doc.setFont("helvetica", "normal");
    }

    // === DATES ===
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Issue Date: ${format(parseISO(invoice.issue_date), "dd/MM/yyyy")}`, 190, 55, { align: "right" });
    doc.text(`Due Date: ${format(parseISO(invoice.due_date), "dd/MM/yyyy")}`, 190, 62, { align: "right" });

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
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 40, halign: "right" },
      },
    });

    // === TOTALS ===
    const finalY = (doc as any).lastAutoTable.finalY + 10;

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
    doc.text(
      `Tax Invoice generated by ${businessSettings.company_name}`,
      105,
      280,
      { align: "center" }
    );

    return doc.output("datauristring").split(",")[1];
  };

  const sendInvoiceEmail = async (invoiceId: string): Promise<boolean> => {
    setIsSending(true);

    try {
      // Fetch invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, issue_date, due_date,
          subtotal, tax_rate, tax_amount, total, notes,
          client_id
        `)
        .eq("id", invoiceId)
        .single();

      if (invoiceError || !invoice) {
        throw new Error("Invoice not found");
      }

      // Fetch client
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("name, email, abn")
        .eq("id", invoice.client_id)
        .single();

      if (clientError || !client) {
        throw new Error("Client not found");
      }

      if (!client.email) {
        throw new Error("Client has no email address");
      }

      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("description, quantity, unit_price, total")
        .eq("invoice_id", invoiceId);

      if (itemsError) {
        throw new Error("Failed to fetch invoice items");
      }

      // Get business settings
      const businessSettings = await fetchBusinessSettings();

      // Generate PDF as base64
      const pdfBase64 = await generateInvoicePDFBase64(
        invoice as InvoiceForEmail,
        client as ClientForEmail,
        items as InvoiceItem[],
        businessSettings
      );

      // Send via edge function
      const { error: sendError } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          to: client.email,
          clientName: client.name,
          invoiceNumber: invoice.invoice_number,
          total: formatAUD(invoice.total),
          dueDate: format(parseISO(invoice.due_date), "dd/MM/yyyy"),
          pdfBase64,
          companyName: businessSettings.company_name,
        },
      });

      if (sendError) {
        throw new Error(sendError.message || "Failed to send email");
      }

      // Update invoice status to sent
      await supabase
        .from("invoices")
        .update({ status: "sent" })
        .eq("id", invoiceId);

      toast.success("Invoice sent!", {
        description: `Email sent to ${client.email}`,
      });

      return true;
    } catch (error: any) {
      logger.error("Error sending invoice:", error);
      toast.error("Failed to send invoice", {
        description: error.message,
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendInvoiceEmail,
    isSending,
  };
}
