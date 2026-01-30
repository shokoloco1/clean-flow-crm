import { MapPin, CheckCircle, AlertTriangle, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface GeofenceStatusProps {
  isWithinGeofence: boolean;
  distanceMeters: number;
  radiusMeters: number;
}

export default function GeofenceStatus({ 
  isWithinGeofence, 
  distanceMeters, 
  radiusMeters 
}: GeofenceStatusProps) {
  if (isWithinGeofence) {
    return (
      <Card className="border-success/50 bg-success/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/20">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-success">Location Verified</p>
              <p className="text-sm text-muted-foreground">
                You are {distanceMeters}m from the property (maximum {radiusMeters}m)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-destructive">Outside Area</p>
            <p className="text-sm text-muted-foreground">
              You are {distanceMeters}m from the property. You must be within {radiusMeters}m.
            </p>
          </div>
          <Navigation className="h-5 w-5 text-destructive" />
        </div>
      </CardContent>
    </Card>
  );
}
