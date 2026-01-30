import { MapPin, Navigation, Clock, Bed, Bath, PawPrint, Timer, Play, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Property {
  bedrooms?: number | null;
  bathrooms?: number | null;
  has_pets?: boolean | null;
  estimated_hours?: number | null;
  google_maps_link?: string | null;
  address?: string;
}

interface NextJobCardProps<T extends { id: string; location: string; scheduled_time: string; status: string; clients: { name: string } | null; properties: Property | null }> {
  job: T;
  isUpdating: boolean;
  onStartComplete: () => void;
  onViewDetails: () => void;
}

export function NextJobCard<T extends { id: string; location: string; scheduled_time: string; status: string; clients: { name: string } | null; properties: Property | null }>({ 
  job, isUpdating, onStartComplete, onViewDetails 
}: NextJobCardProps<T>) {
  const isInProgress = job.status === "in_progress";
  const isCompleted = job.status === "completed";
  
  const openMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mapsUrl = job.properties?.google_maps_link || 
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-primary uppercase tracking-wide">
            📍 Next Job
          </span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {job.scheduled_time}
          </span>
        </div>

        {/* Client Name */}
        <h2 className="text-xl font-bold text-foreground mb-2 truncate">
          {job.clients?.name || "Unknown Client"}
        </h2>

        {/* Property Quick Stats */}
        {job.properties && (
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
            {(job.properties.bedrooms ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="h-4 w-4" /> {job.properties.bedrooms}
              </span>
            )}
            {(job.properties.bathrooms ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-4 w-4" /> {job.properties.bathrooms}
              </span>
            )}
            {job.properties.has_pets && (
              <span className="flex items-center gap-1 text-warning">
                <PawPrint className="h-4 w-4" /> Pets
              </span>
            )}
            {job.properties.estimated_hours && (
              <span className="flex items-center gap-1">
                <Timer className="h-4 w-4" /> ~{job.properties.estimated_hours}h
              </span>
            )}
          </div>
        )}

        {/* Address with Maps Button */}
        <div className="flex items-start gap-2 mb-4 p-3 bg-background/60 rounded-lg">
          <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground flex-1 line-clamp-2">{job.location}</p>
          <Button 
            size="sm" 
            variant="secondary"
            className="flex-shrink-0 gap-1"
            onClick={openMaps}
          >
            <Navigation className="h-4 w-4" />
            Maps
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isCompleted && (
            <Button
              size="lg"
              className={`flex-1 h-14 text-lg font-semibold ${
                isInProgress 
                  ? "bg-success hover:bg-success/90" 
                  : "bg-primary hover:bg-primary/90"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onStartComplete();
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isInProgress ? (
                <>
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  Complete Job
                </>
              ) : (
                <>
                  <Play className="h-6 w-6 mr-2" />
                  Start Job
                </>
              )}
            </Button>
          )}
          
          {isCompleted && (
            <div className="flex-1 h-14 flex items-center justify-center bg-success/20 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-success mr-2" />
              <span className="text-lg font-semibold text-success">Completed</span>
            </div>
          )}
          
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-4"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
