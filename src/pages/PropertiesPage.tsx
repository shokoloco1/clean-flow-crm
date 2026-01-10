import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Building2,
  MapPin,
  Key,
  FileText,
  Navigation,
  Edit,
  Trash2,
  Home,
  Briefcase,
  Plane,
  Stethoscope,
  Camera,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Property {
  id: string;
  name: string;
  address: string;
  location_lat: number | null;
  location_lng: number | null;
  size_sqm: number | null;
  property_type: string;
  special_instructions: string | null;
  access_codes: string | null;
  geofence_radius_meters: number;
  is_active: boolean;
  client_id: string | null;
  default_checklist_template_id: string | null;
  clients: { name: string } | null;
  checklist_templates: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  template_type: string;
}

interface PropertyPhoto {
  id: string;
  photo_url: string;
  room_area: string | null;
  description: string | null;
}

const propertyTypeConfig = {
  residential: { icon: Home, label: "Residential", color: "bg-blue-500/10 text-blue-600" },
  commercial: { icon: Briefcase, label: "Commercial", color: "bg-purple-500/10 text-purple-600" },
  airbnb: { icon: Plane, label: "Airbnb", color: "bg-orange-500/10 text-orange-600" },
  medical: { icon: Stethoscope, label: "Medical", color: "bg-green-500/10 text-green-600" },
};

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    location_lat: "",
    location_lng: "",
    size_sqm: "",
    property_type: "residential",
    special_instructions: "",
    access_codes: "",
    geofence_radius_meters: "100",
    client_id: "",
    default_checklist_template_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [propertiesRes, clientsRes, templatesRes] = await Promise.all([
      supabase
        .from("properties")
        .select(`
          *,
          clients (name),
          checklist_templates (name)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("checklist_templates").select("id, name, template_type").order("name"),
    ]);

    setProperties((propertiesRes.data as unknown as Property[]) || []);
    setClients((clientsRes.data as Client[]) || []);
    setTemplates((templatesRes.data as ChecklistTemplate[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      location_lat: "",
      location_lng: "",
      size_sqm: "",
      property_type: "residential",
      special_instructions: "",
      access_codes: "",
      geofence_radius_meters: "100",
      client_id: "",
      default_checklist_template_id: "",
    });
    setEditingProperty(null);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      location_lat: property.location_lat?.toString() || "",
      location_lng: property.location_lng?.toString() || "",
      size_sqm: property.size_sqm?.toString() || "",
      property_type: property.property_type,
      special_instructions: property.special_instructions || "",
      access_codes: property.access_codes || "",
      geofence_radius_meters: property.geofence_radius_meters.toString(),
      client_id: property.client_id || "",
      default_checklist_template_id: property.default_checklist_template_id || "",
    });
    setIsDialogOpen(true);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          location_lat: position.coords.latitude.toString(),
          location_lng: position.coords.longitude.toString(),
        });
        setGettingLocation(false);
        toast.success("Location captured!");
      },
      (error) => {
        setGettingLocation(false);
        toast.error("Failed to get location: " + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      toast.error("Name and address are required");
      return;
    }

    const propertyData = {
      name: formData.name,
      address: formData.address,
      location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
      location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
      size_sqm: formData.size_sqm ? parseFloat(formData.size_sqm) : null,
      property_type: formData.property_type,
      special_instructions: formData.special_instructions || null,
      access_codes: formData.access_codes || null,
      geofence_radius_meters: parseInt(formData.geofence_radius_meters) || 100,
      client_id: formData.client_id || null,
      default_checklist_template_id: formData.default_checklist_template_id || null,
    };

    if (editingProperty) {
      const { error } = await supabase
        .from("properties")
        .update(propertyData)
        .eq("id", editingProperty.id);

      if (error) {
        toast.error("Failed to update property");
        return;
      }
      toast.success("Property updated!");
    } else {
      const { error } = await supabase.from("properties").insert(propertyData);

      if (error) {
        toast.error("Failed to create property");
        return;
      }
      toast.success("Property created!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete property");
      return;
    }

    toast.success("Property deleted!");
    fetchData();
  };

  const handleToggleActive = async (property: Property) => {
    const { error } = await supabase
      .from("properties")
      .update({ is_active: !property.is_active })
      .eq("id", property.id);

    if (error) {
      toast.error("Failed to update property status");
      return;
    }

    toast.success(property.is_active ? "Property archived" : "Property activated");
    fetchData();
  };

  const viewPropertyDetails = async (property: Property) => {
    setSelectedProperty(property);
    
    const { data } = await supabase
      .from("property_photos")
      .select("*")
      .eq("property_id", property.id)
      .order("created_at", { ascending: false });

    setPropertyPhotos((data as PropertyPhoto[]) || []);
  };

  const getTypeConfig = (type: string) => {
    return propertyTypeConfig[type as keyof typeof propertyTypeConfig] || propertyTypeConfig.residential;
  };

  if (selectedProperty) {
    const typeConfig = getTypeConfig(selectedProperty.property_type);
    const TypeIcon = typeConfig.icon;

    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedProperty(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{selectedProperty.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
            </div>
            <Badge className={typeConfig.color}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {typeConfig.label}
            </Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Property Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedProperty.clients && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">{selectedProperty.clients.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProperty.size_sqm && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Size</p>
                      <p className="font-medium">{selectedProperty.size_sqm} sqm</p>
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
                    <p className="font-medium">{selectedProperty.geofence_radius_meters}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedProperty.location_lat && selectedProperty.location_lng && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">GPS Coordinates</p>
                      <p className="font-medium text-sm">
                        {selectedProperty.location_lat.toFixed(6)}, {selectedProperty.location_lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Access Codes */}
          {selectedProperty.access_codes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Access Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{selectedProperty.access_codes}</p>
              </CardContent>
            </Card>
          )}

          {/* Special Instructions */}
          {selectedProperty.special_instructions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Special Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{selectedProperty.special_instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Reference Photos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Reference Photos ({propertyPhotos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {propertyPhotos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reference photos yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {propertyPhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={photo.photo_url}
                        alt={photo.room_area || "Property photo"}
                        className="w-full h-full object-cover"
                      />
                      {photo.room_area && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground">{properties.length} properties</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Property Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Main Street Office"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Address *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>

                  <div>
                    <Label>Client</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Property Type</Label>
                    <Select
                      value={formData.property_type}
                      onValueChange={(v) => setFormData({ ...formData, property_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="airbnb">Airbnb</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Size (sqm)</Label>
                    <Input
                      type="number"
                      value={formData.size_sqm}
                      onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                      placeholder="e.g., 150"
                    />
                  </div>

                  <div>
                    <Label>Geofence Radius (meters)</Label>
                    <Input
                      type="number"
                      value={formData.geofence_radius_meters}
                      onChange={(e) => setFormData({ ...formData, geofence_radius_meters: e.target.value })}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.location_lat}
                      onChange={(e) => setFormData({ ...formData, location_lat: e.target.value })}
                      placeholder="-33.8688"
                    />
                  </div>

                  <div>
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.location_lng}
                      onChange={(e) => setFormData({ ...formData, location_lng: e.target.value })}
                      placeholder="151.2093"
                    />
                  </div>

                  <div className="col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="w-full"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      {gettingLocation ? "Getting location..." : "Use Current Location"}
                    </Button>
                  </div>

                  <div className="col-span-2">
                    <Label>Default Checklist Template</Label>
                    <Select
                      value={formData.default_checklist_template_id}
                      onValueChange={(v) => setFormData({ ...formData, default_checklist_template_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.template_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Access Codes</Label>
                    <Textarea
                      value={formData.access_codes}
                      onChange={(e) => setFormData({ ...formData, access_codes: e.target.value })}
                      placeholder="Gate code: 1234&#10;Alarm code: 5678&#10;Key location: Under mat"
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Special Instructions</Label>
                    <Textarea
                      value={formData.special_instructions}
                      onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                      placeholder="Any special cleaning requirements, areas to avoid, etc."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmit} className="flex-1">
                    {editingProperty ? "Update Property" : "Create Property"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : properties.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-4">Add your first property to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => {
              const typeConfig = getTypeConfig(property.property_type);
              const TypeIcon = typeConfig.icon;

              return (
                <Card
                  key={property.id}
                  className={`border-border hover:shadow-md transition-shadow cursor-pointer ${
                    !property.is_active ? "opacity-60" : ""
                  }`}
                  onClick={() => viewPropertyDetails(property)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{property.name}</h3>
                          {!property.is_active && (
                            <Badge variant="secondary" className="text-xs">Archived</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{property.address}</p>
                      </div>
                      <Badge className={typeConfig.color}>
                        <TypeIcon className="h-3 w-3" />
                      </Badge>
                    </div>

                    {property.clients && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Building2 className="h-4 w-4" />
                        {property.clients.name}
                      </div>
                    )}

                    {property.location_lat && property.location_lng && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4" />
                        GPS: ✓
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Navigation className="h-4 w-4" />
                      {property.geofence_radius_meters}m radius
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(property);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(property);
                        }}
                      >
                        {property.is_active ? "Archive" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(property.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
