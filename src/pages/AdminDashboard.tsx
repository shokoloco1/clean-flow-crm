import { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import AlertsPanel from "@/components/AlertsPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useFetchWithRetry } from "@/hooks/useFetchWithRetry";
import { DashboardErrorState } from "@/components/admin/DashboardErrorState";
import {
  StatsCards,
  QuickActions,
  JobsList,
  ActivityFeed,
  CreateJobDialog,
  JobDetailDialog,
  AdminLayout,
  type Stats,
  type Job,
  type ActivityItem,
  type Client,
  type Staff,
  type NewJobData,
  type JobPhoto,
} from "@/components/admin";

// Lazy load heavy components
const MetricsDashboard = lazy(() => import("@/components/MetricsDashboard").then(m => ({ default: m.MetricsDashboard })));
const PDFReports = lazy(() => import("@/components/PDFReports").then(m => ({ default: m.PDFReports })));
const CSVReports = lazy(() => import("@/components/CSVReports").then(m => ({ default: m.CSVReports })));

interface DashboardData {
  jobs: Job[];
  stats: Stats;
  activities: ActivityItem[];
}

export default function AdminDashboard() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  
  // Create Job state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [newJob, setNewJob] = useState<NewJobData>({
    client_id: '',
    location: '',
    assigned_staff_id: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '09:00',
    notes: '',
    checklist: ''
  });

  // Fetch function wrapped in useCallback for stability
  const fetchDashboardData = useCallback(async (): Promise<DashboardData> => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Batch all independent queries in parallel
    const [jobsRes, todayCountRes, completedCountRes, staffCountRes, recentJobsRes] = await Promise.all([
      supabase
        .from("jobs")
        .select(`
          id, location, scheduled_date, scheduled_time, status,
          start_time, end_time, notes, created_at, assigned_staff_id,
          clients (name)
        `)
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true })
        .limit(20),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today)
        .eq("status", "completed"),
      supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "staff"),
      supabase
        .from("jobs")
        .select(`id, status, start_time, end_time, assigned_staff_id, clients (name)`)
        .eq("scheduled_date", today)
        .or("status.eq.in_progress,status.eq.completed")
        .order("updated_at", { ascending: false })
        .limit(10)
    ]);

    // Check for errors in critical queries
    if (jobsRes.error) throw new Error(jobsRes.error.message);

    // Collect all staff IDs and fetch profiles in one query
    const allStaffIds = new Set<string>();
    jobsRes.data?.forEach((j: any) => j.assigned_staff_id && allStaffIds.add(j.assigned_staff_id));
    recentJobsRes.data?.forEach((j: any) => j.assigned_staff_id && allStaffIds.add(j.assigned_staff_id));
    
    let staffMap: Record<string, string> = {};
    if (allStaffIds.size > 0) {
      const { data: staffData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(allStaffIds));
      staffMap = Object.fromEntries((staffData || []).map(s => [s.user_id, s.full_name]));
    }

    // Map staff names to jobs
    const jobsWithStaff = (jobsRes.data || []).map((job: any) => ({
      ...job,
      profiles: job.assigned_staff_id ? { full_name: staffMap[job.assigned_staff_id] || 'Unknown' } : null
    }));

    const activityItems: ActivityItem[] = [];
    recentJobsRes.data?.forEach((job: any) => {
      const clientName = job.clients?.name || 'Unknown';
      const staffName = job.assigned_staff_id ? staffMap[job.assigned_staff_id] || 'Unknown' : 'Unknown';
      
      if (job.status === 'completed' && job.end_time) {
        activityItems.push({
          id: `${job.id}-completed`,
          type: 'completed',
          jobId: job.id,
          clientName,
          staffName,
          time: format(new Date(job.end_time), 'h:mm a')
        });
      }
      if (job.start_time) {
        activityItems.push({
          id: `${job.id}-started`,
          type: 'started',
          jobId: job.id,
          clientName,
          staffName,
          time: format(new Date(job.start_time), 'h:mm a')
        });
      }
    });

    const todayTotal = todayCountRes.count || 0;
    const completedTotal = completedCountRes.count || 0;
    const rate = todayTotal > 0 ? Math.round((completedTotal / todayTotal) * 100) : 0;

    return {
      jobs: jobsWithStaff as Job[],
      stats: {
        todayJobs: todayTotal,
        activeStaff: staffCountRes.count || 0,
        completedToday: completedTotal,
        completionRate: rate
      },
      activities: activityItems.slice(0, 5)
    };
  }, []);

  // Use the robust fetch hook with timeout, retry, and cache
  const { 
    data: dashboardData, 
    loading, 
    error, 
    isFromCache,
    retryCount,
    isRetrying,
    execute: refreshData,
    retry 
  } = useFetchWithRetry<DashboardData>(fetchDashboardData, {
    cacheKey: 'admin-dashboard-data',
    timeout: 8000,
    maxRetries: 2,
    retryDelay: 1500,
  });

  // Extract data from the hook
  const jobs = dashboardData?.jobs || [];
  const stats = dashboardData?.stats || { todayJobs: 0, activeStaff: 0, completedToday: 0, completionRate: 0 };
  const activities = dashboardData?.activities || [];

  useEffect(() => {
    refreshData();
    fetchClientsAndStaff();
    
    const channel = supabase
      .channel('admin-jobs')
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

  const fetchClientsAndStaff = async () => {
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, address")
      .order("name");
    
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "staff");
    
    const staffIds = staffRoles?.map(r => r.user_id) || [];
    
    const { data: staffData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", staffIds);

    setClients((clientsData as Client[]) || []);
    setStaffList((staffData as Staff[]) || []);
  };

  const handleCreateJob = async () => {
    if (!newJob.client_id || !newJob.location || !newJob.assigned_staff_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    const checklistArray = newJob.checklist
      .split('\n')
      .filter(item => item.trim())
      .map(item => item.trim());

    const { error } = await supabase.from("jobs").insert({
      client_id: newJob.client_id,
      location: newJob.location,
      assigned_staff_id: newJob.assigned_staff_id,
      scheduled_date: newJob.scheduled_date,
      scheduled_time: newJob.scheduled_time,
      notes: newJob.notes || null,
      checklist: checklistArray
    });

    if (error) {
      toast.error("Failed to create job");
    } else {
      toast.success("Job created successfully!");
      setIsCreateOpen(false);
      setNewJob({
        client_id: '',
        location: '',
        assigned_staff_id: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: '09:00',
        notes: '',
        checklist: ''
      });
      refreshData();
    }
  };

  const handleViewJob = async (job: Job) => {
    setSelectedJob(job);
    
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });
    
    setJobPhotos((data as JobPhoto[]) || []);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-4 md:py-8">
        <Breadcrumbs />
        
        {/* Error State */}
        {error && (
          <DashboardErrorState 
            error={error} 
            isFromCache={isFromCache}
            retryCount={retryCount}
            onRetry={retry}
          />
        )}
        
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Quick Actions */}
            <QuickActions onNewJobClick={() => setIsCreateOpen(true)} />

            {/* Jobs List */}
            <JobsList 
              jobs={jobs} 
              loading={loading}
              error={error}
              isRetrying={isRetrying}
              onViewJob={handleViewJob}
              onRetry={retry}
            />
          </div>

          {/* Sidebar - Alerts & Activity - Hidden on mobile, shown in drawer trigger */}
          <div className="hidden lg:block space-y-6">
            <AlertsPanel />
            <ActivityFeed activities={activities} />
          </div>
          
          {/* Mobile: Show sidebar content in collapsible sections */}
          <div className="lg:hidden space-y-4">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer p-3 bg-card border border-border rounded-lg">
                <span className="font-semibold text-foreground">Alerts & Activity</span>
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-4 space-y-4">
                <AlertsPanel />
                <ActivityFeed activities={activities} />
              </div>
            </details>
          </div>
        </div>

        {/* Metrics Dashboard - Lazy loaded */}
        <Suspense fallback={
          <div className="mt-8 flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }>
          <div className="mt-8">
            <MetricsDashboard />
          </div>

          {/* Reports Section */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <PDFReports />
            <CSVReports />
          </div>
        </Suspense>
      </div>

      {/* Create Job Dialog */}
      <CreateJobDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        clients={clients}
        staffList={staffList}
        formData={newJob}
        onFormChange={setNewJob}
        onSubmit={handleCreateJob}
      />

      {/* Job Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        photos={jobPhotos}
        onClose={() => setSelectedJob(null)}
      />
    </AdminLayout>
  );
}
