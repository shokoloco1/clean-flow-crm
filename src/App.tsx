import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import PropertiesPage from "./pages/PropertiesPage";
import ChecklistTemplatesPage from "./pages/ChecklistTemplatesPage";
import StaffManagementPage from "./pages/StaffManagementPage";
import CalendarPage from "./pages/CalendarPage";
import ClientsPage from "./pages/ClientsPage";
import RecurringJobsPage from "./pages/RecurringJobsPage";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={["staff"]}>
                  <StaffDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/portal" element={<ClientPortal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
