import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface CleaningService {
  id: string;
  label: string;
  description: string;
}

const DEFAULT_SERVICES: CleaningService[] = [
  { id: 'general', label: 'General Cleaning', description: 'Standard house cleaning' },
  { id: 'deep', label: 'Deep Cleaning', description: 'Thorough top-to-bottom cleaning' },
  { id: 'end_of_lease', label: 'End of Lease Cleaning', description: 'Bond back guarantee cleaning' },
];

export function useCleaningServices() {
  const [services, setServices] = useState<CleaningService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "cleaning_services")
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        // Handle both array and object formats
        const value = data.value;
        if (Array.isArray(value)) {
          setServices(value as unknown as CleaningService[]);
        } else {
          setServices(DEFAULT_SERVICES);
        }
      } else {
        setServices(DEFAULT_SERVICES);
      }
    } catch (err) {
      logger.error("Error fetching cleaning services:", err);
      setError("Failed to load cleaning services");
      setServices(DEFAULT_SERVICES);
    } finally {
      setLoading(false);
    }
  };

  return { services, loading, error, refetch: fetchServices };
}
