import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useFetchWithRetry } from "@/hooks/useFetchWithRetry";
import { DashboardErrorState } from "@/components/admin/DashboardErrorState";
import {
  TodayKanban,
  TodayStats,
  UrgentAlerts,
  FloatingActionButton,
  CreateJobDialog,
  JobDetailDialog,
  AdminLayout,
  type Stats,
  type Job,
  type Client,
  type Staff,
  type NewJobData,
  type JobPhoto,
} from "@/components/admin";

interface DashboardData {
  jobs: Job[];
  stats: Stats;
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
    
    // Fetch today's jobs with all statuses
    const [jobsRes, todayCountRes, completedCountRes] = await Promise.all([
      supabase
        .from("jobs")
        .select(`
          id, location, scheduled_date, scheduled_time, status,
          start_time, end_time, notes, created_at, assigned_staff_id,
          clients (name)
        `)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true }),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today)
        .eq("status", "completed"),
    ]);

    if (jobsRes.error) throw new Error(jobsRes.error.message);

    // Collect all staff IDs and fetch profiles in one query
    const allStaffIds = new Set<string>();
    jobsRes.data?.forEach((j: any) => j.assigned_staff_id && allStaffIds.add(j.assigned_staff_id));
    
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

    const todayTotal = todayCountRes.count || 0;
    const completedTotal = completedCountRes.count || 0;
    const rate = todayTotal > 0 ? Math.round((completedTotal / todayTotal) * 100) : 0;

    return {
      jobs: jobsWithStaff as Job[],
      stats: {
        todayJobs: todayTotal,
        activeStaff: 0,
        completedToday: completedTotal,
        completionRate: rate
      },
    };
  }, []);

  // Use the robust fetch hook with timeout, retry, and cache
  const { 
    data: dashboardData, 
    loading, 
    error, 
    isFromCache,
    retryCount,
    execute: refreshData,
    retry 
  } = useFetchWithRetry<DashboardData>(fetchDashboardData, {
    cacheKey: 'admin-dashboard-today',
    timeout: 8000,
    maxRetries: 2,
    retryDelay: 1500,
  });

  // Extract data from the hook
  const jobs = dashboardData?.jobs || [];
  const stats = dashboardData?.stats || { todayJobs: 0, activeStaff: 0, completedToday: 0, completionRate: 0 };

  useEffect(() => {
    refreshData();
    fetchClientsAndStaff();
    
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
        
        {/* Today Stats */}
        <TodayStats stats={stats} />

        {/* Kanban Board */}
        <TodayKanban 
          jobs={jobs} 
          loading={loading}
          onViewJob={handleViewJob}
        />
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton 
        onClick={() => setIsCreateOpen(true)} 
        label="New Job"
      />

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
