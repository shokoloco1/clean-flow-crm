import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Building, MapPin, Clock, Save, Loader2, Receipt } from "lucide-react";
import { CleaningServicesManager } from "@/components/settings/CleaningServicesManager";
import { formatABN, validateABN } from "@/lib/australian";
import { AdminLayout } from "@/components/admin";
import { queryKeys } from "@/lib/queries/keys";
import {
  fetchSettings,
  saveSettings,
  DEFAULT_SERVICES,
  type SystemSettings,
} from "@/lib/queries/settings";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DEFAULT_FORM_STATE: SystemSettings = {
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

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [abnError, setAbnError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_FORM_STATE);

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: queryKeys.settings.list(),
    queryFn: fetchSettings,
  });

  // Hydrate form state when query data arrives
  useEffect(() => {
    if (queryData) {
      setSettings(queryData);
    }
  }, [queryData]);

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not save settings",
        variant: "destructive",
      });
    },
  });

  const handleABNChange = (value: string) => {
    // Remove non-digits
    const cleanValue = value.replace(/\D/g, "").slice(0, 11);
    setSettings((prev) => ({ ...prev, business_abn: cleanValue }));

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

  const handleSave = () => {
    // Validate ABN before saving
    if (settings.business_abn && !validateABN(settings.business_abn)) {
      toast({
        title: "Invalid ABN",
        description: "Please enter a valid 11-digit Australian Business Number",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate(settings);
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
        <div className="flex min-h-[50vh] items-center justify-center">
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
              <CardDescription>Customize your company name and logo</CardDescription>
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
                  <div className="mt-2 rounded-lg border border-border bg-muted/50 p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Preview:</p>
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
                Configure your Australian Business Number and GST registration. Required for
                businesses with annual turnover &gt; $75,000 AUD.
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
                {abnError && <p className="text-sm text-destructive">{abnError}</p>}
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

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <Label htmlFor="gst_registered" className="font-medium">
                    GST Registered
                  </Label>
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
              setSettings((prev) => ({ ...prev, cleaning_services: services }))
            }
          />

          {/* Geofence Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Geofence Settings
              </CardTitle>
              <CardDescription>Set the default geofence radius for properties</CardDescription>
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
                  <span className="text-sm text-muted-foreground">Range: 10 - 1000 meters</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This value will be used as the default radius when creating new properties. Staff
                  must be within this radius to check-in/check-out.
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
              <CardDescription>Configure business hours and working days</CardDescription>
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day.value}
                      className="flex cursor-pointer items-center space-x-2 rounded-lg border border-border p-3 hover:bg-muted/50"
                      onClick={() => toggleWorkingDay(day.value)}
                    >
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={settings.working_days.includes(day.value)}
                        onCheckedChange={() => toggleWorkingDay(day.value)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="cursor-pointer font-normal">
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
            <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg">
              {saveMutation.isPending ? (
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
