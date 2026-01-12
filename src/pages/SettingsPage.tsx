import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings, Building, MapPin, Clock, Save, Loader2 } from "lucide-react";

interface SystemSettings {
  company_name: string;
  company_logo: string;
  default_geofence_radius: number;
  working_hours: { start: string; end: string };
  working_days: number[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    company_name: "CleanTrack Pro",
    company_logo: "",
    default_geofence_radius: 100,
    working_hours: { start: "08:00", end: "18:00" },
    working_days: [1, 2, 3, 4, 5],
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
          }
        });
        
        setSettings(newSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "company_name", value: settings.company_name },
        { key: "company_logo", value: settings.company_logo },
        { key: "default_geofence_radius", value: settings.default_geofence_radius },
        { key: "working_hours", value: settings.working_hours },
        { key: "working_days", value: settings.working_days },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value: update.value })
          .eq("key", update.key);

        if (error) throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las configuraciones",
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Configuración del Sistema</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>
                Personaliza el nombre y logo de tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nombre de la Empresa</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, company_name: e.target.value }))
                  }
                  placeholder="Nombre de tu empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_logo">URL del Logo</Label>
                <Input
                  id="company_logo"
                  value={settings.company_logo}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, company_logo: e.target.value }))
                  }
                  placeholder="https://ejemplo.com/logo.png"
                />
                {settings.company_logo && (
                  <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
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

          {/* Geofence Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Configuración de Geofence
              </CardTitle>
              <CardDescription>
                Ajusta el radio de geofence por defecto para las propiedades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="geofence_radius">Radio por Defecto (metros)</Label>
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
                    Rango: 10 - 1000 metros
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Este valor se usará como radio por defecto al crear nuevas propiedades.
                  El personal debe estar dentro de este radio para hacer check-in/check-out.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Horario Laboral
              </CardTitle>
              <CardDescription>
                Configura los horarios y días de trabajo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Hora de Inicio</Label>
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
                  <Label htmlFor="end_time">Hora de Fin</Label>
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
                <Label>Días Laborales</Label>
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
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
