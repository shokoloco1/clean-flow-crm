import { type PropertyRecord, type PropertyPhoto } from "@/lib/queries/properties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Key,
  FileText,
  Navigation,
  Home,
  Briefcase,
  Plane,
  MoreHorizontal,
  Camera,
  Bed,
  Bath,
  Clock,
  Waves,
  Dog,
} from "lucide-react";

export const propertyTypeConfig = {
  commercial: { icon: Briefcase, label: "Comercial", color: "bg-purple-500/10 text-purple-600" },
  airbnb: { icon: Plane, label: "Airbnb", color: "bg-orange-500/10 text-orange-600" },
  other: { icon: MoreHorizontal, label: "Otro", color: "bg-muted text-muted-foreground" },
};

export function getTypeConfig(type: string) {
  return propertyTypeConfig[type as keyof typeof propertyTypeConfig] || propertyTypeConfig.other;
}

interface PropertyDetailViewProps {
  property: PropertyRecord;
  photos: PropertyPhoto[];
  onBack: () => void;
}

export function PropertyDetailView({ property, photos, onBack }: PropertyDetailViewProps) {
  const typeConfig = getTypeConfig(property.property_type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{property.name}</h1>
            <p className="text-sm text-muted-foreground">{property.address}</p>
          </div>
          <Badge className={typeConfig.color}>
            <TypeIcon className="mr-1 h-3 w-3" />
            {typeConfig.label}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        {/* Property Info Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {property.clients && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{property.clients.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {property.bedrooms !== undefined && property.bedrooms > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bed className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                    <p className="font-medium">{property.bedrooms}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {property.bathrooms !== undefined && property.bathrooms > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bath className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                    <p className="font-medium">{property.bathrooms}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {property.estimated_hours && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Time</p>
                    <p className="font-medium">{property.estimated_hours} hrs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {property.size_sqm && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="font-medium">{property.size_sqm} sqm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Geofence Radius</p>
                  <p className="font-medium">{property.geofence_radius_meters}m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {property.has_pool && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Waves className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pool/Spa</p>
                    <p className="font-medium">Yes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {property.has_pets && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Dog className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pets</p>
                    <p className="text-sm font-medium">{property.pet_details || "Yes"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {property.location_lat && property.location_lng && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">GPS Coordinates</p>
                    <p className="text-sm font-medium">
                      {property.location_lat.toFixed(6)}, {property.location_lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Access Codes */}
        {property.access_codes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" />
                Access Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground">{property.access_codes}</p>
            </CardContent>
          </Card>
        )}

        {/* Special Instructions */}
        {property.special_instructions && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Special Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground">{property.special_instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Reference Photos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              Reference Photos ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No reference photos yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-lg"
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.room_area || "Property photo"}
                      className="h-full w-full object-cover"
                    />
                    {photo.room_area && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white">
                        {photo.room_area}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
