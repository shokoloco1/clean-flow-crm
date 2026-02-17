import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import { type Client } from "@/lib/queries/clients";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface UseClientDeleteOptions {
  onDeleteSuccess?: (deletedClientId: string) => void;
}

export function useClientDelete(options?: UseClientDeleteOptions) {
  const queryClient = useQueryClient();
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientJobCount, setClientJobCount] = useState(0);
  const [isCheckingJobs, setIsCheckingJobs] = useState(false);

  const handleDeleteClick = async (client: Client) => {
    setClientToDelete(client);
    setIsCheckingJobs(true);
    setIsDeleteDialogOpen(true);

    const { count, error } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id);

    if (error) logger.error("Error checking jobs:", error);
    setClientJobCount(error ? 0 : count || 0);
    setIsCheckingJobs(false);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (clientJobCount > 0) {
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ client_id: null })
          .eq("client_id", id);
        if (updateError) logger.error("Error unlinking jobs:", updateError);
      }
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Client deleted successfully");
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      setClientJobCount(0);
      options?.onDeleteSuccess?.(deletedId);
    },
    onError: () => toast.error("Error deleting client"),
  });

  const confirmDelete = () => {
    if (clientToDelete) deleteMutation.mutate(clientToDelete.id);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setClientToDelete(null);
      setClientJobCount(0);
    }
  };

  return {
    clientToDelete,
    isDeleteDialogOpen,
    clientJobCount,
    isCheckingJobs,
    handleDeleteClick,
    confirmDelete,
    handleDialogOpenChange,
    isDeleting: deleteMutation.isPending,
  };
}
