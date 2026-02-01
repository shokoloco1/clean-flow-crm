import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Camera,
  Play,
  CheckSquare,
  Loader2,
  Navigation,
  AlertTriangle,
  Image as ImageIcon,
  XCircle,
  Home,
  Bed,
  Bath,
  Layers,
  PawPrint,
  Waves,
  Car,
  Sofa,
  Timer,
  Key,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import AdvancedChecklist from "@/components/AdvancedChecklist";
import { BeforeAfterPhotos } from "@/components/staff/BeforeAfterPhotos";
import { AreaPhotoDocumentation } from "@/components/staff/AreaPhotoDocumentation";

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

interface PropertyPhoto {
  id: string;
  photo_url: string;
  room_area: string | null;
  description: string | null;
}

interface RequiredArea {
  name: string;
  services: string[];
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
  properties?: Property | null;
  required_areas?: { areas: RequiredArea[] } | null;
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
  const [property, setProperty] = useState<Property | null>(job.properties || null);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [allAreasComplete, setAllAreasComplete] = useState(false);

  // Check if job has required areas for area-based photo documentation
  const hasRequiredAreas = currentJob.required_areas?.areas && currentJob.required_areas.areas.length > 0;

  useEffect(() => {
    fetchPhotos();
    fetchAccessCode();
    if (job.property_id && !property) {
      fetchProperty();
    }
    if (job.property_id) {
      fetchPropertyPhotos();
    }
  }, [job.id, job.property_id]);

  const fetchProperty = async () => {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("id", job.property_id)
      .single();
    
    if (data) {
      setProperty(data as Property);
    }
  };

  const fetchPropertyPhotos = async () => {
    const { data } = await supabase
      .from("property_photos")
      .select("*")
      .eq("property_id", job.property_id)
      .order("created_at", { ascending: true });
    
    if (data) {
      setPropertyPhotos(data as PropertyPhoto[]);
    }
  };

  const fetchAccessCode = async () => {
    const { data, error } = await supabase.rpc('get_job_access_code', { _job_id: job.id });
    if (!error && data) {
      setAccessCode(data);
    }
  };

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
        () => {
          toast.warning("Could not capture GPS location");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleStartJob = async () => {
    setIsUpdating(true);
    
    const location = await captureGPSLocation();
    
    const updateData: Record<string, unknown> = {
      status: "in_progress",
      start_time: new Date().toISOString()
    };
    
    if (location) {
      updateData.checkin_lat = location.lat;
      updateData.checkin_lng = location.lng;
      updateData.location_lat = location.lat;
      updateData.location_lng = location.lng;
    }

    const { error } = await supabase
      .from("jobs")
      .update(updateData)
      .eq("id", currentJob.id);

    if (error) {
      toast.error("Error starting job");
    } else {
      setCurrentJob({ 
        ...currentJob, 
        status: "in_progress", 
        start_time: new Date().toISOString() 
      });
      toast.success("Job started!");
      onUpdate();
    }
    setIsUpdating(false);
  };

  const handleCompleteJob = async () => {
    // Check if all required areas have photos
    if (hasRequiredAreas && !allAreasComplete) {
      toast.error("Please complete photo documentation for all areas before completing the job");
      return;
    }

    // For jobs without required areas, check for at least one photo
    if (!hasRequiredAreas && photos.length === 0) {
      toast.error("Please upload at least one photo before completing");
      return;
    }
    
    setIsUpdating(true);
    
    const location = await captureGPSLocation();
    
    const updateData: Record<string, unknown> = {
      status: "completed", 
      end_time: new Date().toISOString()
    };

    if (location) {
      updateData.checkout_lat = location.lat;
      updateData.checkout_lng = location.lng;
    }

    const { error } = await supabase
      .from("jobs")
      .update(updateData)
      .eq("id", currentJob.id);

    if (error) {
      toast.error("Error completing job");
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

  // Removed old handlePhotoUpload - now handled by BeforeAfterPhotos component

  const openInMaps = () => {
    if (property?.google_maps_link) {
      window.open(property.google_maps_link, "_blank");
    } else {
      const encodedAddress = encodeURIComponent(currentJob.location);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
    }
  };

  const checklist = Array.isArray(currentJob.checklist) ? currentJob.checklist : [];

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
                {property && (property.suburb || property.state) && (
                  <p className="text-sm text-muted-foreground ml-7">
                    {[property.suburb, property.state, property.post_code].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <Button 
                onClick={openInMaps}
                className="h-14 px-5"
              >
                <Navigation className="h-5 w-5 mr-2" />
                Maps
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Property Details Card */}
        {property && (
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5 text-primary" />
                Property Details
              </CardTitle>
              <CardDescription>
                Reference information for this cleaning job
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Property Reference Photos */}
              {propertyPhotos.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Reference Photos from Client ({propertyPhotos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {propertyPhotos.map((photo) => (
                      <div 
                        key={photo.id} 
                        className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                        onClick={() => setSelectedPhoto(photo.photo_url)}
                      >
                        <img 
                          src={photo.photo_url} 
                          alt={photo.room_area || "Reference"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap photos to enlarge. Use these as cleaning reference.
                  </p>
                </div>
              )}
              
              {/* Property Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {(property.bedrooms ?? 0) > 0 && (
                  <div className="p-2 bg-background rounded-lg">
                    <Bed className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold">{property.bedrooms}</p>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                  </div>
                )}
                {(property.bathrooms ?? 0) > 0 && (
                  <div className="p-2 bg-background rounded-lg">
                    <Bath className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold">{property.bathrooms}</p>
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                  </div>
                )}
                {(property.living_areas ?? 0) > 0 && (
                  <div className="p-2 bg-background rounded-lg">
                    <Sofa className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold">{property.living_areas}</p>
                    <p className="text-xs text-muted-foreground">Living</p>
                  </div>
                )}
                {(property.floors ?? 0) > 1 && (
                  <div className="p-2 bg-background rounded-lg">
                    <Layers className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold">{property.floors}</p>
                    <p className="text-xs text-muted-foreground">Floors</p>
                  </div>
                )}
              </div>

              {/* Key Property Features */}
              <div className="flex flex-wrap gap-2">
                {property.has_pets && (
                  <Badge variant="outline" className="gap-1">
                    <PawPrint className="h-3 w-3" />
                    Pets: {property.pet_details || 'Yes'}
                  </Badge>
                )}
                {property.has_pool && (
                  <Badge variant="outline" className="gap-1">
                    <Waves className="h-3 w-3" />
                    Pool
                  </Badge>
                )}
                {property.has_garage && (
                  <Badge variant="outline" className="gap-1">
                    <Car className="h-3 w-3" />
                    Garage
                  </Badge>
                )}
                {property.floor_type && (
                  <Badge variant="outline" className="gap-1">
                    <Layers className="h-3 w-3" />
                    {property.floor_type}
                  </Badge>
                )}
                {property.estimated_hours && (
                  <Badge variant="outline" className="gap-1">
                    <Timer className="h-3 w-3" />
                    ~{property.estimated_hours}h estimated
                  </Badge>
                )}
              </div>

              {/* Special Instructions */}
              {property.special_instructions && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning">Special Instructions</p>
                      <p className="text-sm text-muted-foreground mt-1">{property.special_instructions}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Access Code */}
              {accessCode && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Access Code: <span className="font-mono text-lg">{accessCode}</span></p>
                  </div>
                </div>
              )}

              {/* Google Maps Link */}
              {property.google_maps_link && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => window.open(property.google_maps_link!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Maps
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status & Time */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Schedule</span>
              </div>
              <Badge 
                variant={currentJob.status === 'completed' ? 'default' : 'secondary'}
                className={currentJob.status === 'completed' ? 'bg-success' : ''}
              >
                {currentJob.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Scheduled Time:</span>
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
                <div className="flex justify-between text-base border-t border-border pt-3 mt-3">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-bold text-primary text-lg">{calculateDuration()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {currentJob.notes && (
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="font-semibold text-foreground">Notes</span>
              </div>
              <p className="text-muted-foreground ml-7 text-base">{currentJob.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Advanced Checklist */}
        {currentJob.status !== "pending" && (
          <AdvancedChecklist 
            jobId={currentJob.id}
            jobStatus={currentJob.status}
            legacyChecklist={checklist}
          />
        )}

        {/* Before/After Photos */}
        {currentJob.status !== "pending" && (
          hasRequiredAreas ? (
            <AreaPhotoDocumentation
              jobId={currentJob.id}
              jobStatus={currentJob.status}
              requiredAreas={currentJob.required_areas?.areas || []}
              onPhotosUpdated={fetchPhotos}
              onAllAreasComplete={setAllAreasComplete}
            />
          ) : (
            <BeforeAfterPhotos
              jobId={currentJob.id}
              photos={photos}
              jobStatus={currentJob.status}
              onPhotosUpdated={fetchPhotos}
            />
          )
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
              disabled={isUpdating || (hasRequiredAreas ? !allAreasComplete : photos.length === 0)}
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-6 w-6 mr-2" />
              )}
              ✓ COMPLETE JOB
              {hasRequiredAreas && !allAreasComplete && (
                <span className="ml-2 text-sm font-normal">(Complete all area photos)</span>
              )}
              {!hasRequiredAreas && photos.length === 0 && (
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

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <XCircle className="h-8 w-8" />
          </Button>
          <img 
            src={selectedPhoto} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
