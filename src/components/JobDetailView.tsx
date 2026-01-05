import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Camera,
  Play,
  ExternalLink,
  CheckSquare,
  Loader2,
  Navigation,
  AlertTriangle,
  Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  clients: { name: string; access_codes: string | null } | null;
}

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  created_at: string;
}

interface JobDetailViewProps {
  job: Job;
  onBack: () => void;
  onUpdate: () => void;
}

export default function JobDetailView({ job, onBack, onUpdate }: JobDetailViewProps) {
  const [currentJob, setCurrentJob] = useState(job);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [photoType, setPhotoType] = useState<'before' | 'after'>('before');

  useEffect(() => {
    fetchPhotos();
  }, [job.id]);

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });
    
    setPhotos((data as JobPhoto[]) || []);
  };

  const captureGPSLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.warning("GPS not available on this device");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("GPS Error:", error);
          toast.warning("Could not capture GPS location. Proceeding without it.");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleStartJob = async () => {
    setIsUpdating(true);
    
    // Capture GPS location
    const location = await captureGPSLocation();
    
    const updateData: Record<string, unknown> = {
      status: "in_progress",
      start_time: new Date().toISOString()
    };
    
    if (location) {
      updateData.location_lat = location.lat;
      updateData.location_lng = location.lng;
    }

    const { error } = await supabase
      .from("jobs")
      .update(updateData)
      .eq("id", currentJob.id);

    if (error) {
      toast.error("Failed to start job");
    } else {
      setCurrentJob({ 
        ...currentJob, 
        status: "in_progress", 
        start_time: new Date().toISOString() 
      });
      toast.success(location ? "Job started with GPS location!" : "Job started!");
      onUpdate();
    }
    setIsUpdating(false);
  };

  const handleCompleteJob = async () => {
    // Check if at least one photo is uploaded
    if (photos.length === 0) {
      toast.error("Please upload at least one photo before completing the job");
      return;
    }
    
    setIsUpdating(true);
    const { error } = await supabase
      .from("jobs")
      .update({ 
        status: "completed", 
        end_time: new Date().toISOString() 
      })
      .eq("id", currentJob.id);

    if (error) {
      toast.error("Failed to complete job");
    } else {
      setCurrentJob({ 
        ...currentJob, 
        status: "completed", 
        end_time: new Date().toISOString() 
      });
      toast.success("Job completed! Great work!");
      onUpdate();
    }
    setIsUpdating(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentJob.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job-evidence')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('job-evidence')
        .getPublicUrl(uploadData.path);

      // Save to job_photos table
      const { error: dbError } = await supabase
        .from('job_photos')
        .insert({
          job_id: currentJob.id,
          photo_url: urlData.publicUrl,
          photo_type: photoType
        });

      if (dbError) {
        console.error('DB error:', dbError);
        toast.error(`Failed to save photo record`);
      }
    }
    
    await fetchPhotos();
    toast.success(`${files.length} photo(s) uploaded!`);
    setIsUploading(false);
    
    // Reset file input
    e.target.value = '';
  };

  const openInMaps = () => {
    const encodedAddress = encodeURIComponent(currentJob.location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
  };

  const checklist = Array.isArray(currentJob.checklist) ? currentJob.checklist : [];
  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');

  const calculateDuration = () => {
    if (!currentJob.start_time) return null;
    const endTime = currentJob.end_time ? new Date(currentJob.end_time) : new Date();
    const startTime = new Date(currentJob.start_time);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 safe-area-inset-top">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-12 w-12"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground truncate">
              {currentJob.clients?.name || "Job Details"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(currentJob.scheduled_date), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-5 pb-32">
        {/* Location Card with Maps Button */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Location</span>
                </div>
                <p className="text-muted-foreground ml-7 text-base">{currentJob.location}</p>
              </div>
              <Button 
                onClick={openInMaps}
                className="h-14 px-5 bg-primary"
              >
                <Navigation className="h-5 w-5 mr-2" />
                Maps
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Access Codes (if available) */}
        {currentJob.clients?.access_codes && (
          <Card className="border-warning/50 bg-warning/5 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="font-semibold text-foreground">Access Codes</span>
              </div>
              <p className="text-foreground ml-7 text-base font-mono">
                {currentJob.clients.access_codes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Time & Duration Card */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Schedule</span>
            </div>
            <div className="ml-7 space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Scheduled:</span>
                <span className="font-medium text-foreground">{currentJob.scheduled_time}</span>
              </div>
              {currentJob.start_time && (
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">Started:</span>
                  <span className="font-medium text-success">
                    {format(new Date(currentJob.start_time), "h:mm a")}
                  </span>
                </div>
              )}
              {currentJob.end_time && (
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium text-success">
                    {format(new Date(currentJob.end_time), "h:mm a")}
                  </span>
                </div>
              )}
              {currentJob.start_time && (
                <div className="flex justify-between text-base pt-2 border-t border-border">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-bold text-primary">
                    {calculateDuration()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist Card */}
        {checklist.length > 0 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckSquare className="h-5 w-5 text-primary" />
                Task Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {checklist.map((task, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50"
                  >
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground text-base">{task}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Notes */}
        {currentJob.notes && (
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Notes from Admin</span>
              </div>
              <p className="text-muted-foreground ml-7 text-base">
                {currentJob.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Photos Section - Only visible after starting */}
        {currentJob.status !== "pending" && (
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-primary" />
                Evidence Photos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">
              {/* Photo Type Toggle */}
              {currentJob.status === "in_progress" && (
                <div className="flex gap-2">
                  <Button
                    variant={photoType === 'before' ? 'default' : 'outline'}
                    className="flex-1 h-12"
                    onClick={() => setPhotoType('before')}
                  >
                    Before
                  </Button>
                  <Button
                    variant={photoType === 'after' ? 'default' : 'outline'}
                    className="flex-1 h-12"
                    onClick={() => setPhotoType('after')}
                  >
                    After
                  </Button>
                </div>
              )}

              {/* Before Photos */}
              {beforePhotos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Before ({beforePhotos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {beforePhotos.map((photo) => (
                      <div key={photo.id} className="aspect-square rounded-lg bg-muted overflow-hidden">
                        <img 
                          src={photo.photo_url} 
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* After Photos */}
              {afterPhotos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">After ({afterPhotos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {afterPhotos.map((photo) => (
                      <div key={photo.id} className="aspect-square rounded-lg bg-muted overflow-hidden">
                        <img 
                          src={photo.photo_url} 
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {photos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No photos uploaded yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload at least one photo to complete the job
                  </p>
                </div>
              )}
              
              {/* Upload Button */}
              {currentJob.status === "in_progress" && (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                  <Button 
                    variant="outline" 
                    className="w-full h-16 text-lg" 
                    disabled={isUploading}
                    asChild
                  >
                    <span>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="h-5 w-5 mr-2" />
                          📷 Take {photoType.charAt(0).toUpperCase() + photoType.slice(1)} Photo
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border safe-area-inset-bottom">
          {currentJob.status === "pending" && (
            <Button 
              className="w-full h-16 text-xl font-bold"
              onClick={handleStartJob}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <Play className="h-6 w-6 mr-2" />
              )}
              ▶ START JOB
            </Button>
          )}

          {currentJob.status === "in_progress" && (
            <Button 
              className="w-full h-16 text-xl font-bold bg-success hover:bg-success/90"
              onClick={handleCompleteJob}
              disabled={isUpdating || photos.length === 0}
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-6 w-6 mr-2" />
              )}
              ■ FINISH JOB
              {photos.length === 0 && (
                <span className="ml-2 text-sm font-normal">(Upload photo first)</span>
              )}
            </Button>
          )}

          {currentJob.status === "completed" && (
            <div className="flex items-center justify-center gap-3 py-4 text-success">
              <CheckCircle2 className="h-8 w-8" />
              <span className="text-xl font-bold">Job Completed!</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}