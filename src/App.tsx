import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingProvider } from "@/components/OnboardingProvider";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load heavy pages for code splitting
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const PropertiesPage = lazy(() => import("./pages/PropertiesPage"));
const ChecklistTemplatesPage = lazy(() => import("./pages/ChecklistTemplatesPage"));
const StaffManagementPage = lazy(() => import("./pages/StaffManagementPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const RecurringJobsPage = lazy(() => import("./pages/RecurringJobsPage"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
          <AuthProvider>
            <OnboardingProvider>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/properties" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <PropertiesPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/checklists" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <ChecklistTemplatesPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/staff" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <StaffManagementPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/calendar" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <CalendarPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/clients" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <ClientsPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/recurring" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <RecurringJobsPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/settings" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <SettingsPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/invoices" 
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <InvoicesPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/staff"
                      element={
                        <ProtectedRoute allowedRoles={["staff"]}>
                          <StaffDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/portal" element={<ClientPortal />} />
                    <Route path="/install" element={<InstallPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <PWAInstallBanner />
            </OnboardingProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
