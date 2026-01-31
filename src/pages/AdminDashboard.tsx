import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAdminShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDuplicateJob } from "@/hooks/useDuplicateJob";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCreateJob } from "@/hooks/useCreateJob";
import { useJobDetail } from "@/hooks/useJobDetail";
import { useOnboarding } from "@/hooks/useOnboarding";
import { DashboardErrorState } from "@/components/admin/DashboardErrorState";
import { PendingPaymentsCard } from "@/components/admin/PendingPaymentsCard";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import {
  TodayKanban,
  TodayStats,
  UrgentAlerts,
  FloatingActionButton,
  CreateJobWizard,
  JobDetailDialog,
  AdminLayout,
  EmptyStateOnboarding,
} from "@/components/admin";

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  // Onboarding
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  
  // Data fetching
  const {
    jobs,
    stats,
    loading,
    error,
    isFromCache,
    retryCount,
    refreshData,
    retry,
  } = useDashboardData();

  // Job creation
  const {
    isCreateOpen,
    setIsCreateOpen,
    clients,
    staffList,
    newJob,
    setNewJob,
    handleCreateJob,
    fetchClientsAndStaff,
  } = useCreateJob(refreshData);

  // Job detail view
  const {
    selectedJob,
    jobPhotos,
    handleViewJob,
    closeJobDetail,
  } = useJobDetail();

  // Duplicate job
  const { duplicateJob, isDuplicating } = useDuplicateJob(refreshData);

  // Keyboard shortcuts
  useAdminShortcuts({
    onNewJob: () => setIsCreateOpen(true),
    onNavigateJobs: () => navigate('/admin/calendar'),
    onNavigateClients: () => navigate('/admin/clients'),
    onNavigateStaff: () => navigate('/admin/staff'),
    enabled: !isCreateOpen && !selectedJob,
  });

  // Initial data load and realtime subscription
  useEffect(() => {
    refreshData();
    
    const channel = supabase
      .channel('admin-jobs-today')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => refreshData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  // Show onboarding wizard for new users
  if (!onboardingLoading && showOnboarding) {
    return <OnboardingWizard onComplete={() => {
      completeOnboarding();
      refreshData();
    }} />;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Today's View</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <DashboardErrorState 
            error={error} 
            isFromCache={isFromCache}
            retryCount={retryCount}
            onRetry={retry}
          />
        )}

        {/* Urgent Alerts */}
        <UrgentAlerts jobs={jobs} />
        
        {/* Today Stats + Pending Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-3">
            <TodayStats stats={stats} />
          </div>
          <div className="lg:col-span-1">
            <PendingPaymentsCard />
          </div>
        </div>

        {/* Kanban Board or Empty State */}
        {!loading && jobs.length === 0 ? (
          <EmptyStateOnboarding
            onCreateJob={() => setIsCreateOpen(true)}
            hasClients={clients.length > 0}
            hasJobs={jobs.length > 0}
            hasStaff={staffList.length > 0}
          />
        ) : (
          <TodayKanban 
            jobs={jobs} 
            loading={loading}
            onViewJob={handleViewJob}
            onJobsChange={refreshData}
          />
        )}
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton 
        onClick={() => setIsCreateOpen(true)} 
        label="New Job"
      />

      {/* Create Job Wizard */}
      <CreateJobWizard
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        clients={clients}
        staffList={staffList}
        formData={newJob}
        onFormChange={setNewJob}
        onSubmit={handleCreateJob}
        onClientCreated={fetchClientsAndStaff}
      />

      {/* Job Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        photos={jobPhotos}
        onClose={closeJobDetail}
      />
    </AdminLayout>
  );
}
