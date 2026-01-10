import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LogOut,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Calendar,
  Smile
} from "lucide-react";
import { format } from "date-fns";
import JobDetailView from "@/components/JobDetailView";

interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  checklist: string[];
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  property_id: string | null;
  clients: { name: string; access_codes: string | null } | null;
}

export default function StaffDashboard() {
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyJobs();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('my-jobs')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'jobs',
            filter: `assigned_staff_id=eq.${user.id}`
          },
          () => {
            fetchMyJobs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMyJobs = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data } = await supabase
      .from("jobs")
      .select(`
        id,
        location,
        scheduled_date,
        scheduled_time,
        status,
        checklist,
        start_time,
        end_time,
        notes,
        property_id,
        clients (name, access_codes)
      `)
      .eq("assigned_staff_id", user?.id)
      .eq("scheduled_date", today)
      .order("scheduled_time", { ascending: true });

    setJobs((data as unknown as Job[]) || []);
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed": 
        return { 
          bg: "bg-success/10", 
          text: "text-success", 
          border: "border-success/30",
          label: "Completed",
          pulse: false
        };
      case "in_progress": 
        return { 
          bg: "bg-warning/10", 
          text: "text-warning", 
          border: "border-warning",
          label: "In Progress",
          pulse: true
        };
      default: 
        return { 
          bg: "bg-muted", 
          text: "text-muted-foreground", 
          border: "border-border",
          label: "Pending",
          pulse: false
        };
    }
  };

  if (selectedJob) {
    return (
      <JobDetailView 
        job={selectedJob} 
        onBack={() => {
          setSelectedJob(null);
          fetchMyJobs();
        }}
        onUpdate={fetchMyJobs}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
              <p className="text-sm text-muted-foreground">My Jobs Today</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut}
            className="h-12 w-12"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 pb-24">
        {/* Date Header */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-semibold text-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-muted-foreground">Loading your jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          /* Empty State - Friendly message */
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
                <Smile className="h-10 w-10 text-success" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">All Caught Up!</h3>
              <p className="text-muted-foreground text-lg">
                No jobs scheduled for today. Enjoy your day off!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Jobs Count */}
            <p className="text-sm text-muted-foreground px-2">
              {jobs.length} job{jobs.length > 1 ? "s" : ""} scheduled
            </p>
            
            {jobs.map((job) => {
              const statusConfig = getStatusConfig(job.status);
              
              return (
                <Card 
                  key={job.id}
                  className={`
                    border-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]
                    ${statusConfig.border}
                    ${statusConfig.pulse ? "animate-pulse" : ""}
                  `}
                  onClick={() => setSelectedJob(job)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Client Name */}
                        <h3 className="font-bold text-foreground text-xl mb-1 truncate">
                          {job.clients?.name || "Unknown Client"}
                        </h3>
                        
                        {/* Status Badge */}
                        <div className="mb-3">
                          <span className={`
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
                            ${statusConfig.bg} ${statusConfig.text}
                          `}>
                            {job.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {job.status === "in_progress" && <Clock className="h-3.5 w-3.5" />}
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        {/* Location */}
                        <div className="flex items-start gap-2 text-muted-foreground mb-2">
                          <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <span className="text-base line-clamp-2">{job.location}</span>
                        </div>
                        
                        {/* Time */}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-5 w-5 flex-shrink-0" />
                          <span className="text-base font-medium">{job.scheduled_time}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/50">
                        <ChevronRight className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}