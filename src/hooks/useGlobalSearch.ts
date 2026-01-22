import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  type: "job" | "client" | "property" | "staff";
  title: string;
  subtitle: string;
  metadata?: Record<string, string>;
}

export interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  staffId?: string;
}

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim() && !filters?.status && !filters?.staffId) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];
      const searchTerm = `%${query.toLowerCase()}%`;

      // Search jobs
      let jobsQuery = supabase
        .from("jobs")
        .select(`
          id,
          location,
          scheduled_date,
          scheduled_time,
          status,
          assigned_staff_id,
          clients(name),
          properties(name)
        `)
        .or(`location.ilike.${searchTerm}`)
        .limit(10);

      if (filters?.status) {
        jobsQuery = jobsQuery.eq("status", filters.status);
      }
      if (filters?.staffId) {
        jobsQuery = jobsQuery.eq("assigned_staff_id", filters.staffId);
      }
      if (filters?.dateFrom) {
        jobsQuery = jobsQuery.gte("scheduled_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        jobsQuery = jobsQuery.lte("scheduled_date", filters.dateTo);
      }

      const { data: jobs } = await jobsQuery;

      if (jobs) {
        jobs.forEach((job) => {
          const clientName = (job.clients as any)?.name || "Sin cliente";
          const propertyName = (job.properties as any)?.name;
          searchResults.push({
            id: job.id,
            type: "job",
            title: propertyName || job.location,
            subtitle: `${clientName} • ${job.scheduled_date} ${job.scheduled_time}`,
            metadata: { status: job.status },
          });
        });
      }

      // Search clients (only if no job-specific filters)
      if (!filters?.status && !filters?.staffId) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name, email, phone")
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        if (clients) {
          clients.forEach((client) => {
            searchResults.push({
              id: client.id,
              type: "client",
              title: client.name,
              subtitle: client.email || client.phone || "Sin contacto",
            });
          });
        }
      }

      // Search properties (only if no job-specific filters)
      if (!filters?.status && !filters?.staffId) {
        const { data: properties } = await supabase
          .from("properties")
          .select("id, name, address, clients(name)")
          .or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`)
          .limit(5);

        if (properties) {
          properties.forEach((property) => {
            const clientName = (property.clients as any)?.name;
            searchResults.push({
              id: property.id,
              type: "property",
              title: property.name,
              subtitle: clientName ? `${clientName} • ${property.address}` : property.address,
            });
          });
        }
      }

      // Search staff
      if (!filters?.status) {
        const { data: staff } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, email")
          .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        if (staff) {
          staff.forEach((member) => {
            searchResults.push({
              id: member.user_id,
              type: "staff",
              title: member.full_name,
              subtitle: member.email,
            });
          });
        }
      }

      setResults(searchResults);
    } catch (error) {
      // Search failed - user sees empty results
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clearResults };
}
