// Query key factory for consistent cache management across the app.
// Convention: queryKeys.<domain>.<scope>(<params>)
// Usage: useQuery({ queryKey: queryKeys.jobs.today(), queryFn: ... })

export const queryKeys = {
  jobs: {
    all: () => ["jobs"] as const,
    today: () => ["jobs", "today"] as const,
    byId: (id: string) => ["jobs", id] as const,
    byDate: (date: string) => ["jobs", "date", date] as const,
  },
  clients: {
    all: () => ["clients"] as const,
    list: (params: { page: number; search: string }) =>
      ["clients", "list", params] as const,
    byId: (id: string) => ["clients", id] as const,
    dropdown: () => ["clients", "dropdown"] as const,
  },
  invoices: {
    all: () => ["invoices"] as const,
    list: (params?: { page: number; search: string }) =>
      params ? (["invoices", "list", params] as const) : (["invoices", "list"] as const),
    byId: (id: string) => ["invoices", id] as const,
  },
  staff: {
    all: () => ["staff"] as const,
    byId: (id: string) => ["staff", id] as const,
    dropdown: () => ["staff", "dropdown"] as const,
  },
  properties: {
    all: () => ["properties"] as const,
    list: (params?: { page: number; search: string }) =>
      params ? (["properties", "list", params] as const) : (["properties", "list"] as const),
    byId: (id: string) => ["properties", id] as const,
    photos: (id: string) => ["properties", id, "photos"] as const,
    dropdown: () => ["properties", "dropdown"] as const,
  },
  recurring: {
    all: () => ["recurring"] as const,
    list: (params?: { page: number; search: string }) =>
      params ? (["recurring", "list", params] as const) : (["recurring", "list"] as const),
    byId: (id: string) => ["recurring", id] as const,
  },
  dashboard: {
    today: () => ["dashboard", "today"] as const,
  },
  settings: {
    all: () => ["settings"] as const,
    list: () => ["settings", "list"] as const,
  },
  metrics: {
    operational: (period: string) => ["metrics", "operational", period] as const,
    business: (period: string) => ["metrics", "business", period] as const,
  },
  calendar: {
    all: () => ["calendar"] as const,
    jobs: () => ["calendar", "jobs"] as const,
  },
  staffDashboard: {
    myJobs: (userId: string) => ["staffDashboard", "myJobs", userId] as const,
    checklistProgress: (userId: string) => ["staffDashboard", "checklist", userId] as const,
  },
} as const;
