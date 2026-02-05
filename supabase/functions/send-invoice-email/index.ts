import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-invoice-email] No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("[send-invoice-email] Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is admin - invoices should only be sent by admins
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("[send-invoice-email] Admin access required");
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-invoice-email] Authenticated admin user: ${user.id}`);

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

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Pulcrix <onboarding@resend.dev>";

    // Convert base64 to Uint8Array for attachment
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0D9488; margin: 0;">✨ ${companyName || "Pulcrix"}</h1>
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
            © ${new Date().getFullYear()} ${companyName || "Pulcrix"}. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Tax Invoice ${invoiceNumber} - ${companyName || "Pulcrix"}`,
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
