import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Building, MapPin, Clock, Save, Loader2, Receipt } from "lucide-react";
import { CleaningServicesManager, CleaningService } from "@/components/settings/CleaningServicesManager";
import { formatABN, validateABN } from "@/lib/australian";
import { AdminLayout } from "@/components/admin";

interface SystemSettings {
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

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DEFAULT_SERVICES: CleaningService[] = [
  { id: 'general', label: 'General Cleaning', description: 'Standard house cleaning' },
  { id: 'deep', label: 'Deep Cleaning', description: 'Thorough top-to-bottom cleaning' },
  { id: 'end_of_lease', label: 'End of Lease Cleaning', description: 'Bond back guarantee cleaning' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [abnError, setAbnError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
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
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        const newSettings = { ...settings };
        data.forEach((item) => {
          const key = item.key as keyof SystemSettings;
          if (key === "company_name" || key === "company_logo") {
            (newSettings[key] as string) = item.value as string;
          } else if (key === "default_geofence_radius") {
            newSettings[key] = item.value as number;
          } else if (key === "working_hours") {
            newSettings[key] = item.value as { start: string; end: string };
          } else if (key === "working_days") {
            newSettings[key] = item.value as number[];
          } else if (key === "cleaning_services") {
            if (Array.isArray(item.value)) {
              newSettings[key] = item.value as unknown as CleaningService[];
            }
          }
        });
        
        setSettings(newSettings);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleABNChange = (value: string) => {
    // Remove non-digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 11);
    setSettings(prev => ({ ...prev, business_abn: cleanValue }));
    
    if (cleanValue.length === 11) {
      if (!validateABN(cleanValue)) {
        setAbnError("Invalid ABN - check the number");
      } else {
        setAbnError(null);
      }
    } else if (cleanValue.length > 0) {
      setAbnError("ABN must be 11 digits");
    } else {
      setAbnError(null);
    }
  };

  const handleSave = async () => {
    // Validate ABN before saving
    if (settings.business_abn && !validateABN(settings.business_abn)) {
      toast({
        title: "Invalid ABN",
        description: "Please enter a valid 11-digit Australian Business Number",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
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
        // Try update first
        const { data: updateData, error: updateError } = await supabase
          .from("system_settings")
          .update({ value: update.value as never })
          .eq("key", update.key)
          .select();

        // If no rows updated, insert new record
        if (!updateError && (!updateData || updateData.length === 0)) {
          await supabase
            .from("system_settings")
            .insert([{ key: update.key, value: update.value as never }]);
        }
      }

      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    setSettings((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day].sort(),
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your business settings and preferences
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Company Information
              </CardTitle>
              <CardDescription>
                Customize your company name and logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, company_name: e.target.value }))
                  }
                  placeholder="Your company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_logo">Logo URL</Label>
                <Input
                  id="company_logo"
                  value={settings.company_logo}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, company_logo: e.target.value }))
                  }
                  placeholder="https://example.com/logo.png"
                />
                {settings.company_logo && (
                  <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <img
                      src={settings.company_logo}
                      alt="Logo preview"
                      className="h-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tax & GST Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Tax & GST Settings
              </CardTitle>
              <CardDescription>
                Configure your Australian Business Number and GST registration.
                Required for businesses with annual turnover &gt; $75,000 AUD.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_abn">ABN (Australian Business Number)</Label>
                <Input
                  id="business_abn"
                  value={settings.business_abn ? formatABN(settings.business_abn) : ""}
                  onChange={(e) => handleABNChange(e.target.value)}
                  placeholder="XX XXX XXX XXX"
                  maxLength={14}
                  className={abnError ? "border-destructive" : ""}
                />
                {abnError && (
                  <p className="text-sm text-destructive">{abnError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Your ABN will appear on all tax invoices
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_address">Business Address</Label>
                <Input
                  id="business_address"
                  value={settings.business_address}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, business_address: e.target.value }))
                  }
                  placeholder="123 Main St, Sydney NSW 2000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_phone">Business Phone</Label>
                  <Input
                    id="business_phone"
                    value={settings.business_phone}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, business_phone: e.target.value }))
                    }
                    placeholder="0400 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_email">Business Email</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={settings.business_email}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, business_email: e.target.value }))
                    }
                    placeholder="accounts@example.com.au"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="gst_registered" className="font-medium">GST Registered</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable to add 10% GST to all invoices
                  </p>
                </div>
                <Switch
                  id="gst_registered"
                  checked={settings.gst_registered}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, gst_registered: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Cleaning Services */}
          <CleaningServicesManager
            services={settings.cleaning_services}
            onServicesChange={(services) => 
              setSettings(prev => ({ ...prev, cleaning_services: services }))
            }
          />

          {/* Geofence Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Geofence Settings
              </CardTitle>
              <CardDescription>
                Set the default geofence radius for properties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="geofence_radius">Default Radius (meters)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="geofence_radius"
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.default_geofence_radius}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        default_geofence_radius: parseInt(e.target.value) || 100,
                      }))
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    Range: 10 - 1000 meters
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This value will be used as the default radius when creating new properties.
                  Staff must be within this radius to check-in/check-out.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Working Hours
              </CardTitle>
              <CardDescription>
                Configure business hours and working days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={settings.working_hours.start}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        working_hours: { ...prev.working_hours, start: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={settings.working_hours.end}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        working_hours: { ...prev.working_hours, end: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Working Days</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day.value}
                      className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleWorkingDay(day.value)}
                    >
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={settings.working_days.includes(day.value)}
                        onCheckedChange={() => toggleWorkingDay(day.value)}
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="cursor-pointer font-normal"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
