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

      // Run all queries in parallel for faster results
      const [jobsResult, clientsResult, propertiesResult, staffResult] = await Promise.all([
        jobsQuery,
        (!filters?.status && !filters?.staffId) 
          ? supabase
              .from("clients")
              .select("id, name, email, phone")
              .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
              .limit(5)
          : Promise.resolve({ data: null }),
        (!filters?.status && !filters?.staffId)
          ? supabase
              .from("properties")
              .select("id, name, address, clients(name)")
              .or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`)
              .limit(5)
          : Promise.resolve({ data: null }),
        (!filters?.status)
          ? supabase
              .from("profiles")
              .select("id, user_id, full_name, email, phone")
              .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
              .limit(5)
          : Promise.resolve({ data: null })
      ]);

      // Process jobs
      if (jobsResult.data) {
        jobsResult.data.forEach((job) => {
          const clientName = (job.clients as any)?.name || "No client";
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

      // Process clients
      if (clientsResult.data) {
        clientsResult.data.forEach((client) => {
          searchResults.push({
            id: client.id,
            type: "client",
            title: client.name,
            subtitle: client.email || client.phone || "Sin contacto",
            metadata: { 
              phone: client.phone || undefined,
              email: client.email || undefined 
            },
          });
        });
      }

      // Process properties
      if (propertiesResult.data) {
        propertiesResult.data.forEach((property) => {
          const clientName = (property.clients as any)?.name;
          searchResults.push({
            id: property.id,
            type: "property",
            title: property.name,
            subtitle: clientName ? `${clientName} • ${property.address}` : property.address,
          });
        });
      }

      // Process staff
      if (staffResult.data) {
        staffResult.data.forEach((member) => {
          searchResults.push({
            id: member.user_id,
            type: "staff",
            title: member.full_name,
            subtitle: member.email,
            metadata: {
              phone: (member as any).phone || undefined,
              email: member.email || undefined
            },
          });
        });
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
