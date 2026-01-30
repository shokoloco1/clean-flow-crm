import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceEmailRequest {
  to: string;
  clientName: string;
  invoiceNumber: string;
  total: string;
  dueDate: string;
  pdfBase64: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-invoice-email] Received request");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      clientName,
      invoiceNumber,
      total,
      dueDate,
      pdfBase64,
      companyName,
    }: InvoiceEmailRequest = await req.json();

    console.log(`[send-invoice-email] Sending invoice ${invoiceNumber} to ${to}`);

    if (!to || !invoiceNumber || !pdfBase64) {
      throw new Error("Missing required fields: to, invoiceNumber, and pdfBase64 are required");
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CleanFlow <onboarding@resend.dev>";

    // Convert base64 to Uint8Array for attachment
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0d9488; margin: 0;">✨ ${companyName || "CleanFlow"}</h1>
          </div>
          
          <h2 style="color: #111827;">Hi ${clientName},</h2>
          
          <p>Please find attached your tax invoice <strong>${invoiceNumber}</strong>.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">
              <strong>Amount Due:</strong> ${total} (Inc. GST)
            </p>
            <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;">
              <strong>Due Date:</strong> ${dueDate}
            </p>
          </div>
          
          <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
          
          <p>Thank you for your business!</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ${companyName || "CleanFlow"}. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Tax Invoice ${invoiceNumber} - ${companyName || "CleanFlow"}`,
      html: emailHtml,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log("[send-invoice-email] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-invoice-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
