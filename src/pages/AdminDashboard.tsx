import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import AlertsPanel from "@/components/AlertsPanel";
import { CSVReports } from "@/components/CSVReports";
import { PDFReports } from "@/components/PDFReports";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { NotificationCenter } from "@/components/NotificationCenter";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  StatsCards,
  QuickActions,
  JobsList,
  ActivityFeed,
  CreateJobDialog,
  JobDetailDialog,
  type Stats,
  type Job,
  type ActivityItem,
  type Client,
  type Staff,
  type NewJobData,
  type JobPhoto,
} from "@/components/admin";

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({ todayJobs: 0, activeStaff: 0, completedToday: 0, completionRate: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchData();
    fetchClientsAndStaff();
    
    const channel = supabase
      .channel('admin-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data: jobsData } = await supabase
      .from("jobs")
      .select(`
        id, location, scheduled_date, scheduled_time, status,
        start_time, end_time, notes, created_at,
        clients (name),
        profiles:assigned_staff_id (full_name)
      `)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(20);

    const { count: todayCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today);

    const { count: completedTodayCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("status", "completed");

    const { count: staffCount } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "staff");

    const { data: recentJobs } = await supabase
      .from("jobs")
      .select(`
        id, status, start_time, end_time,
        clients (name),
        profiles:assigned_staff_id (full_name)
      `)
      .eq("scheduled_date", today)
      .or("status.eq.in_progress,status.eq.completed")
      .order("updated_at", { ascending: false })
      .limit(10);

    const activityItems: ActivityItem[] = [];
    recentJobs?.forEach((job: Record<string, unknown>) => {
      const clients = job.clients as { name: string } | null;
      const profiles = job.profiles as { full_name: string } | null;
      
      if (job.status === 'completed' && job.end_time) {
        activityItems.push({
          id: `${job.id}-completed`,
          type: 'completed',
          jobId: job.id as string,
          clientName: clients?.name || 'Unknown',
          staffName: profiles?.full_name || 'Unknown',
          time: format(new Date(job.end_time as string), 'h:mm a')
        });
      }
      if (job.start_time) {
        activityItems.push({
          id: `${job.id}-started`,
          type: 'started',
          jobId: job.id as string,
          clientName: clients?.name || 'Unknown',
          staffName: profiles?.full_name || 'Unknown',
          time: format(new Date(job.start_time as string), 'h:mm a')
        });
      }
    });

    const todayTotal = todayCount || 0;
    const completedTotal = completedTodayCount || 0;
    const rate = todayTotal > 0 ? Math.round((completedTotal / todayTotal) * 100) : 0;

    setJobs((jobsData as unknown as Job[]) || []);
    setStats({
      todayJobs: todayTotal,
      activeStaff: staffCount || 0,
      completedToday: completedTotal,
      completionRate: rate
    });
    setActivities(activityItems.slice(0, 5));
    setLoading(false);
  };

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
      fetchData();
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalSearch />
            <NotificationCenter />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <QuickActions onNewJobClick={() => setIsCreateOpen(true)} />

            {/* Jobs List */}
            <JobsList 
              jobs={jobs} 
              loading={loading} 
              onViewJob={handleViewJob} 
            />
          </div>

          {/* Sidebar - Alerts & Activity */}
          <div className="space-y-6">
            <AlertsPanel />
            <ActivityFeed activities={activities} />
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="mt-8">
          <MetricsDashboard />
        </div>

        {/* Reports Section */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <PDFReports />
          <CSVReports />
        </div>
      </main>

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
    </div>
  );
}
