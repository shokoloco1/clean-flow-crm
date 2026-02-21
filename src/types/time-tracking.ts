export interface TimeEntry {
  id: string;
  job_id: string;
  staff_id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  break_minutes: number;
  billable_minutes: number | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  status: "active" | "completed" | "edited" | "disputed";
  staff_notes: string | null;
  admin_notes: string | null;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithDetails extends TimeEntry {
  profiles?: { full_name: string; email: string } | null;
  jobs?: {
    location: string;
    scheduled_date: string;
    scheduled_time: string;
    clients: { name: string } | null;
  } | null;
}

export interface StaffPayRate {
  id: string;
  staff_id: string;
  hourly_rate: number;
  overtime_rate: number | null;
  overtime_threshold_hours: number;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayReport {
  id: string;
  period_start: string;
  period_end: string;
  generated_by: string;
  generated_at: string;
  report_data: PayReportData;
  status: "draft" | "approved" | "exported";
  approved_by: string | null;
  approved_at: string | null;
  exported_format: string | null;
  exported_at: string | null;
  created_at: string;
}

export interface PayReportStaffEntry {
  staff_id: string;
  name: string;
  hourly_rate: number;
  total_hours: number;
  overtime_hours: number;
  regular_hours: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
  jobs: PayReportJobEntry[];
}

export interface PayReportJobEntry {
  job_id: string;
  client_name: string;
  date: string;
  hours: number;
  amount: number;
}

export interface PayReportData {
  staff: PayReportStaffEntry[];
  totals: {
    total_hours: number;
    total_pay: number;
    total_staff: number;
  };
}
