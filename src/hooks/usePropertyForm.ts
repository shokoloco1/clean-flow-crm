import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import { type PropertyRecord } from "@/lib/queries/properties";
import { toast } from "sonner";
import { CONFIG } from "@/lib/config";

export interface PropertyFormData {
  name: string;
  address: string;
  suburb: string;
  post_code: string;
  state: string;
  google_maps_link: string;
  size_sqm: string;
  property_type: string;
  special_instructions: string;
  access_codes: string;
  client_id: string;
  bedrooms: string;
  bathrooms: string;
  living_areas: string;
  floors: string;
  floor_type: string;
  has_pool: boolean;
  has_garage: boolean;
  has_pets: boolean;
  pet_details: string;
  sofas: string;
  dining_chairs: string;
  beds: string;
  rugs: string;
}

const INITIAL_FORM_DATA: PropertyFormData = {
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
};

export function usePropertyForm() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM_DATA);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingProperty, setEditingProperty] = useState<PropertyRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const estimatedTime = useMemo(() => {
    let minutes = 60;
    minutes += parseInt(formData.bedrooms || "0") * 30;
    minutes += parseInt(formData.bathrooms || "0") * 20;
    minutes += parseInt(formData.living_areas || "0") * 15;
    minutes += (parseInt(formData.floors || "1") - 1) * 15;
    if (formData.has_pool) minutes += 30;
    if (formData.has_garage) minutes += 15;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return { hours, minutes: remainingMinutes, totalMinutes: minutes, totalHours: minutes / 60 };
  }, [
    formData.bedrooms,
    formData.bathrooms,
    formData.living_areas,
    formData.floors,
    formData.has_pool,
    formData.has_garage,
  ]);

  const invalidateProperties = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
  }, [queryClient]);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setEditingProperty(null);
    setFieldErrors({});
  }, []);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) resetForm();
    },
    [resetForm],
  );

  const handleEdit = useCallback((property: PropertyRecord) => {
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
  }, []);

  const handleCopyGoogleMapsLink = useCallback(async () => {
    if (formData.google_maps_link) {
      await navigator.clipboard.writeText(formData.google_maps_link);
      setCopiedLink(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(false), CONFIG.ui.feedbackDuration);
    }
  }, [formData.google_maps_link]);

  const handlePositiveNumberChange = useCallback(
    (field: string, value: string) => {
      const num = parseInt(value) || 0;
      const safeValue = Math.max(0, num).toString();
      setFormData((prev) => ({ ...prev, [field]: safeValue }));
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [fieldErrors],
  );

  const handleSubmit = useCallback(async () => {
    setFieldErrors({});
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Property name is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (formData.post_code && !/^\d{4}$/.test(formData.post_code)) {
      errors.post_code = "Post code must be 4 digits";
    }

    const numericFields = [
      "bedrooms",
      "bathrooms",
      "living_areas",
      "floors",
      "sofas",
      "dining_chairs",
      "beds",
      "rugs",
    ];
    numericFields.forEach((field) => {
      const value = parseInt(formData[field as keyof PropertyFormData] as string);
      if (isNaN(value) || value < 0) errors[field] = "Must be 0 or a positive number";
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the form errors");
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
    invalidateProperties();
  }, [formData, editingProperty, estimatedTime.totalHours, resetForm, invalidateProperties]);

  return {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    editingProperty,
    isDialogOpen,
    copiedLink,
    estimatedTime,
    handleDialogOpenChange,
    handleEdit,
    handleCopyGoogleMapsLink,
    handlePositiveNumberChange,
    handleSubmit,
  };
}
