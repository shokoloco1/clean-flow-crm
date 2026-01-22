import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-foreground mb-8">Términos de Servicio</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar CleanFlow ("el Servicio"), usted acepta estar sujeto a estos Términos de Servicio. 
              Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Descripción del Servicio</h2>
            <p>
              CleanFlow es una plataforma de gestión para empresas de limpieza que permite:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Programación y gestión de trabajos de limpieza</li>
              <li>Seguimiento de personal y ubicación</li>
              <li>Gestión de clientes y propiedades</li>
              <li>Facturación y reportes</li>
              <li>Comunicación entre equipos</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Registro y Cuentas</h2>
            <p>
              Para utilizar el Servicio, debe crear una cuenta proporcionando información precisa y completa. 
              Usted es responsable de mantener la confidencialidad de su contraseña y de todas las actividades 
              que ocurran bajo su cuenta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Uso Aceptable</h2>
            <p>Usted acepta no utilizar el Servicio para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violar cualquier ley o regulación aplicable</li>
              <li>Infringir los derechos de propiedad intelectual de terceros</li>
              <li>Transmitir malware o código malicioso</li>
              <li>Interferir con el funcionamiento del Servicio</li>
              <li>Acceder sin autorización a sistemas o datos</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Pagos y Facturación</h2>
            <p>
              Los planes de suscripción se facturan mensual o anualmente según su elección. 
              Todos los pagos son no reembolsables excepto según lo establecido en nuestra política de reembolso.
              Los precios pueden cambiar con previo aviso de 30 días.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Propiedad Intelectual</h2>
            <p>
              El Servicio y su contenido original, características y funcionalidad son propiedad de CleanFlow 
              y están protegidos por leyes de propiedad intelectual. Usted conserva todos los derechos sobre 
              sus datos y contenido.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Limitación de Responsabilidad</h2>
            <p>
              En ningún caso CleanFlow será responsable por daños indirectos, incidentales, especiales, 
              consecuentes o punitivos, incluyendo pérdida de beneficios, datos, uso u otra pérdida intangible.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Terminación</h2>
            <p>
              Podemos terminar o suspender su cuenta inmediatamente, sin previo aviso, por cualquier razón, 
              incluyendo violación de estos Términos. Tras la terminación, su derecho a usar el Servicio cesará.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Cambios a los Términos</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. 
              Le notificaremos sobre cambios significativos por correo electrónico o mediante un aviso en el Servicio.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Contacto</h2>
            <p>
              Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos en: 
              <a href="mailto:legal@cleanflow.app" className="text-primary hover:underline ml-1">
                legal@cleanflow.app
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