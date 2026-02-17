import { type PropertyRecord } from "@/lib/queries/properties";
import { getTypeConfig } from "./PropertyDetailView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Edit, Trash2, Bed, Bath, Clock } from "lucide-react";

interface PropertyCardProps {
  property: PropertyRecord;
  onView: (property: PropertyRecord) => void;
  onEdit: (property: PropertyRecord) => void;
  onToggleActive: (property: PropertyRecord) => void;
  onDelete: (id: string) => void;
}

export function PropertyCard({
  property,
  onView,
  onEdit,
  onToggleActive,
  onDelete,
}: PropertyCardProps) {
  const typeConfig = getTypeConfig(property.property_type);
  const TypeIcon = typeConfig.icon;

  return (
    <Card
      className={`cursor-pointer border-border transition-shadow hover:shadow-md ${
        !property.is_active ? "opacity-60" : ""
      }`}
      onClick={() => onView(property)}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{property.name}</h3>
              {!property.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Archived
                </Badge>
              )}
            </div>
            <p className="line-clamp-1 text-sm text-muted-foreground">{property.address}</p>
          </div>
          <Badge className={typeConfig.color}>
            <TypeIcon className="h-3 w-3" />
          </Badge>
        </div>

        {/* Property quick stats */}
        <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
          {property.bedrooms !== undefined && property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms !== undefined && property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {property.bathrooms}
            </span>
          )}
          {property.estimated_hours && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <Clock className="h-3 w-3" />
              {property.estimated_hours}h
            </span>
          )}
        </div>

        {property.clients && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {property.clients.name}
          </div>
        )}

        {property.location_lat && property.location_lng && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            GPS: ✓
          </div>
        )}

        <div className="mt-4 flex gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(property);
            }}
          >
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(property);
            }}
          >
            {property.is_active ? "Archive" : "Activate"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(property.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
