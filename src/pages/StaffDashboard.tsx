import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LogOut, Calendar, Smile, ChevronDown, Clock, Loader2 } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { format, addDays } from "date-fns";
import JobDetailView from "@/components/JobDetailView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useJobStatusChange } from "@/hooks/useJobStatusChange";
import { NextJobCard } from "@/components/staff/NextJobCard";
import { TodayJobsList } from "@/components/staff/TodayJobsList";
import { StaffAvailabilityCalendar } from "@/components/staff/StaffAvailabilityCalendar";

interface PropertyPhotos {
  id: string;
  photo_url: string;
  room_area: string | null;
}

interface Property {
  id: string;
  name: string;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  living_areas: number | null;
  floors: number | null;
  floor_type: string | null;
  has_pets: boolean | null;
  pet_details: string | null;
  has_pool: boolean | null;
  has_garage: boolean | null;
  special_instructions: string | null;
  access_codes: string | null;
  estimated_hours: number | null;
  google_maps_link: string | null;
  suburb: string | null;
  post_code: string | null;
  state: string | null;
  sofas: number | null;
  beds: number | null;
  dining_chairs: number | null;
  rugs: number | null;
}

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
  clients: { name: string } | null;
  properties: Property | null;
}

export default function StaffDashboard() {
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, PropertyPhotos[]>>({});
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { updatingJobId, advanceStatus } = useJobStatusChange(() => fetchMyJobs());

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
  };

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
    const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");
    
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
        clients (name),
        properties (
          id,
          name,
          address,
          bedrooms,
          bathrooms,
          living_areas,
          floors,
          floor_type,
          has_pets,
          pet_details,
          has_pool,
          has_garage,
          special_instructions,
          access_codes,
          estimated_hours,
          google_maps_link,
          suburb,
          post_code,
          state
        )
      `)
      .eq("assigned_staff_id", user?.id)
      .gte("scheduled_date", today)
      .lte("scheduled_date", nextWeek)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    const jobsData = (data as unknown as Job[]) || [];
    setJobs(jobsData);
    
    // Fetch property photos for jobs with properties
    const propertyIds = jobsData
      .filter(j => j.property_id)
      .map(j => j.property_id as string);
    
    if (propertyIds.length > 0) {
      const { data: photos } = await supabase
        .from("property_photos")
        .select("id, photo_url, room_area, property_id")
        .in("property_id", propertyIds);
      
      if (photos) {
        const photosMap: Record<string, PropertyPhotos[]> = {};
        photos.forEach((photo: any) => {
          if (!photosMap[photo.property_id]) {
            photosMap[photo.property_id] = [];
          }
          photosMap[photo.property_id].push(photo);
        });
        setPropertyPhotos(photosMap);
      }
    }
    
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed": 
        return { 
          bg: "bg-success/10", 
          text: "text-success", 
          border: "border-success/30",
          label: "✅ Completed",
          pulse: false
        };
      case "in_progress": 
        return { 
          bg: "bg-warning/10", 
          text: "text-warning", 
          border: "border-warning",
          label: "🔄 In Progress",
          pulse: true
        };
      default: 
        return { 
          bg: "bg-muted", 
          text: "text-muted-foreground", 
          border: "border-border",
          label: "⏳ Pending",
          pulse: false
        };
    }
  };

  // Group jobs by date
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayJobs = jobs.filter(j => j.scheduled_date === todayStr);
  const upcomingJobs = jobs.filter(j => j.scheduled_date !== todayStr);

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
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <PulcrixLogo />
            <div>
              <h1 className="text-xl font-bold text-foreground">Pulcrix</h1>
              <p className="text-sm text-muted-foreground">My Jobs</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="h-12 w-12"
            >
              {isSigningOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
            </Button>
          </div>
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
        ) : todayJobs.length === 0 && upcomingJobs.length === 0 ? (
          /* Empty State - Friendly message */
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
                <Smile className="h-10 w-10 text-success" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">🎉 Day Off!</h3>
              <p className="text-muted-foreground text-lg">
                No jobs scheduled. Enjoy your day!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Next Job - Hero Card */}
            {todayJobs.length > 0 && (
              <>
                <NextJobCard
                  job={todayJobs.find(j => j.status !== "completed") || todayJobs[0]}
                  isUpdating={updatingJobId === (todayJobs.find(j => j.status !== "completed") || todayJobs[0]).id}
                  onStartComplete={() => {
                    const nextJob = todayJobs.find(j => j.status !== "completed") || todayJobs[0];
                    advanceStatus(nextJob.id, nextJob.status);
                  }}
                  onViewDetails={() => {
                    const nextJob = todayJobs.find(j => j.status !== "completed") || todayJobs[0];
                    setSelectedJob(nextJob);
                  }}
                />

                {/* Today's Jobs List */}
                {todayJobs.length > 1 && (
                  <TodayJobsList
                    jobs={todayJobs}
                    currentJobId={(todayJobs.find(j => j.status !== "completed") || todayJobs[0]).id}
                    onSelectJob={(job) => setSelectedJob(job)}
                  />
                )}
              </>
            )}

            {/* Upcoming Jobs (simplified) */}
            {upcomingJobs.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-1 mb-2 hover:text-foreground transition-colors">
                  <ChevronDown className="h-4 w-4" />
                  📅 Upcoming ({upcomingJobs.length})
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2">
                    {upcomingJobs.slice(0, 3).map((job) => (
                      <Card 
                        key={job.id}
                        className="cursor-pointer active:scale-[0.98] transition-all opacity-70"
                        onClick={() => setSelectedJob(job)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                {format(new Date(job.scheduled_date), "EEE, MMM d")} • {job.scheduled_time}
                              </p>
                              <p className="font-medium text-foreground truncate">
                                {job.clients?.name || "Unknown"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {upcomingJobs.length > 3 && (
                      <p className="text-xs text-center text-muted-foreground py-2">
                        +{upcomingJobs.length - 3} more upcoming jobs
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Staff Availability Calendar */}
            <Collapsible className="pt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-1 mb-2 hover:text-foreground transition-colors w-full">
                <ChevronDown className="h-4 w-4" />
                <Clock className="h-4 w-4" />
                My Availability
              </CollapsibleTrigger>
              <CollapsibleContent>
                <StaffAvailabilityCalendar compact />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </main>
    </div>
  );
}