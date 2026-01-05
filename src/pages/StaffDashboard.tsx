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
  Calendar
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
  photo_urls: string[];
  clients: { name: string } | null;
}

export default function StaffDashboard() {
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyJobs();
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
        photo_urls,
        clients (name)
      `)
      .eq("assigned_staff_id", user?.id)
      .eq("scheduled_date", today)
      .order("scheduled_time", { ascending: true });

    setJobs((data as unknown as Job[]) || []);
    setLoading(false);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "completed": 
        return { bg: "bg-success", text: "text-success-foreground", icon: CheckCircle2 };
      case "in_progress": 
        return { bg: "bg-warning", text: "text-warning-foreground", icon: Clock };
      default: 
        return { bg: "bg-muted", text: "text-muted-foreground", icon: Clock };
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
      <header className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">CleanFlow</h1>
              <p className="text-xs text-muted-foreground">My Jobs Today</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6">
        {/* Date Header */}
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-primary">Loading your jobs...</div>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Jobs Today</h3>
              <p className="text-muted-foreground">
                You don't have any jobs scheduled for today. Enjoy your day off!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const statusStyles = getStatusStyles(job.status);
              const StatusIcon = statusStyles.icon;
              
              return (
                <Card 
                  key={job.id}
                  className="border-border shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => setSelectedJob(job)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Client Name & Status */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-foreground text-lg">
                            {job.clients?.name || "Unknown Client"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
                            {job.status.replace("_", " ")}
                          </span>
                        </div>
                        
                        {/* Location */}
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm line-clamp-1">{job.location}</span>
                        </div>
                        
                        {/* Time */}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">{job.scheduled_time}</span>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-6 w-6 text-muted-foreground mt-2" />
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
