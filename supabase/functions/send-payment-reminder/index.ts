import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed =
    origin === "https://pulcrix.com" ||
    origin === "http://localhost:8080" ||
    origin === "http://localhost:3000" ||
    origin.endsWith(".lovable.app");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://pulcrix.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string;
  issue_date: string;
  client_id: string;
}

interface Client {
  name: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  console.log("[send-payment-reminder] Starting payment reminder check");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get company name from settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "company_name")
      .single();
    
    const companyName = settingsData?.value || "Pulcrix";

    // Find invoices that are:
    // 1. Status = 'sent'
    // 2. Due date is 7+ days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

    console.log(`[send-payment-reminder] Checking for invoices due before ${cutoffDate}`);

    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, issue_date, client_id")
      .eq("status", "sent")
      .lt("due_date", cutoffDate);

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      console.log("[send-payment-reminder] No overdue invoices found");
      return new Response(
        JSON.stringify({ success: true, message: "No overdue invoices", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-payment-reminder] Found ${overdueInvoices.length} overdue invoices`);

    // Get client details for all invoices
    const clientIds = [...new Set(overdueInvoices.map((i) => i.client_id).filter(Boolean))];
    
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, email")
      .in("id", clientIds);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    const clientMap = new Map(clients?.map((c) => [c.id, c]) || []);

    let sentCount = 0;
    const errors: string[] = [];

    for (const invoice of overdueInvoices) {
      const client = clientMap.get(invoice.client_id) as Client | undefined;

      if (!client?.email) {
        console.log(`[send-payment-reminder] Skipping invoice ${invoice.invoice_number} - no client email`);
        continue;
      }

      // Calculate days overdue
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Format for Australian locale
      const formattedTotal = new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
      }).format(invoice.total);

      const formattedDueDate = new Date(invoice.due_date).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || `${companyName} <onboarding@resend.dev>`;

      try {
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0D9488; margin: 0;">${companyName}</h1>
            </div>
            
            <h2 style="color: #dc2626;">⚠️ Payment Reminder</h2>
            
            <p>Dear ${client.name},</p>
            
            <p>This is a friendly reminder that payment for the following invoice is now <strong>${daysOverdue} days overdue</strong>:</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; font-weight: bold;">Invoice: ${invoice.invoice_number}</p>
              <p style="margin: 5px 0 0;">Amount Due: <strong style="color: #dc2626;">${formattedTotal}</strong> (Inc. GST)</p>
              <p style="margin: 5px 0 0; color: #666;">Original Due Date: ${formattedDueDate}</p>
            </div>
            
            <p>Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this reminder and accept our thanks.</p>
            
            <p>If you have any questions or need to discuss payment arrangements, please don't hesitate to contact us.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <p>Best regards,<br/><strong>${companyName}</strong></p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated payment reminder from ${companyName}.
            </p>
          </div>
        `;

        const emailResponse = await resend.emails.send({
          from: fromEmail,
          to: [client.email],
          subject: `⚠️ Payment Reminder: Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue`,
          html: emailHtml,
        });

        console.log(`[send-payment-reminder] Sent reminder for ${invoice.invoice_number} to ${client.email}`);
        sentCount++;

        // Update invoice status to overdue
        await supabase
          .from("invoices")
          .update({ status: "overdue" })
          .eq("id", invoice.id);

      } catch (emailError: any) {
        console.error(`[send-payment-reminder] Failed to send to ${client.email}:`, emailError);
        errors.push(`${invoice.invoice_number}: ${emailError.message}`);
      }
    }

    console.log(`[send-payment-reminder] Completed. Sent ${sentCount} reminders.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: overdueInvoices.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-payment-reminder] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
