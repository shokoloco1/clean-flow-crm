import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";

export function usePropertyDelete() {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Property deleted!");
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
    },
    onError: () => {
      toast.error("Failed to delete property");
    },
  });

  const openDeleteDialog = useCallback((id: string) => {
    setPropertyToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!propertyToDelete) return;
    deleteMutation.mutate(propertyToDelete);
  }, [propertyToDelete, deleteMutation]);

  return {
    deleteDialogOpen,
    setDeleteDialogOpen,
    propertyToDelete,
    openDeleteDialog,
    handleDelete,
    isDeleting: deleteMutation.isPending,
  };
}
