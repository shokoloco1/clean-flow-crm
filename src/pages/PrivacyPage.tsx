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
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We collect information that you provide to us directly, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account information:</strong> name, email, phone, password</li>
              <li><strong>Business information:</strong> company name, address, tax details</li>
              <li><strong>Client data:</strong> contact information for your clients</li>
              <li><strong>Location data:</strong> GPS for check-in/check-out verification</li>
              <li><strong>Photos:</strong> evidence of completed work</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Use of Information</h2>
            <p>We use the information collected to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain and improve the Service</li>
              <li>Process transactions and send related notifications</li>
              <li>Respond to comments, questions and requests</li>
              <li>Send technical information, updates and security alerts</li>
              <li>Monitor and analyse usage trends</li>
              <li>Detect, investigate and prevent fraudulent activities</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Sharing Information</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service providers:</strong> who help us operate the Service</li>
              <li><strong>Legal compliance:</strong> when required by law</li>
              <li><strong>Rights protection:</strong> to protect our rights and safety</li>
              <li><strong>With your consent:</strong> for any other purpose with your permission</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
            <p>
              We implement technical and organisational security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Role-based access control</li>
              <li>Regular security audits</li>
              <li>Secure storage on protected servers</li>
              <li>Protection against unauthorised access</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Data Retention</h2>
            <p>
              We retain your information while your account is active or as necessary to 
              provide you with services. We also retain and use information as necessary 
              to comply with legal obligations, resolve disputes and enforce our agreements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> request a copy of your personal data</li>
              <li><strong>Rectification:</strong> correct inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> request deletion of your data</li>
              <li><strong>Portability:</strong> receive your data in a structured format</li>
              <li><strong>Objection:</strong> object to processing of your data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Cookies and Similar Technologies</h2>
            <p>
              We use cookies and similar technologies to maintain your session, 
              remember your preferences and improve your experience. You can configure your browser 
              to reject cookies, but this may affect the functionality of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Location Data</h2>
            <p>
              We collect GPS location data when staff perform check-in/check-out on jobs. 
              This information is used to verify presence at the workplace and is shared 
              only with the administrators of your organisation.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Minors</h2>
            <p>
              The Service is not directed to persons under 18 years of age. We do not intentionally 
              collect information from minors. If we discover that we have collected information from a minor, 
              we will take steps to delete it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of 
              significant changes by posting the new policy on this page and, if appropriate, 
              sending you a notice by email.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">11. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, you can contact us at: 
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
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} CleanFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
