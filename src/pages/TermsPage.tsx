import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PulcrixLogo } from "@/components/PulcrixLogo";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <PulcrixLogo variant="full" size="sm" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Pulcrix ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
            <p>
              Pulcrix is a management platform for cleaning businesses that enables:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Scheduling and management of cleaning jobs</li>
              <li>Staff and location tracking</li>
              <li>Client and property management</li>
              <li>Invoicing and reporting</li>
              <li>Team communication</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Registration and Accounts</h2>
            <p>
              To use the Service, you must create an account by providing accurate and complete information.
              You are responsible for maintaining the confidentiality of your password and for all activities
              that occur under your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable law or regulation</li>
              <li>Infringe the intellectual property rights of third parties</li>
              <li>Transmit malware or malicious code</li>
              <li>Interfere with the operation of the Service</li>
              <li>Access systems or data without authorisation</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Payments and Billing</h2>
            <p>
              Subscription plans are billed monthly or annually as you choose.
              All payments are non-refundable except as set out in our refund policy.
              Prices may change with 30 days' prior notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Intellectual Property</h2>
            <p>
              The Service and its original content, features and functionality are the property of Pulcrix
              and are protected by intellectual property laws. You retain all rights to
              your data and content.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>
              In no event shall Pulcrix be liable for indirect, incidental, special,
              consequential or punitive damages, including loss of profits, data, use or other intangible loss.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice, for any reason,
              including breach of these Terms. Upon termination, your right to use the Service will cease.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time.
              We will notify you of significant changes by email or by posting a notice on the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Contact</h2>
            <p>
              If you have questions about these Terms of Service, you can contact us at:
              <a href="mailto:legal@pulcrix.com" className="text-primary hover:underline ml-1">
                legal@pulcrix.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} Pulcrix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
