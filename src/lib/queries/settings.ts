import { supabase } from "@/integrations/supabase/client";
import type { CleaningService } from "@/components/settings/CleaningServicesManager";

export interface SystemSettings {
  company_name: string;
  company_logo: string;
  business_abn: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  gst_registered: boolean;
  default_geofence_radius: number;
  working_hours: { start: string; end: string };
  working_days: number[];
  cleaning_services: CleaningService[];
}

export const DEFAULT_SERVICES: CleaningService[] = [
  { id: "general", label: "General Cleaning", description: "Standard house cleaning" },
  { id: "deep", label: "Deep Cleaning", description: "Thorough top-to-bottom cleaning" },
  {
    id: "end_of_lease",
    label: "End of Lease Cleaning",
    description: "Bond back guarantee cleaning",
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  company_name: "Pulcrix",
  company_logo: "",
  business_abn: "",
  business_address: "",
  business_phone: "",
  business_email: "",
  gst_registered: true,
  default_geofence_radius: 100,
  working_hours: { start: "08:00", end: "18:00" },
  working_days: [1, 2, 3, 4, 5],
  cleaning_services: DEFAULT_SERVICES,
};

/** Fetch all system settings and build a typed settings object. */
export async function fetchSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase.from("system_settings").select("key, value");

  if (error) throw new Error(`Failed to load settings: ${error.message}`);

  const settings = { ...DEFAULT_SETTINGS };

  if (data) {
    data.forEach((item) => {
      const key = item.key as keyof SystemSettings;
      if (key === "company_name" || key === "company_logo") {
        (settings[key] as string) = item.value as string;
      } else if (
        key === "business_abn" ||
        key === "business_address" ||
        key === "business_phone" ||
        key === "business_email"
      ) {
        (settings[key] as string) = item.value as string;
      } else if (key === "gst_registered") {
        settings[key] = item.value as boolean;
      } else if (key === "default_geofence_radius") {
        settings[key] = item.value as number;
      } else if (key === "working_hours") {
        settings[key] = item.value as { start: string; end: string };
      } else if (key === "working_days") {
        settings[key] = item.value as number[];
      } else if (key === "cleaning_services") {
        if (Array.isArray(item.value)) {
          settings[key] = item.value as unknown as CleaningService[];
        }
      }
    });
  }

  return settings;
}

/** Save all system settings via individual upserts. */
export async function saveSettings(settings: SystemSettings): Promise<void> {
  const updates: { key: string; value: unknown }[] = [
    { key: "company_name", value: settings.company_name },
    { key: "company_logo", value: settings.company_logo },
    { key: "business_abn", value: settings.business_abn },
    { key: "business_address", value: settings.business_address },
    { key: "business_phone", value: settings.business_phone },
    { key: "business_email", value: settings.business_email },
    { key: "gst_registered", value: settings.gst_registered },
    { key: "default_geofence_radius", value: settings.default_geofence_radius },
    { key: "working_hours", value: settings.working_hours },
    { key: "working_days", value: settings.working_days },
    { key: "cleaning_services", value: settings.cleaning_services },
  ];

  for (const update of updates) {
    const { data: updateData, error: updateError } = await supabase
      .from("system_settings")
      .update({ value: update.value as never })
      .eq("key", update.key)
      .select();

    if (!updateError && (!updateData || updateData.length === 0)) {
      await supabase
        .from("system_settings")
        .insert([{ key: update.key, value: update.value as never }]);
    }
  }
}
