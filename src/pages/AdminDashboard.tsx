import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  ClipboardList, 
  LogOut,
  Plus,
  Building2,
  Sparkles,
  Activity,
  TrendingUp,
  Clock,
  Eye,
  X,
  MapPin,
  Image as ImageIcon,
  Download,
  Home
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  address: string | null;
}

interface Staff {
  user_id: string;
  full_name: string;
}

interface ActivityItem {
  id: string;
  type: 'started' | 'completed';
  jobId: string;
  clientName: string;
  staffName: string;
  time: string;
}

interface Stats {
  todayJobs: number;
  activeStaff: number;
  completedToday: number;
  completionRate: number;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({ todayJobs: 0, activeStaff: 0, completedToday: 0, completionRate: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  
  // Create Job form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [newJob, setNewJob] = useState({
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
    
    // Subscribe to real-time job updates
    const channel = supabase
      .channel('admin-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Fetch upcoming jobs
    const { data: jobsData } = await supabase
      .from("jobs")
      .select(`
        id,
        location,
        scheduled_date,
        scheduled_time,
        status,
        start_time,
        end_time,
        notes,
        clients (name),
        profiles:assigned_staff_id (full_name)
      `)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(20);

    // Get today's stats
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

    // Fetch recent activity (jobs started or completed today)
    const { data: recentJobs } = await supabase
      .from("jobs")
      .select(`
        id,
        status,
        start_time,
        end_time,
        clients (name),
        profiles:assigned_staff_id (full_name)
      `)
      .eq("scheduled_date", today)
      .or("status.eq.in_progress,status.eq.completed")
      .order("updated_at", { ascending: false })
      .limit(10);

    // Transform to activity items
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
    
    const { data: staffData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", 
        (await supabase.from("user_roles").select("user_id").eq("role", "staff")).data?.map(r => r.user_id) || []
      );

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
    
    // Fetch photos for this job
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });
    
    setJobPhotos((data as JobPhoto[]) || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success";
      case "in_progress": return "bg-warning/10 text-warning";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const beforePhotos = jobPhotos.filter(p => p.photo_type === 'before');
  const afterPhotos = jobPhotos.filter(p => p.photo_type === 'after');

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
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Jobs</CardTitle>
              <Calendar className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.todayJobs}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
              <CheckCircle className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.completedToday}</div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.completionRate}%</div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.activeStaff}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Jobs List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Card className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">New Job</h3>
                        <p className="text-sm text-muted-foreground">Schedule cleaning</p>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Job</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Client *</Label>
                      <Select 
                        value={newJob.client_id} 
                        onValueChange={(v) => {
                          const client = clients.find(c => c.id === v);
                          setNewJob({ 
                            ...newJob, 
                            client_id: v,
                            location: client?.address || newJob.location
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Location *</Label>
                      <Input 
                        value={newJob.location}
                        onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>

                    <div>
                      <Label>Assign Staff *</Label>
                      <Select 
                        value={newJob.assigned_staff_id} 
                        onValueChange={(v) => setNewJob({ ...newJob, assigned_staff_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.map(staff => (
                            <SelectItem key={staff.user_id} value={staff.user_id}>
                              {staff.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date *</Label>
                        <Input 
                          type="date"
                          value={newJob.scheduled_date}
                          onChange={(e) => setNewJob({ ...newJob, scheduled_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Time *</Label>
                        <Input 
                          type="time"
                          value={newJob.scheduled_time}
                          onChange={(e) => setNewJob({ ...newJob, scheduled_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Task Checklist (one per line)</Label>
                      <Textarea 
                        value={newJob.checklist}
                        onChange={(e) => setNewJob({ ...newJob, checklist: e.target.value })}
                        placeholder="Empty trash bins&#10;Mop floors&#10;Clean windows"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label>Notes for Staff</Label>
                      <Textarea 
                        value={newJob.notes}
                        onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                        placeholder="Any special instructions..."
                        rows={2}
                      />
                    </div>

                    <Button onClick={handleCreateJob} className="w-full">
                      Create Job
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Card 
                className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate("/admin/properties")}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Home className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Properties</h3>
                    <p className="text-sm text-muted-foreground">Manage locations</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate("/admin/checklists")}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Checklists</h3>
                    <p className="text-sm text-muted-foreground">Manage templates</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate("/admin/staff")}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Staff</h3>
                    <p className="text-sm text-muted-foreground">Manage team</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Jobs List */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <CardTitle>Upcoming Jobs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming jobs scheduled. Create a new job to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => handleViewJob(job)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {job.clients?.name || "Unknown Client"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                              {job.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{job.location}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(job.scheduled_date), "MMM d, yyyy")} at {job.scheduled_time}
                            {job.profiles?.full_name && ` • ${job.profiles.full_name}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Live Feed */}
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Live Feed</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No activity yet today
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'completed' ? 'bg-success/10' : 'bg-warning/10'
                        }`}>
                          {activity.type === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <Clock className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{activity.staffName}</span>
                            {' '}{activity.type === 'completed' ? 'completed' : 'started'}{' '}
                            <span className="font-medium">{activity.clientName}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Job Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedJob.clients?.name || "Job Details"}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedJob.status)}`}>
                    {selectedJob.status.replace("_", " ")}
                  </span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium text-foreground">{selectedJob.location}</p>
                  </div>
                </div>

                {/* Time Info */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Schedule & Duration</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled</p>
                        <p className="font-medium text-foreground">
                          {format(new Date(selectedJob.scheduled_date), "MMM d")} at {selectedJob.scheduled_time}
                        </p>
                      </div>
                      {selectedJob.start_time && (
                        <div>
                          <p className="text-xs text-muted-foreground">Started</p>
                          <p className="font-medium text-success">
                            {format(new Date(selectedJob.start_time), "h:mm a")}
                          </p>
                        </div>
                      )}
                      {selectedJob.end_time && (
                        <div>
                          <p className="text-xs text-muted-foreground">Completed</p>
                          <p className="font-medium text-success">
                            {format(new Date(selectedJob.end_time), "h:mm a")}
                          </p>
                        </div>
                      )}
                      {selectedJob.start_time && selectedJob.end_time && (
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-bold text-primary">
                            {calculateDuration(selectedJob.start_time, selectedJob.end_time)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Photos Gallery */}
                {jobPhotos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      <p className="font-medium text-foreground">Evidence Photos ({jobPhotos.length})</p>
                    </div>
                    
                    {beforePhotos.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">Before ({beforePhotos.length})</p>
                        <div className="grid grid-cols-4 gap-2">
                          {beforePhotos.map((photo) => (
                            <a 
                              key={photo.id} 
                              href={photo.photo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              <img 
                                src={photo.photo_url} 
                                alt="Before"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {afterPhotos.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">After ({afterPhotos.length})</p>
                        <div className="grid grid-cols-4 gap-2">
                          {afterPhotos.map((photo) => (
                            <a 
                              key={photo.id} 
                              href={photo.photo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              <img 
                                src={photo.photo_url} 
                                alt="After"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {jobPhotos.length === 0 && selectedJob.status !== 'pending' && (
                  <div className="text-center py-6 bg-muted/50 rounded-lg">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No photos uploaded for this job</p>
                  </div>
                )}

                {/* Actions */}
                {selectedJob.status === 'completed' && (
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}