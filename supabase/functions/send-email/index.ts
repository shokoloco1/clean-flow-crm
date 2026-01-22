import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'password_reset' | 'welcome' | 'job_notification' | 'job_completed' | 'custom';
  data?: {
    name?: string;
    resetLink?: string;
    jobLocation?: string;
    jobDate?: string;
    jobTime?: string;
    customHtml?: string;
  };
}

const getEmailTemplate = (type: string, data: EmailRequest['data'] = {}) => {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #374151;
  `;

  const buttonStyle = `
    display: inline-block;
    padding: 12px 24px;
    background-color: #0d9488;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
  `;

  switch (type) {
    case 'password_reset':
      return {
        subject: 'Restablecer contraseña - CleanFlow',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">Hola ${data.name || 'usuario'},</h2>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
              <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetLink}" style="${buttonStyle}">Restablecer Contraseña</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                Si no solicitaste este cambio, puedes ignorar este email. El enlace expirará en 1 hora.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. Todos los derechos reservados.
              </p>
            </div>
          </div>
        `
      };

    case 'welcome':
      return {
        subject: '¡Bienvenido a CleanFlow! 🎉',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">¡Hola ${data.name || 'usuario'}! 👋</h2>
              <p>¡Gracias por unirte a CleanFlow! Estamos emocionados de tenerte con nosotros.</p>
              <p>Con CleanFlow podrás:</p>
              <ul>
                <li>📋 Gestionar todos tus trabajos de limpieza</li>
                <li>👥 Coordinar tu equipo fácilmente</li>
                <li>📸 Documentar tu trabajo con fotos</li>
                <li>📊 Ver métricas y reportes</li>
              </ul>
              <p>¡Empieza a organizar tu negocio de limpieza hoy!</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. Todos los derechos reservados.
              </p>
            </div>
          </div>
        `
      };

    case 'job_notification':
      return {
        subject: 'Nuevo trabajo asignado - CleanFlow',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">Hola ${data.name || 'usuario'},</h2>
              <p>Se te ha asignado un nuevo trabajo:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📍 Ubicación:</strong> ${data.jobLocation || 'No especificada'}</p>
                <p style="margin: 10px 0 0;"><strong>📅 Fecha:</strong> ${data.jobDate || 'No especificada'}</p>
                <p style="margin: 10px 0 0;"><strong>🕐 Hora:</strong> ${data.jobTime || 'No especificada'}</p>
              </div>
              <p>Abre la app para ver más detalles.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. Todos los derechos reservados.
              </p>
            </div>
          </div>
        `
      };

    case 'job_completed':
      return {
        subject: 'Trabajo completado - CleanFlow',
        html: `
          <div style="${baseStyles}">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0d9488; margin: 0;">✨ CleanFlow</h1>
              </div>
              <h2 style="color: #111827;">¡Trabajo completado! ✅</h2>
              <p>El trabajo en <strong>${data.jobLocation || 'la ubicación'}</strong> ha sido marcado como completado.</p>
              <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #065f46; font-size: 18px;">✓ Completado exitosamente</p>
              </div>
              <p>Puedes ver los detalles y fotos en el portal de clientes.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} CleanFlow. Todos los derechos reservados.
              </p>
            </div>
          </div>
        `
      };

    case 'custom':
      return {
        subject: data.customHtml ? 'Notificación de CleanFlow' : 'CleanFlow',
        html: data.customHtml || '<p>Sin contenido</p>'
      };

    default:
      return {
        subject: 'Notificación de CleanFlow',
        html: '<p>Tienes una nueva notificación.</p>'
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-email] Received request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();
    
    console.log(`[send-email] Sending ${type} email to ${to}`);

    if (!to || !type) {
      throw new Error("Missing required fields: 'to' and 'type' are required");
    }

    const template = getEmailTemplate(type, data);

    const emailResponse = await resend.emails.send({
      from: "CleanFlow <onboarding@resend.dev>",
      to: [to],
      subject: subject || template.subject,
      html: template.html,
    });

    console.log("[send-email] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-email] Error:", error);
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