import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import { type Client } from "@/lib/queries/clients";
import { toast } from "sonner";
import {
  capitalizeWords,
  formatAUPhone,
  formatABN,
  isValidEmail,
  isValidAUPhone,
  isValidABN,
} from "@/lib/validation";

export type ClientFormData = Omit<Client, "id" | "created_at" | "updated_at" | "portal_token">;

const emptyClient: ClientFormData = {
  name: "",
  email: "",
  phone: "",
  abn: "",
  notes: "",
};

interface UseClientFormOptions {
  onMutateSuccess?: (editedClientId?: string) => void;
}

export function useClientForm(options?: UseClientFormOptions) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ClientFormData>(emptyClient);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, name: e.target.value }));
      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
    },
    [fieldErrors.name],
  );

  const handleNameBlur = useCallback(() => {
    if (formData.name) {
      setFormData((prev) => ({ ...prev, name: capitalizeWords(prev.name) }));
    }
  }, [formData.name]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setFormData((prev) => ({ ...prev, email: value }));
    if (value && !isValidEmail(value)) {
      setFieldErrors((prev) => ({ ...prev, email: "Invalid email format" }));
    } else {
      setFieldErrors((prev) => ({ ...prev, email: "" }));
    }
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAUPhone(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
    const digits = formatted.replace(/\D/g, "");
    if (digits.length >= 10 && !isValidAUPhone(formatted)) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: "Invalid AU phone (04XX XXX XXX or +61 X XXXX XXXX)",
      }));
    } else {
      setFieldErrors((prev) => ({ ...prev, phone: "" }));
    }
  }, []);

  const handleABNChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatABN(e.target.value);
    setFormData((prev) => ({ ...prev, abn: formatted }));
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 11 && !isValidABN(formatted)) {
      setFieldErrors((prev) => ({ ...prev, abn: "Invalid ABN (checksum failed)" }));
    } else {
      setFieldErrors((prev) => ({ ...prev, abn: "" }));
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData(emptyClient);
    setFieldErrors({});
    setEditingClient(null);
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const { error } = await supabase.from("clients").insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        abn: data.abn || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      toast.success("Client created successfully");
      setIsCreateOpen(false);
      resetForm();
      options?.onMutateSuccess?.();
    },
    onError: () => toast.error("Error creating client"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClientFormData }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          abn: data.abn || null,
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (editedId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      toast.success("Client updated");
      setIsCreateOpen(false);
      resetForm();
      options?.onMutateSuccess?.(editedId);
    },
    onError: () => toast.error("Error updating client"),
  });

  const handleSubmit = () => {
    setFieldErrors({});
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (formData.email && !isValidEmail(formData.email)) errors.email = "Invalid email format";

    const phoneDigits = (formData.phone || "").replace(/\D/g, "");
    if (phoneDigits.length > 0 && phoneDigits.length >= 10 && !isValidAUPhone(formData.phone || ""))
      errors.phone = "Invalid Australian phone number";

    const abnDigits = (formData.abn || "").replace(/\D/g, "");
    if (abnDigits.length === 11 && !isValidABN(formData.abn || "")) errors.abn = "Invalid ABN";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the form errors");
      return;
    }

    const cleanData: ClientFormData = {
      ...formData,
      name: capitalizeWords(formData.name.trim()),
      email: formData.email?.trim() || "",
      phone: formData.phone?.trim() || "",
      abn: formData.abn?.trim() || "",
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      abn: client.abn || "",
      notes: client.notes || "",
    });
    setIsCreateOpen(true);
  };

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsCreateOpen(open);
      if (!open) resetForm();
    },
    [resetForm],
  );

  return {
    formData,
    setFormData,
    fieldErrors,
    editingClient,
    isCreateOpen,
    setIsCreateOpen,
    handleNameChange,
    handleNameBlur,
    handleEmailChange,
    handlePhoneChange,
    handleABNChange,
    handleSubmit,
    openEditDialog,
    handleDialogOpenChange,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
}
