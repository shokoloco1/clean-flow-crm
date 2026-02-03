import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessSettings {
  company_name: string;
  company_logo: string;
  business_abn: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  gst_registered: boolean;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  company_name: "Pulcrix",
  company_logo: "",
  business_abn: "",
  business_address: "",
  business_phone: "",
  business_email: "",
  gst_registered: true, // Default true for AU businesses > $75k
};

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", [
          "company_name",
          "company_logo", 
          "business_abn",
          "business_address",
          "business_phone",
          "business_email",
          "gst_registered",
        ]);

      if (error) throw error;

      if (data) {
        const newSettings = { ...DEFAULT_SETTINGS };
        data.forEach((item) => {
          const key = item.key as keyof BusinessSettings;
          if (key in newSettings) {
            if (key === "gst_registered") {
              newSettings[key] = item.value === true || item.value === "true";
            } else {
              (newSettings[key] as string) = String(item.value || "");
            }
          }
        });
        setSettings(newSettings);
      }
    } catch (err) {
      console.error("Error fetching business settings:", err);
      setError("Failed to load business settings");
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, error, refetch: fetchSettings };
}
