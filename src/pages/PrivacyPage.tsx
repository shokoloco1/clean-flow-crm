import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">CleanFlow</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Política de Privacidad</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Información que Recopilamos</h2>
            <p>
              Recopilamos información que usted nos proporciona directamente, incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Información de cuenta:</strong> nombre, correo electrónico, teléfono, contraseña</li>
              <li><strong>Información de negocio:</strong> nombre de empresa, dirección, datos fiscales</li>
              <li><strong>Datos de clientes:</strong> información de contacto de sus clientes</li>
              <li><strong>Datos de ubicación:</strong> GPS para verificación de check-in/check-out</li>
              <li><strong>Fotos:</strong> evidencia de trabajos realizados</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Uso de la Información</h2>
            <p>Utilizamos la información recopilada para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar, mantener y mejorar el Servicio</li>
              <li>Procesar transacciones y enviar notificaciones relacionadas</li>
              <li>Responder a comentarios, preguntas y solicitudes</li>
              <li>Enviar información técnica, actualizaciones y alertas de seguridad</li>
              <li>Monitorear y analizar tendencias de uso</li>
              <li>Detectar, investigar y prevenir actividades fraudulentas</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Compartir Información</h2>
            <p>
              No vendemos ni alquilamos su información personal a terceros. Podemos compartir información con:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Proveedores de servicios:</strong> que nos ayudan a operar el Servicio</li>
              <li><strong>Cumplimiento legal:</strong> cuando sea requerido por ley</li>
              <li><strong>Protección de derechos:</strong> para proteger nuestros derechos y seguridad</li>
              <li><strong>Con su consentimiento:</strong> para cualquier otro propósito con su permiso</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Seguridad de Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger su información:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encriptación de datos en tránsito y en reposo</li>
              <li>Control de acceso basado en roles</li>
              <li>Auditorías de seguridad regulares</li>
              <li>Almacenamiento seguro en servidores protegidos</li>
              <li>Protección contra acceso no autorizado</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Retención de Datos</h2>
            <p>
              Conservamos su información mientras su cuenta esté activa o según sea necesario para 
              proporcionarle servicios. También conservamos y usamos información según sea necesario 
              para cumplir con obligaciones legales, resolver disputas y hacer cumplir nuestros acuerdos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Sus Derechos</h2>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acceso:</strong> solicitar una copia de sus datos personales</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong>Eliminación:</strong> solicitar la eliminación de sus datos</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> oponerse al procesamiento de sus datos</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mantener su sesión activa, 
              recordar sus preferencias y mejorar su experiencia. Puede configurar su navegador 
              para rechazar cookies, pero esto puede afectar la funcionalidad del Servicio.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Datos de Ubicación</h2>
            <p>
              Recopilamos datos de ubicación GPS cuando el personal realiza check-in/check-out en trabajos. 
              Esta información se utiliza para verificar la presencia en el lugar de trabajo y se comparte 
              únicamente con los administradores de su organización.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Menores de Edad</h2>
            <p>
              El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente 
              información de menores. Si descubrimos que hemos recopilado información de un menor, 
              tomaremos medidas para eliminarla.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos sobre 
              cambios significativos publicando la nueva política en esta página y, si es apropiado, 
              enviándole un aviso por correo electrónico.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">11. Contacto</h2>
            <p>
              Si tiene preguntas sobre esta Política de Privacidad, puede contactarnos en: 
              <a href="mailto:privacy@cleanflow.app" className="text-primary hover:underline ml-1">
                privacy@cleanflow.app
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <Link to="/terms" className="hover:text-foreground">Términos de Servicio</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground">Política de Privacidad</Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} CleanFlow. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}