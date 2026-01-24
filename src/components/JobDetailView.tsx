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
  Shield,
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
import { useGeofence } from "@/hooks/useGeofence";
import GeofenceStatus from "@/components/GeofenceStatus";
import AdvancedChecklist from "@/components/AdvancedChecklist";

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
}

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  created_at: string;
}

interface GeofenceResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  radiusMeters: number;
  currentLat: number;
  currentLng: number;
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
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [photoType, setPhotoType] = useState<'before' | 'after'>('before');
  const [geofenceResult, setGeofenceResult] = useState<GeofenceResult | null>(null);
  const [geofenceChecked, setGeofenceChecked] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const { validateGeofence, createGeofenceAlert, isChecking, error: geofenceError, clearError } = useGeofence();

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

  const handleCheckGeofence = async () => {
    if (!currentJob.property_id) {
      toast.warning("This job has no assigned property");
      setGeofenceChecked(true);
      setGeofenceResult({ isWithinGeofence: true, distanceMeters: 0, radiusMeters: 100, currentLat: 0, currentLng: 0 });
      return;
    }

    const result = await validateGeofence(currentJob.property_id);
    if (result) {
      setGeofenceResult(result);
      setGeofenceChecked(true);
      
      if (!result.isWithinGeofence) {
        await createGeofenceAlert(
          currentJob.id,
          'geofence_violation',
          `Check-in outside allowed area. Distance: ${result.distanceMeters}m (max: ${result.radiusMeters}m)`
        );
        toast.error(`You are ${result.distanceMeters}m from the property. Must be within ${result.radiusMeters}m.`);
      }
    }
  };

  const handleStartJob = async () => {
    if (!geofenceChecked) {
      toast.error("Please verify your location first");
      return;
    }

    setIsUpdating(true);
    
    const location = geofenceResult ? { lat: geofenceResult.currentLat, lng: geofenceResult.currentLng } : await captureGPSLocation();
    
    const updateData: Record<string, unknown> = {
      status: "in_progress",
      start_time: new Date().toISOString(),
      geofence_validated: geofenceResult?.isWithinGeofence ?? false
    };
    
    if (location) {
      updateData.checkin_lat = location.lat;
      updateData.checkin_lng = location.lng;
      updateData.location_lat = location.lat;
      updateData.location_lng = location.lng;
    }

    if (geofenceResult) {
      updateData.checkin_distance_meters = geofenceResult.distanceMeters;
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
      toast.success(geofenceResult?.isWithinGeofence ? "Job started with verified location!" : "Job started");
      onUpdate();
    }
    setIsUpdating(false);
  };

  const handleCompleteJob = async () => {
    if (photos.length === 0) {
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentJob.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
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

      const { data: urlData } = supabase.storage
        .from('job-evidence')
        .getPublicUrl(uploadData.path);

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
    e.target.value = '';
  };

  const openInMaps = () => {
    if (property?.google_maps_link) {
      window.open(property.google_maps_link, "_blank");
    } else {
      const encodedAddress = encodeURIComponent(currentJob.location);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
    }
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

        {/* Property Details Card - NEW CRITICAL SECTION */}
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
              
              {/* Additional Info Badges */}
              <div className="flex flex-wrap gap-2">
                {property.floor_type && property.floor_type !== 'mixed' && (
                  <Badge variant="outline">🏠 {property.floor_type} floors</Badge>
                )}
                {property.has_pets && (
                  <Badge variant="outline" className="bg-warning/10 border-warning/30 text-warning">
                    <PawPrint className="h-3 w-3 mr-1" />
                    Pets {property.pet_details && `(${property.pet_details})`}
                  </Badge>
                )}
                {property.has_pool && (
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                    <Waves className="h-3 w-3 mr-1" />
                    Pool/Spa
                  </Badge>
                )}
                {property.has_garage && (
                  <Badge variant="outline">
                    <Car className="h-3 w-3 mr-1" />
                    Garage
                  </Badge>
                )}
              </div>
              
              {/* Furniture Count */}
              {((property.sofas ?? 0) > 0 || (property.beds ?? 0) > 0 || (property.rugs ?? 0) > 0 || (property.dining_chairs ?? 0) > 0) && (
                <div className="text-sm">
                  <p className="font-medium mb-1">Furniture to clean:</p>
                  <div className="flex flex-wrap gap-3 text-muted-foreground">
                    {(property.sofas ?? 0) > 0 && <span>🛋️ {property.sofas} sofas</span>}
                    {(property.beds ?? 0) > 0 && <span>🛏️ {property.beds} beds</span>}
                    {(property.dining_chairs ?? 0) > 0 && <span>🪑 {property.dining_chairs} chairs</span>}
                    {(property.rugs ?? 0) > 0 && <span>🧹 {property.rugs} rugs</span>}
                  </div>
                </div>
              )}
              
              {/* Special Instructions */}
              {property.special_instructions && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm font-medium text-warning flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Special Instructions
                  </p>
                  <p className="text-sm text-foreground">{property.special_instructions}</p>
                </div>
              )}
              
              {/* Estimated Time */}
              {property.estimated_hours && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  Estimated time: ~{property.estimated_hours} hours
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Access Codes - Only shown if within time window */}
        {accessCode && (
          <Card className="border-warning/50 bg-warning/5 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-warning" />
                <span className="font-semibold text-foreground">Access Information</span>
              </div>
              <p className="text-foreground ml-7 text-base font-mono">
                {accessCode}
              </p>
              <p className="text-muted-foreground text-xs ml-7 mt-1">
                Only visible 2h before/after scheduled time
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

        {/* Advanced Checklist */}
        <AdvancedChecklist 
          jobId={currentJob.id}
          jobStatus={currentJob.status}
          legacyChecklist={checklist}
        />

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

        {/* Geofence Check Section - Before starting */}
        {currentJob.status === "pending" && (
          <Card className="border-border shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Location Verification</span>
              </div>

              {geofenceError && (
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">{geofenceError}</p>
                        <Button variant="link" className="p-0 h-auto text-sm" onClick={clearError}>
                          Try again
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {geofenceResult && (
                <GeofenceStatus 
                  isWithinGeofence={geofenceResult.isWithinGeofence}
                  distanceMeters={geofenceResult.distanceMeters}
                  radiusMeters={geofenceResult.radiusMeters}
                />
              )}

              {!geofenceChecked && !geofenceError && (
                <Button 
                  className="w-full h-14"
                  variant="outline"
                  onClick={handleCheckGeofence}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Verifying location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 mr-2" />
                      📍 Verify My Location
                    </>
                  )}
                </Button>
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
              disabled={isUpdating || !geofenceChecked || isChecking}
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <Play className="h-6 w-6 mr-2" />
              )}
              {!geofenceChecked ? "📍 Verify location first" : "▶ START JOB"}
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
              ✓ COMPLETE JOB
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
