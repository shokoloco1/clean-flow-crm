import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GeofenceResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  currentLat: number;
  currentLng: number;
  propertyLat: number;
  propertyLng: number;
  radiusMeters: number;
}

interface PropertyLocation {
  location_lat: number | null;
  location_lng: number | null;
  geofence_radius_meters: number;
  name: string;
  address: string;
}

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export function useGeofence() {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS no disponible en este dispositivo"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(new Error("Permiso de ubicación denegado. Por favor habilita GPS."));
              break;
            case err.POSITION_UNAVAILABLE:
              reject(new Error("Ubicación no disponible. Intenta nuevamente."));
              break;
            case err.TIMEOUT:
              reject(new Error("Tiempo de espera agotado. Intenta en un lugar con mejor señal."));
              break;
            default:
              reject(new Error("Error al obtener ubicación"));
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    });
  }, []);

  const getPropertyLocation = useCallback(async (propertyId: string): Promise<PropertyLocation | null> => {
    const { data, error } = await supabase
      .from("properties")
      .select("location_lat, location_lng, geofence_radius_meters, name, address")
      .eq("id", propertyId)
      .single();

    if (error || !data) return null;
    return data as PropertyLocation;
  }, []);

  const validateGeofence = useCallback(async (propertyId: string): Promise<GeofenceResult | null> => {
    setIsChecking(true);
    setError(null);

    try {
      // Get current GPS position
      const position = await getCurrentPosition();
      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;

      // Get property location
      const property = await getPropertyLocation(propertyId);
      
      if (!property) {
        setError("Propiedad no encontrada");
        return null;
      }

      if (!property.location_lat || !property.location_lng) {
        // Property doesn't have GPS coordinates - allow check-in with warning
        setError("La propiedad no tiene coordenadas GPS configuradas");
        return {
          isWithinGeofence: true, // Allow by default if no GPS set
          distanceMeters: 0,
          currentLat,
          currentLng,
          propertyLat: 0,
          propertyLng: 0,
          radiusMeters: property.geofence_radius_meters
        };
      }

      // Calculate distance
      const distanceMeters = calculateDistance(
        currentLat,
        currentLng,
        property.location_lat,
        property.location_lng
      );

      const isWithinGeofence = distanceMeters <= property.geofence_radius_meters;

      return {
        isWithinGeofence,
        distanceMeters: Math.round(distanceMeters),
        currentLat,
        currentLng,
        propertyLat: property.location_lat,
        propertyLng: property.location_lng,
        radiusMeters: property.geofence_radius_meters
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [getCurrentPosition, getPropertyLocation]);

  const createGeofenceAlert = useCallback(async (
    jobId: string,
    alertType: 'late_arrival' | 'no_show' | 'early_checkout' | 'geofence_violation',
    message: string
  ) => {
    const { error } = await supabase
      .from("job_alerts")
      .insert({
        job_id: jobId,
        alert_type: alertType,
        message
      });

    if (error) {
      console.error("Failed to create alert:", error);
    }
  }, []);

  return {
    validateGeofence,
    createGeofenceAlert,
    isChecking,
    error,
    clearError: () => setError(null)
  };
}
