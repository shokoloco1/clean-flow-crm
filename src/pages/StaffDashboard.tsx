import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Calendar,
  Smile,
  Bath,
  Bed,
  PawPrint,
  Timer,
  Play,
  Loader2
} from "lucide-react";
import { format, addDays } from "date-fns";
import JobDetailView from "@/components/JobDetailView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useJobStatusChange } from "@/hooks/useJobStatusChange";

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
  const { updatingJobId, advanceStatus } = useJobStatusChange(() => fetchMyJobs());

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
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
              <p className="text-sm text-muted-foreground">My Jobs</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut}
              className="h-12 w-12"
            >
              <LogOut className="h-5 w-5" />
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
          <div className="space-y-6">
            {/* Today's Jobs */}
            {todayJobs.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground px-2">
                  📋 {todayJobs.length} job{todayJobs.length > 1 ? "s" : ""} for today
                </p>
                
                {todayJobs.map((job) => {
                  const statusConfig = getStatusConfig(job.status);
                  const photos = job.property_id ? propertyPhotos[job.property_id] || [] : [];
                  const isUpdating = updatingJobId === job.id;
                  
                  return (
                    <Card 
                      key={job.id}
                      className={`
                        border-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]
                        ${statusConfig.border}
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
                            
                            {/* Property Quick Info */}
                            {job.properties && (
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3 bg-muted/50 p-2 rounded-lg">
                                {(job.properties.bedrooms ?? 0) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="h-4 w-4" />
                                    {job.properties.bedrooms} bed
                                  </span>
                                )}
                                {(job.properties.bathrooms ?? 0) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bath className="h-4 w-4" />
                                    {job.properties.bathrooms} bath
                                  </span>
                                )}
                                {job.properties.has_pets && (
                                  <span className="flex items-center gap-1 text-warning">
                                    <PawPrint className="h-4 w-4" />
                                    Pets
                                  </span>
                                )}
                                {job.properties.estimated_hours && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-4 w-4" />
                                    ~{job.properties.estimated_hours}h
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Property Photo Preview */}
                            {photos.length > 0 && (
                              <div className="flex gap-1 mb-3">
                                {photos.slice(0, 3).map((photo) => (
                                  <div key={photo.id} className="w-14 h-14 rounded-md overflow-hidden bg-muted">
                                    <img src={photo.photo_url} className="w-full h-full object-cover" alt="" />
                                  </div>
                                ))}
                                {photos.length > 3 && (
                                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                    +{photos.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                            
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
                          
                          <div className="flex flex-col items-center gap-2">
                            {/* Quick Status Button */}
                            {job.status !== "completed" && job.status !== "cancelled" && (
                              <Button
                                size="lg"
                                className={`
                                  h-14 w-14 rounded-full shadow-lg
                                  ${job.status === "in_progress" 
                                    ? "bg-green-500 hover:bg-green-600" 
                                    : "bg-blue-500 hover:bg-blue-600"
                                  }
                                `}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  advanceStatus(job.id, job.status);
                                }}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                                ) : job.status === "in_progress" ? (
                                  <CheckCircle2 className="h-6 w-6 text-white" />
                                ) : (
                                  <Play className="h-6 w-6 text-white" />
                                )}
                              </Button>
                            )}
                            {job.status === "completed" && (
                              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Upcoming Jobs */}
            {upcomingJobs.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground px-2">
                  📅 Upcoming ({upcomingJobs.length})
                </p>
                
                {upcomingJobs.map((job) => {
                  const statusConfig = getStatusConfig(job.status);
                  
                  return (
                    <Card 
                      key={job.id}
                      className="border shadow-sm transition-all cursor-pointer active:scale-[0.98] opacity-80"
                      onClick={() => setSelectedJob(job)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {format(new Date(job.scheduled_date), "EEE, MMM d")}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{job.scheduled_time}</span>
                            </div>
                            <h3 className="font-semibold text-foreground truncate">
                              {job.clients?.name || "Unknown Client"}
                            </h3>
                            {job.properties && (
                              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                {(job.properties.bedrooms ?? 0) > 0 && (
                                  <span>{job.properties.bedrooms} bed</span>
                                )}
                                {(job.properties.bathrooms ?? 0) > 0 && (
                                  <span>{job.properties.bathrooms} bath</span>
                                )}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
