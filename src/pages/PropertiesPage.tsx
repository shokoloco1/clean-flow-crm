import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import {
  fetchPropertiesPaginated,
  fetchPropertyPhotos,
  type PropertyRecord,
} from "@/lib/queries/properties";
import { fetchClientsDropdown } from "@/lib/queries/reference";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries/pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePropertyForm } from "@/hooks/usePropertyForm";
import { usePropertyDelete } from "@/hooks/usePropertyDelete";
import { PropertyDetailView } from "@/components/properties/PropertyDetailView";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyFormDialog } from "@/components/properties/PropertyFormDialog";
import { PaginatedControls } from "@/components/PaginatedControls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Building2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PropertiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const propertyForm = usePropertyForm();
  const propertyDelete = usePropertyDelete();

  const [selectedProperty, setSelectedProperty] = useState<PropertyRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: propertiesResult, isLoading } = useQuery({
    queryKey: queryKeys.properties.list({ page, search: debouncedSearch }),
    queryFn: () =>
      fetchPropertiesPaginated({ page, pageSize: DEFAULT_PAGE_SIZE, search: debouncedSearch }),
  });
  const properties = propertiesResult?.data ?? [];
  const totalCount = propertiesResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / DEFAULT_PAGE_SIZE);

  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients.dropdown(),
    queryFn: fetchClientsDropdown,
    staleTime: 5 * 60 * 1000,
  });

  const { data: propertyPhotos = [] } = useQuery({
    queryKey: queryKeys.properties.photos(selectedProperty?.id ?? ""),
    queryFn: () => fetchPropertyPhotos(selectedProperty!.id),
    enabled: !!selectedProperty,
  });

  const handleToggleActive = async (property: PropertyRecord) => {
    const { error } = await supabase
      .from("properties")
      .update({ is_active: !property.is_active })
      .eq("id", property.id);
    if (error) {
      toast.error("Failed to update property status");
      return;
    }
    toast.success(property.is_active ? "Property archived" : "Property activated");
    queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
  };

  // Detail view
  if (selectedProperty) {
    return (
      <PropertyDetailView
        property={selectedProperty}
        photos={propertyPhotos}
        onBack={() => setSelectedProperty(null)}
      />
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Properties</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => propertyForm.handleDialogOpenChange(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="sticky top-0 z-10 hidden border-b border-border bg-card md:block">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground">{totalCount} properties</p>
          </div>
          <Button onClick={() => propertyForm.handleDialogOpenChange(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : properties.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No properties yet</h3>
            <p className="mb-4 text-muted-foreground">Add your first property to get started</p>
            <Button onClick={() => propertyForm.handleDialogOpenChange(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onView={setSelectedProperty}
                onEdit={propertyForm.handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={propertyDelete.openDeleteDialog}
              />
            ))}
          </div>
        )}

        <PaginatedControls page={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={propertyDelete.deleteDialogOpen}
          onOpenChange={propertyDelete.setDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this property? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={propertyDelete.isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={propertyDelete.handleDelete}
                disabled={propertyDelete.isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {propertyDelete.isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => propertyForm.handleDialogOpenChange(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform active:scale-95 md:hidden"
        aria-label="Add Property"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Form Dialog */}
      <PropertyFormDialog
        isOpen={propertyForm.isDialogOpen}
        onOpenChange={propertyForm.handleDialogOpenChange}
        editingProperty={propertyForm.editingProperty}
        formData={propertyForm.formData}
        setFormData={propertyForm.setFormData}
        fieldErrors={propertyForm.fieldErrors}
        setFieldErrors={propertyForm.setFieldErrors}
        estimatedTime={propertyForm.estimatedTime}
        copiedLink={propertyForm.copiedLink}
        clients={clients}
        onPositiveNumberChange={propertyForm.handlePositiveNumberChange}
        onCopyGoogleMapsLink={propertyForm.handleCopyGoogleMapsLink}
        onSubmit={propertyForm.handleSubmit}
      />
    </div>
  );
}
