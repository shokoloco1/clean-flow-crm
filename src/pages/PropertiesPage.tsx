import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  MoreHorizontal,
  Link2,
  Copy,
  Check,
  Camera,
  Bed,
  Bath,
  Sofa,
  Car,
  Dog,
  Clock,
  Waves,
  Layers,
  AlertCircle,
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
  clients: { name: string } | null;
  bedrooms?: number;
  bathrooms?: number;
  living_areas?: number;
  floors?: number;
  floor_type?: string;
  has_pool?: boolean;
  has_garage?: boolean;
  has_pets?: boolean;
  pet_details?: string;
  sofas?: number;
  dining_chairs?: number;
  beds?: number;
  rugs?: number;
  estimated_hours?: number;
}

interface Client {
  id: string;
  name: string;
}


interface PropertyPhoto {
  id: string;
  photo_url: string;
  room_area: string | null;
  description: string | null;
}

const propertyTypeConfig = {
  commercial: { icon: Briefcase, label: "Comercial", color: "bg-purple-500/10 text-purple-600" },
  airbnb: { icon: Plane, label: "Airbnb", color: "bg-orange-500/10 text-orange-600" },
  other: { icon: MoreHorizontal, label: "Otro", color: "bg-muted text-muted-foreground" },
};

const floorTypeOptions = [
  { value: "tile", label: "Tile" },
  { value: "hardwood", label: "Hardwood" },
  { value: "carpet", label: "Carpet" },
  { value: "laminate", label: "Laminate" },
  { value: "mixed", label: "Mixed" },
];

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    suburb: "",
    post_code: "",
    state: "",
    google_maps_link: "",
    size_sqm: "",
    property_type: "commercial",
    special_instructions: "",
    access_codes: "",
    client_id: "",
    // New property details
    bedrooms: "0",
    bathrooms: "0",
    living_areas: "0",
    floors: "1",
    floor_type: "mixed",
    has_pool: false,
    has_garage: false,
    has_pets: false,
    pet_details: "",
    // Furniture
    sofas: "0",
    dining_chairs: "0",
    beds: "0",
    rugs: "0",
  });

  // Calculate estimated cleaning time
  const estimatedTime = useMemo(() => {
    let minutes = 60; // Base time: 1 hour
    minutes += parseInt(formData.bedrooms || "0") * 30; // +30 min per bedroom
    minutes += parseInt(formData.bathrooms || "0") * 20; // +20 min per bathroom
    minutes += parseInt(formData.living_areas || "0") * 15; // +15 min per living area
    minutes += (parseInt(formData.floors || "1") - 1) * 15; // +15 min per additional floor
    if (formData.has_pool) minutes += 30; // +30 min for pool
    if (formData.has_garage) minutes += 15; // +15 min for garage

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return { hours, minutes: remainingMinutes, totalMinutes: minutes, totalHours: minutes / 60 };
  }, [formData.bedrooms, formData.bathrooms, formData.living_areas, formData.floors, formData.has_pool, formData.has_garage]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [propertiesRes, clientsRes] = await Promise.all([
      supabase
        .from("properties")
        .select(`
          *,
          clients (name)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").order("name"),
    ]);

    setProperties((propertiesRes.data as unknown as Property[]) || []);
    setClients((clientsRes.data as Client[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      suburb: "",
      post_code: "",
      state: "",
      google_maps_link: "",
      size_sqm: "",
      property_type: "commercial",
      special_instructions: "",
    access_codes: "",
    client_id: "",
    bedrooms: "0",
      bathrooms: "0",
      living_areas: "0",
      floors: "1",
      floor_type: "mixed",
      has_pool: false,
      has_garage: false,
      has_pets: false,
      pet_details: "",
      sofas: "0",
      dining_chairs: "0",
      beds: "0",
      rugs: "0",
    });
    setEditingProperty(null);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      suburb: (property as any).suburb || "",
      post_code: (property as any).post_code || "",
      state: (property as any).state || "",
      google_maps_link: (property as any).google_maps_link || "",
      size_sqm: property.size_sqm?.toString() || "",
      property_type: property.property_type,
      special_instructions: property.special_instructions || "",
      access_codes: property.access_codes || "",
      client_id: property.client_id || "",
      bedrooms: property.bedrooms?.toString() || "0",
      bathrooms: property.bathrooms?.toString() || "0",
      living_areas: property.living_areas?.toString() || "0",
      floors: property.floors?.toString() || "1",
      floor_type: property.floor_type || "mixed",
      has_pool: property.has_pool || false,
      has_garage: property.has_garage || false,
      has_pets: property.has_pets || false,
      pet_details: property.pet_details || "",
      sofas: property.sofas?.toString() || "0",
      dining_chairs: property.dining_chairs?.toString() || "0",
      beds: property.beds?.toString() || "0",
      rugs: property.rugs?.toString() || "0",
    });
    setIsDialogOpen(true);
  };

  const handleCopyGoogleMapsLink = async () => {
    if (formData.google_maps_link) {
      await navigator.clipboard.writeText(formData.google_maps_link);
      setCopiedLink(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Handle positive number inputs
  const handlePositiveNumberChange = useCallback((field: string, value: string) => {
    const num = parseInt(value) || 0;
    const safeValue = Math.max(0, num).toString();
    setFormData(prev => ({ ...prev, [field]: safeValue }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [fieldErrors]);

  const handleSubmit = async () => {
    // Reset errors
    setFieldErrors({});
    
    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Property name is required';
    }
    
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }
    
    // Validate post code format (Australian 4 digits)
    if (formData.post_code && !/^\d{4}$/.test(formData.post_code)) {
      errors.post_code = 'Post code must be 4 digits';
    }
    
    // Validate numeric fields
    const numericFields = ['bedrooms', 'bathrooms', 'living_areas', 'floors', 'sofas', 'dining_chairs', 'beds', 'rugs'];
    numericFields.forEach(field => {
      const value = parseInt(formData[field as keyof typeof formData] as string);
      if (isNaN(value) || value < 0) {
        errors[field] = 'Must be 0 or a positive number';
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the form errors');
      return;
    }

    const propertyData = {
      name: formData.name,
      address: formData.address,
      suburb: formData.suburb || null,
      post_code: formData.post_code || null,
      state: formData.state || null,
      google_maps_link: formData.google_maps_link || null,
      size_sqm: formData.size_sqm ? parseFloat(formData.size_sqm) : null,
      property_type: formData.property_type,
      special_instructions: formData.special_instructions || null,
      access_codes: formData.access_codes || null,
      client_id: formData.client_id || null,
      // New fields
      bedrooms: parseInt(formData.bedrooms) || 0,
      bathrooms: parseInt(formData.bathrooms) || 0,
      living_areas: parseInt(formData.living_areas) || 0,
      floors: parseInt(formData.floors) || 1,
      floor_type: formData.floor_type,
      has_pool: formData.has_pool,
      has_garage: formData.has_garage,
      has_pets: formData.has_pets,
      pet_details: formData.has_pets ? formData.pet_details : null,
      sofas: parseInt(formData.sofas) || 0,
      dining_chairs: parseInt(formData.dining_chairs) || 0,
      beds: parseInt(formData.beds) || 0,
      rugs: parseInt(formData.rugs) || 0,
      estimated_hours: parseFloat(estimatedTime.totalHours.toFixed(2)),
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
    return propertyTypeConfig[type as keyof typeof propertyTypeConfig] || propertyTypeConfig.other;
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

            {selectedProperty.bedrooms !== undefined && selectedProperty.bedrooms > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Bed className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-medium">{selectedProperty.bedrooms}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProperty.bathrooms !== undefined && selectedProperty.bathrooms > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Bath className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-medium">{selectedProperty.bathrooms}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProperty.estimated_hours && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Est. Time</p>
                      <p className="font-medium">{selectedProperty.estimated_hours} hrs</p>
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

            {selectedProperty.has_pool && (
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

            {selectedProperty.has_pets && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Dog className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pets</p>
                      <p className="font-medium text-sm">{selectedProperty.pet_details || "Yes"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                      <Label>Property Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                        }}
                        placeholder="e.g., Smith Family Home"
                        className={fieldErrors.name ? "border-destructive" : ""}
                      />
                      {fieldErrors.name && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label>Address *</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => {
                          setFormData({ ...formData, address: e.target.value });
                          if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: '' }));
                        }}
                        placeholder="Full address"
                        className={fieldErrors.address ? "border-destructive" : ""}
                      />
                      {fieldErrors.address && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {fieldErrors.address}
                        </p>
                      )}
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
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="airbnb">Airbnb</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label>Suburb</Label>
                      <Input
                        value={formData.suburb}
                        onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                        placeholder="e.g., Bondi"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Post Code</Label>
                      <Input
                        value={formData.post_code}
                        onChange={(e) => {
                          // Only allow 4 digits
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setFormData({ ...formData, post_code: val });
                          if (fieldErrors.post_code) setFieldErrors(prev => ({ ...prev, post_code: '' }));
                        }}
                        placeholder="e.g., 2026"
                        maxLength={4}
                        className={fieldErrors.post_code ? "border-destructive" : ""}
                      />
                      {fieldErrors.post_code && (
                        <p className="text-xs text-destructive">{fieldErrors.post_code}</p>
                      )}
                    </div>
                    <div>
                      <Label>State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(v) => setFormData({ ...formData, state: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NSW">NSW</SelectItem>
                          <SelectItem value="VIC">VIC</SelectItem>
                          <SelectItem value="QLD">QLD</SelectItem>
                          <SelectItem value="WA">WA</SelectItem>
                          <SelectItem value="SA">SA</SelectItem>
                          <SelectItem value="TAS">TAS</SelectItem>
                          <SelectItem value="NT">NT</SelectItem>
                          <SelectItem value="ACT">ACT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Separator />

                {/* Property Details - NEW SECTION */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Property Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1">
                        <Bed className="h-3 w-3" />
                        Bedrooms
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.bedrooms}
                        onChange={(e) => handlePositiveNumberChange('bedrooms', e.target.value)}
                        className={fieldErrors.bedrooms ? "border-destructive" : ""}
                      />
                      {fieldErrors.bedrooms && (
                        <p className="text-xs text-destructive">{fieldErrors.bedrooms}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-1">
                        <Bath className="h-3 w-3" />
                        Bathrooms
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.bathrooms}
                        onChange={(e) => handlePositiveNumberChange('bathrooms', e.target.value)}
                        className={fieldErrors.bathrooms ? "border-destructive" : ""}
                      />
                      {fieldErrors.bathrooms && (
                        <p className="text-xs text-destructive">{fieldErrors.bathrooms}</p>
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        <Sofa className="h-3 w-3" />
                        Living Areas
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={formData.living_areas}
                        onChange={(e) => handlePositiveNumberChange('living_areas', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Floors/Levels
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.floors}
                        onChange={(e) => handlePositiveNumberChange('floors', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Main Floor Type</Label>
                      <Select
                        value={formData.floor_type}
                        onValueChange={(v) => setFormData({ ...formData, floor_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {floorTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
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
                  </div>

                  {/* Checkboxes for amenities */}
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_pool"
                        checked={formData.has_pool}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_pool: checked as boolean })}
                      />
                      <Label htmlFor="has_pool" className="flex items-center gap-1 cursor-pointer">
                        <Waves className="h-3 w-3" />
                        Has Pool/Spa
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_garage"
                        checked={formData.has_garage}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_garage: checked as boolean })}
                      />
                      <Label htmlFor="has_garage" className="flex items-center gap-1 cursor-pointer">
                        <Car className="h-3 w-3" />
                        Has Garage
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_pets"
                        checked={formData.has_pets}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_pets: checked as boolean })}
                      />
                      <Label htmlFor="has_pets" className="flex items-center gap-1 cursor-pointer">
                        <Dog className="h-3 w-3" />
                        Has Pets
                      </Label>
                    </div>
                  </div>

                  {/* Pet details - conditional */}
                  {formData.has_pets && (
                    <div>
                      <Label>Pet Details (type, areas they stay in)</Label>
                      <Input
                        value={formData.pet_details}
                        onChange={(e) => setFormData({ ...formData, pet_details: e.target.value })}
                        placeholder="e.g., 2 dogs, stay in living room and backyard"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Furniture & Items - NEW SECTION */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sofa className="h-4 w-4" />
                    Furniture & Items
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label>Sofas/Couches</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.sofas}
                        onChange={(e) => setFormData({ ...formData, sofas: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Dining Chairs</Label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={formData.dining_chairs}
                        onChange={(e) => setFormData({ ...formData, dining_chairs: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Beds</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.beds}
                        onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Rugs/Carpets</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.rugs}
                        onChange={(e) => setFormData({ ...formData, rugs: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Estimated Cleaning Time - PROMINENT DISPLAY */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Cleaning Time</p>
                          <p className="text-2xl font-bold text-primary">
                            {estimatedTime.hours > 0 && `${estimatedTime.hours}h `}
                            {estimatedTime.minutes > 0 && `${estimatedTime.minutes}m`}
                            {estimatedTime.hours === 0 && estimatedTime.minutes === 0 && "1h"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Base: 1hr</p>
                        <p>+30m/bedroom, +20m/bathroom</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                {/* Google Maps Link */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Ubicación (Google Maps)
                  </h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Link de Google Maps</Label>
                      <Input
                        value={formData.google_maps_link}
                        onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                        placeholder="Pega aquí el link de Google Maps..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Copia el link desde Google Maps o WhatsApp
                      </p>
                    </div>
                    {formData.google_maps_link && (
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCopyGoogleMapsLink}
                          className="h-10"
                        >
                          {copiedLink ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Additional Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Information
                  </h3>

                  <div>
                    <Label>Access Codes</Label>
                    <Textarea
                      value={formData.access_codes}
                      onChange={(e) => setFormData({ ...formData, access_codes: e.target.value })}
                      placeholder="Gate code: 1234&#10;Alarm code: 5678&#10;Key location: Under mat"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Special Instructions</Label>
                    <Textarea
                      value={formData.special_instructions}
                      onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                      placeholder="Any special cleaning requirements, areas to avoid, etc."
                      rows={3}
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

                    {/* Property quick stats */}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
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
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          {property.estimated_hours}h
                        </span>
                      )}
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
