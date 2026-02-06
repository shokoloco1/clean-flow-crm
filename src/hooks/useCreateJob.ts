import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface Client {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface Staff {
  user_id: string;
  full_name: string;
}

export interface NewJobData {
  client_id: string;
  location: string;
  assigned_staff_id: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
  checklist: string;
}

const initialJobData: NewJobData = {
  client_id: '',
  location: '',
  assigned_staff_id: '',
  scheduled_date: format(new Date(), 'yyyy-MM-dd'),
  scheduled_time: '09:00',
  notes: '',
  checklist: ''
};

export function useCreateJob(onJobCreated?: () => void) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [newJob, setNewJob] = useState<NewJobData>(initialJobData);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchClientsAndStaff = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, address, phone, email")
        .order("name");

      if (clientsError) {
        throw new Error(`Failed to load clients: ${clientsError.message}`);
      }

      const { data: staffRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");

      if (rolesError) {
        throw new Error(`Failed to load staff roles: ${rolesError.message}`);
      }

      const staffIds = staffRoles?.map(r => r.user_id) || [];

      if (staffIds.length > 0) {
        const { data: staffData, error: staffError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", staffIds);

        if (staffError) {
          throw new Error(`Failed to load staff profiles: ${staffError.message}`);
        }

        setStaffList((staffData as Staff[]) || []);
      } else {
        setStaffList([]);
      }

      setClients((clientsData as Client[]) || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      logger.error("Error fetching clients/staff:", error);
      setFetchError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientsAndStaff();
  }, []);

  const handleCreateJob = async () => {
    if (!newJob.client_id || !newJob.location || !newJob.assigned_staff_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    const checklistArray = newJob.checklist
      .split('\n')
      .filter(item => item.trim())
      .map(item => item.trim());

    const { error } = await supabase.from("jobs").insert({
      client_id: newJob.client_id,
      location: newJob.location,
      assigned_staff_id: newJob.assigned_staff_id,
      scheduled_date: newJob.scheduled_date,
      scheduled_time: newJob.scheduled_time,
      notes: newJob.notes || null,
      checklist: checklistArray
    });

    if (error) {
      toast.error("Failed to create job");
    } else {
      toast.success("Job created successfully!");
      setIsCreateOpen(false);
      setNewJob(initialJobData);
      onJobCreated?.();
    }
  };

  return {
    isCreateOpen,
    setIsCreateOpen,
    clients,
    staffList,
    newJob,
    setNewJob,
    handleCreateJob,
    fetchClientsAndStaff,
    isLoading,
    fetchError,
  };
}
