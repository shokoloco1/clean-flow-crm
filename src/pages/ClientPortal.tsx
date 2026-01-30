import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  User,
  Building2,
  Eye,
  Lock,
  AlertCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
}

interface PortalJob {
  id: string;
  client_id: string;
  client_name: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  staff_name: string | null;
  property_name: string | null;
  photos: JobPhoto[] | null;
}

export default function ClientPortal() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  
  const [token, setToken] = useState(tokenFromUrl || "");
  const [inputToken, setInputToken] = useState("");
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PortalJob | null>(null);

  useEffect(() => {
    if (tokenFromUrl) {
      fetchClientData(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const fetchClientData = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.rpc('get_client_portal_data', {
        p_token: accessToken
      });

      if (fetchError) {
        throw fetchError;
      }

      if (!data || data.length === 0) {
        setError("Invalid access code or no jobs registered");
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Parse the data properly - photos comes as jsonb
      const typedJobs: PortalJob[] = data.map((job: any) => ({
        ...job,
        photos: Array.isArray(job.photos) ? job.photos : []
      }));
      setJobs(typedJobs);
      setClientName(typedJobs[0]?.client_name || "Client");
      setToken(accessToken);
      setAuthenticated(true);
    } catch (err: any) {
      setError("Error accessing portal. Please check your access code.");
      setAuthenticated(false);
    }
    
    setLoading(false);
  };

  const handleSubmitToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      fetchClientData(inputToken.trim());
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { 
          label: "Completed", 
          variant: "default" as const,
          className: "bg-success/10 text-success border-success/30"
        };
      case "in_progress":
        return { 
          label: "In Progress", 
          variant: "secondary" as const,
          className: "bg-warning/10 text-warning border-warning/30"
        };
      default:
        return { 
          label: "Scheduled", 
          variant: "outline" as const,
          className: "bg-muted text-muted-foreground"
        };
    }
  };

  const scheduledJobs = jobs.filter(j => j.status === "pending");
  const inProgressJobs = jobs.filter(j => j.status === "in_progress");
  const completedJobs = jobs.filter(j => j.status === "completed");

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
                <p className="text-sm text-muted-foreground">Client Portal</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Login Form */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Portal Access</CardTitle>
              <CardDescription>
                Enter your unique access code to view your cleaning jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitToken} className="space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter your access code"
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    className="pr-10 h-12 text-center font-mono text-lg tracking-wider"
                    disabled={loading}
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={loading || !inputToken.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Access Portal
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-6">
                Don't have a code? Contact your cleaning service provider.
              </p>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-4">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            Powered by CleanFlow
          </div>
        </footer>
      </div>
    );
  }

  // Portal Dashboard
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
              <p className="text-sm text-muted-foreground">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Building2 className="h-3 w-3 mr-1" />
              {clientName}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setAuthenticated(false);
                setToken("");
                setJobs([]);
                setInputToken("");
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome, {clientName}
            </h2>
            <p className="text-muted-foreground">
              Here you can view your cleaning service history and scheduled jobs.
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="text-2xl font-bold">{scheduledJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <JobList 
              jobs={jobs} 
              onViewJob={setSelectedJob} 
              getStatusConfig={getStatusConfig}
            />
          </TabsContent>
          <TabsContent value="scheduled">
            <JobList 
              jobs={scheduledJobs} 
              onViewJob={setSelectedJob}
              getStatusConfig={getStatusConfig}
              emptyMessage="No scheduled jobs"
            />
          </TabsContent>
          <TabsContent value="progress">
            <JobList 
              jobs={inProgressJobs} 
              onViewJob={setSelectedJob}
              getStatusConfig={getStatusConfig}
              emptyMessage="No jobs in progress"
            />
          </TabsContent>
          <TabsContent value="completed">
            <JobList 
              jobs={completedJobs} 
              onViewJob={setSelectedJob}
              getStatusConfig={getStatusConfig}
              emptyMessage="No completed jobs"
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>Service Details</span>
                  <Badge className={getStatusConfig(selectedJob.status).className}>
                    {getStatusConfig(selectedJob.status).label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {format(parseISO(selectedJob.scheduled_date), "EEEE, d MMMM yyyy")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Scheduled Time</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {selectedJob.scheduled_time}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selectedJob.location}
                  </p>
                  {selectedJob.property_name && (
                    <p className="text-sm text-muted-foreground ml-6">
                      Property: {selectedJob.property_name}
                    </p>
                  )}
                </div>

                {/* Staff */}
                {selectedJob.staff_name && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Assigned Staff</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {selectedJob.staff_name}
                    </p>
                  </div>
                )}

                {/* Time Details for completed jobs */}
                {selectedJob.status === "completed" && selectedJob.start_time && selectedJob.end_time && (
                  <Card className="bg-success/5 border-success/20">
                    <CardContent className="py-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Start</p>
                          <p className="font-semibold text-success">
                            {format(new Date(selectedJob.start_time), "HH:mm")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">End</p>
                          <p className="font-semibold text-success">
                            {format(new Date(selectedJob.end_time), "HH:mm")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-semibold text-success">
                            {calculateDuration(selectedJob.start_time, selectedJob.end_time)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Photos */}
                {selectedJob.photos && selectedJob.photos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Service Photos ({selectedJob.photos.length})
                    </h4>
                    
                    {/* Before Photos */}
                    {selectedJob.photos.filter(p => p.photo_type === 'before').length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Before</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedJob.photos.filter(p => p.photo_type === 'before').map(photo => (
                            <img 
                              key={photo.id} 
                              src={photo.photo_url} 
                              alt="Before" 
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* After Photos */}
                    {selectedJob.photos.filter(p => p.photo_type === 'after').length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">After</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedJob.photos.filter(p => p.photo_type === 'after').map(photo => (
                            <img 
                              key={photo.id} 
                              src={photo.photo_url} 
                              alt="After" 
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selectedJob.notes && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{selectedJob.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Powered by CleanFlow
        </div>
      </footer>
    </div>
  );
}

// Job List Component
interface JobListProps {
  jobs: PortalJob[];
  onViewJob: (job: PortalJob) => void;
  getStatusConfig: (status: string) => { label: string; variant: "default" | "secondary" | "outline"; className: string };
  emptyMessage?: string;
}

function JobList({ jobs, onViewJob, getStatusConfig, emptyMessage = "No jobs found" }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {jobs.map(job => {
        const statusConfig = getStatusConfig(job.status);
        return (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(parseISO(job.scheduled_date), "EEEE, d MMM yyyy")}
                    </span>
                    <span className="text-muted-foreground">at {job.scheduled_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{job.property_name || job.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => onViewJob(job)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}