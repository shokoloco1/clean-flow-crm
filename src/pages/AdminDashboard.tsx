import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  ClipboardList, 
  LogOut,
  Plus,
  Building2,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

interface Stats {
  todayJobs: number;
  activeStaff: number;
  completedJobs: number;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({ todayJobs: 0, activeStaff: 0, completedJobs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Fetch today's jobs
    const { data: jobsData } = await supabase
      .from("jobs")
      .select(`
        id,
        location,
        scheduled_date,
        scheduled_time,
        status,
        clients (name),
        profiles:assigned_staff_id (full_name)
      `)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(10);

    // Get stats
    const { count: todayCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today);

    const { count: staffCount } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "staff");

    const { count: completedCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    setJobs((jobsData as unknown as Job[]) || []);
    setStats({
      todayJobs: todayCount || 0,
      activeStaff: staffCount || 0,
      completedJobs: completedCount || 0
    });
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success";
      case "in_progress": return "bg-warning/10 text-warning";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
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
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Staff</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.activeStaff}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.completedJobs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Create New Job</h3>
                <p className="text-sm text-muted-foreground">Schedule a cleaning job</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Manage Clients</h3>
                <p className="text-sm text-muted-foreground">View and edit client database</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Jobs */}
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
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {job.clients?.name || "Unknown Client"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.location}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(job.scheduled_date), "MMM d, yyyy")} at {job.scheduled_time}
                        {job.profiles?.full_name && ` • Assigned to ${job.profiles.full_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
