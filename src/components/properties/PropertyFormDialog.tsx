import { type PropertyFormData } from "@/hooks/usePropertyForm";
import { type PropertyRecord } from "@/lib/queries/properties";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Home,
  Bed,
  Bath,
  Sofa,
  Car,
  Dog,
  Clock,
  Waves,
  Layers,
  AlertCircle,
  Link2,
  Copy,
  Check,
  FileText,
} from "lucide-react";

interface ClientDropdownItem {
  id: string;
  name: string;
}

const floorTypeOptions = [
  { value: "tile", label: "Tile" },
  { value: "hardwood", label: "Hardwood" },
  { value: "carpet", label: "Carpet" },
  { value: "laminate", label: "Laminate" },
  { value: "mixed", label: "Mixed" },
];

interface PropertyFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingProperty: PropertyRecord | null;
  formData: PropertyFormData;
  setFormData: React.Dispatch<React.SetStateAction<PropertyFormData>>;
  fieldErrors: Record<string, string>;
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  estimatedTime: { hours: number; minutes: number; totalMinutes: number; totalHours: number };
  copiedLink: boolean;
  clients: ClientDropdownItem[];
  onPositiveNumberChange: (field: string, value: string) => void;
  onCopyGoogleMapsLink: () => void;
  onSubmit: () => void;
}

export function PropertyFormDialog({
  isOpen,
  onOpenChange,
  editingProperty,
  formData,
  setFormData,
  fieldErrors,
  setFieldErrors,
  estimatedTime,
  copiedLink,
  clients,
  onPositiveNumberChange,
  onCopyGoogleMapsLink,
  onSubmit,
}: PropertyFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Property Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="e.g., Smith Family Home"
                  className={fieldErrors.name ? "border-destructive" : ""}
                />
                {fieldErrors.name && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
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
                    setFormData((prev) => ({ ...prev, address: e.target.value }));
                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: "" }));
                  }}
                  placeholder="Full address"
                  className={fieldErrors.address ? "border-destructive" : ""}
                />
                {fieldErrors.address && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              <div>
                <Label>Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, client_id: v }))}
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
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, property_type: v }))}
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
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <Label>Suburb</Label>
                <Input
                  value={formData.suburb}
                  onChange={(e) => setFormData((prev) => ({ ...prev, suburb: e.target.value }))}
                  placeholder="e.g., Bondi"
                />
              </div>
              <div className="space-y-1">
                <Label>Post Code</Label>
                <Input
                  value={formData.post_code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setFormData((prev) => ({ ...prev, post_code: val }));
                    if (fieldErrors.post_code)
                      setFieldErrors((prev) => ({ ...prev, post_code: "" }));
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
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, state: v }))}
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

          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Home className="h-4 w-4" />
              Property Details
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                  onChange={(e) => onPositiveNumberChange("bedrooms", e.target.value)}
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
                  onChange={(e) => onPositiveNumberChange("bathrooms", e.target.value)}
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
                  onChange={(e) => onPositiveNumberChange("living_areas", e.target.value)}
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
                  onChange={(e) => onPositiveNumberChange("floors", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Main Floor Type</Label>
                <Select
                  value={formData.floor_type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, floor_type: v }))}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, size_sqm: e.target.value }))}
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
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, has_pool: checked as boolean }))
                  }
                />
                <Label htmlFor="has_pool" className="flex cursor-pointer items-center gap-1">
                  <Waves className="h-3 w-3" />
                  Has Pool/Spa
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_garage"
                  checked={formData.has_garage}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, has_garage: checked as boolean }))
                  }
                />
                <Label htmlFor="has_garage" className="flex cursor-pointer items-center gap-1">
                  <Car className="h-3 w-3" />
                  Has Garage
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_pets"
                  checked={formData.has_pets}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, has_pets: checked as boolean }))
                  }
                />
                <Label htmlFor="has_pets" className="flex cursor-pointer items-center gap-1">
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
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, pet_details: e.target.value }))
                  }
                  placeholder="e.g., 2 dogs, stay in living room and backyard"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Furniture & Items */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sofa className="h-4 w-4" />
              Furniture & Items
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <Label>Sofas/Couches</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.sofas}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sofas: e.target.value }))}
                />
              </div>

              <div>
                <Label>Dining Chairs</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.dining_chairs}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dining_chairs: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Beds</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.beds}
                  onChange={(e) => setFormData((prev) => ({ ...prev, beds: e.target.value }))}
                />
              </div>

              <div>
                <Label>Rugs/Carpets</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.rugs}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rugs: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Estimated Cleaning Time */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
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
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Link2 className="h-4 w-4" />
              Location (Google Maps)
            </h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Google Maps Link</Label>
                <Input
                  value={formData.google_maps_link}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, google_maps_link: e.target.value }))
                  }
                  placeholder="Paste Google Maps link here..."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Copy the link from Google Maps or WhatsApp
                </p>
              </div>
              {formData.google_maps_link && (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCopyGoogleMapsLink}
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
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Additional Information
            </h3>

            <div>
              <Label>Access Codes</Label>
              <Textarea
                value={formData.access_codes}
                onChange={(e) => setFormData((prev) => ({ ...prev, access_codes: e.target.value }))}
                placeholder="Gate code: 1234&#10;Alarm code: 5678&#10;Key location: Under mat"
                rows={3}
              />
            </div>

            <div>
              <Label>Special Instructions</Label>
              <Textarea
                value={formData.special_instructions}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, special_instructions: e.target.value }))
                }
                placeholder="Any special cleaning requirements, areas to avoid, etc."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={onSubmit} className="flex-1">
              {editingProperty ? "Update Property" : "Create Property"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
