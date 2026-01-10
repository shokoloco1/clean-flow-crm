import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  Star,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Award
} from "lucide-react";

interface StaffProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  skills: string[];
  certifications: string[];
  hire_date: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
}

interface StaffAvailability {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface StaffMetrics {
  user_id: string;
  jobs_completed: number;
  total_hours: number;
  avg_quality_score: number | null;
}

const DAYS_OF_WEEK = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

const SKILL_OPTIONS = [
  "Limpieza Residencial",
  "Limpieza Comercial",
  "Limpieza Profunda",
  "Limpieza de Ventanas",
  "Limpieza de Alfombras",
  "Limpieza de Cocina Industrial",
  "Manejo de Químicos",
  "Limpieza Post-Construcción"
];

const CERTIFICATION_OPTIONS = [
  "Manejo de Químicos Peligrosos",
  "Primeros Auxilios",
  "Seguridad Ocupacional",
  "Limpieza Hospitalaria",
  "Green Cleaning"
];

export default function StaffManagementPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StaffProfile>>({});
  const [availability, setAvailability] = useState<StaffAvailability[]>([]);

  // Fetch all staff members (profiles with staff role)
  const { data: staffList, isLoading } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      // Get all staff user_ids from user_roles
      const { data: staffRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");

      if (rolesError) throw rolesError;

      const staffUserIds = staffRoles.map(r => r.user_id);

      if (staffUserIds.length === 0) return [];

      // Get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", staffUserIds);

      if (profilesError) throw profilesError;

      return profiles.map(p => ({
        ...p,
        skills: Array.isArray(p.skills) ? p.skills : [],
        certifications: Array.isArray(p.certifications) ? p.certifications : [],
        is_active: p.is_active ?? true
      })) as StaffProfile[];
    }
  });

  // Fetch metrics for all staff
  const { data: metricsData } = useQuery({
    queryKey: ["staff-metrics"],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select("assigned_staff_id, status, start_time, end_time, quality_score")
        .eq("status", "completed");

      if (error) throw error;

      // Calculate metrics per staff member
      const metricsMap: Record<string, StaffMetrics> = {};

      jobs.forEach(job => {
        if (!job.assigned_staff_id) return;

        if (!metricsMap[job.assigned_staff_id]) {
          metricsMap[job.assigned_staff_id] = {
            user_id: job.assigned_staff_id,
            jobs_completed: 0,
            total_hours: 0,
            avg_quality_score: null
          };
        }

        metricsMap[job.assigned_staff_id].jobs_completed++;

        if (job.start_time && job.end_time) {
          const start = new Date(job.start_time);
          const end = new Date(job.end_time);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          metricsMap[job.assigned_staff_id].total_hours += hours;
        }

        if (job.quality_score) {
          const current = metricsMap[job.assigned_staff_id];
          const totalScores = (current.avg_quality_score || 0) * (current.jobs_completed - 1) + job.quality_score;
          current.avg_quality_score = totalScores / current.jobs_completed;
        }
      });

      return metricsMap;
    }
  });

  // Fetch availability for selected staff
  const { data: staffAvailability } = useQuery({
    queryKey: ["staff-availability", selectedStaff?.user_id],
    queryFn: async () => {
      if (!selectedStaff) return [];

      const { data, error } = await supabase
        .from("staff_availability")
        .select("*")
        .eq("user_id", selectedStaff.user_id)
        .order("day_of_week");

      if (error) throw error;
      return data as StaffAvailability[];
    },
    enabled: !!selectedStaff
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<StaffProfile>) => {
      if (!selectedStaff) throw new Error("No staff selected");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: updates.full_name,
          phone: updates.phone,
          emergency_contact_name: updates.emergency_contact_name,
          emergency_contact_phone: updates.emergency_contact_phone,
          skills: updates.skills,
          certifications: updates.certifications,
          hire_date: updates.hire_date,
          hourly_rate: updates.hourly_rate,
          is_active: updates.is_active
        })
        .eq("id", selectedStaff.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Perfil actualizado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
    },
    onError: (error) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
    }
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (avail: Partial<StaffAvailability>) => {
      if (!selectedStaff) throw new Error("No staff selected");

      const { error } = await supabase
        .from("staff_availability")
        .upsert({
          user_id: selectedStaff.user_id,
          day_of_week: avail.day_of_week,
          start_time: avail.start_time,
          end_time: avail.end_time,
          is_available: avail.is_available
        }, {
          onConflict: "user_id,day_of_week"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-availability", selectedStaff?.user_id] });
    }
  });

  const openStaffDetails = (staff: StaffProfile) => {
    setSelectedStaff(staff);
    setEditForm(staff);
    setIsSheetOpen(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editForm);
  };

  const toggleSkill = (skill: string) => {
    const currentSkills = editForm.skills || [];
    if (currentSkills.includes(skill)) {
      setEditForm({ ...editForm, skills: currentSkills.filter(s => s !== skill) });
    } else {
      setEditForm({ ...editForm, skills: [...currentSkills, skill] });
    }
  };

  const toggleCertification = (cert: string) => {
    const currentCerts = editForm.certifications || [];
    if (currentCerts.includes(cert)) {
      setEditForm({ ...editForm, certifications: currentCerts.filter(c => c !== cert) });
    } else {
      setEditForm({ ...editForm, certifications: [...currentCerts, cert] });
    }
  };

  const getMetrics = (userId: string): StaffMetrics => {
    return metricsData?.[userId] || { user_id: userId, jobs_completed: 0, total_hours: 0, avg_quality_score: null };
  };

  const getAvailabilityForDay = (dayIndex: number): StaffAvailability | undefined => {
    return staffAvailability?.find(a => a.day_of_week === dayIndex);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Gestión de Staff</h1>
            </div>
          </div>
          <Button onClick={signOut} variant="outline">
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">{staffList?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold">{staffList?.filter(s => s.is_active).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Briefcase className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trabajos Hoy</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/10">
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calif. Promedio</p>
                  <p className="text-2xl font-bold">
                    {metricsData ? 
                      (Object.values(metricsData)
                        .filter(m => m.avg_quality_score)
                        .reduce((acc, m) => acc + (m.avg_quality_score || 0), 0) / 
                        Object.values(metricsData).filter(m => m.avg_quality_score).length || 0
                      ).toFixed(1) 
                      : "-"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Miembros del Equipo</span>
              <Button size="sm" onClick={() => navigate("/auth")}>
                <Plus className="h-4 w-4 mr-2" />
                Invitar Staff
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Cargando...</p>
            ) : staffList?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No hay miembros del equipo registrados</p>
            ) : (
              <div className="grid gap-4">
                {staffList?.map((staff) => {
                  const metrics = getMetrics(staff.user_id);
                  return (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => openStaffDetails(staff)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {staff.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{staff.full_name}</h3>
                            <Badge variant={staff.is_active ? "default" : "secondary"}>
                              {staff.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {staff.email}
                            </span>
                            {staff.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {staff.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Trabajos</p>
                          <p className="font-semibold">{metrics.jobs_completed}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Horas</p>
                          <p className="font-semibold">{metrics.total_hours.toFixed(1)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Calificación</p>
                          <p className="font-semibold flex items-center gap-1">
                            {metrics.avg_quality_score ? (
                              <>
                                <Star className="h-3 w-3 text-yellow-500" />
                                {metrics.avg_quality_score.toFixed(1)}
                              </>
                            ) : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Staff Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Perfil de {selectedStaff?.full_name}</SheetTitle>
          </SheetHeader>

          {selectedStaff && (
            <Tabs defaultValue="profile" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Estado</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editForm.is_active}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                    />
                    <span className="text-sm">{editForm.is_active ? "Activo" : "Inactivo"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input
                    value={editForm.full_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Contratación</Label>
                    <Input
                      type="date"
                      value={editForm.hire_date || ""}
                      onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarifa por Hora</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.hourly_rate || ""}
                      onChange={(e) => setEditForm({ ...editForm, hourly_rate: parseFloat(e.target.value) || null })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    Contacto de Emergencia
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={editForm.emergency_contact_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={editForm.emergency_contact_phone || ""}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4" />
                    Habilidades
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map((skill) => (
                      <Badge
                        key={skill}
                        variant={editForm.skills?.includes(skill) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Award className="h-4 w-4" />
                    Certificaciones
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATION_OPTIONS.map((cert) => (
                      <Badge
                        key={cert}
                        variant={editForm.certifications?.includes(cert) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCertification(cert)}
                      >
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveProfile} className="w-full" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="space-y-4 mt-4">
                {DAYS_OF_WEEK.map((day, index) => {
                  const avail = getAvailabilityForDay(index);
                  return (
                    <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={avail?.is_available ?? true}
                          onCheckedChange={(checked) => {
                            updateAvailabilityMutation.mutate({
                              day_of_week: index,
                              start_time: avail?.start_time || "08:00",
                              end_time: avail?.end_time || "17:00",
                              is_available: checked
                            });
                          }}
                        />
                        <span className="font-medium w-24">{day}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          className="w-28"
                          value={avail?.start_time || "08:00"}
                          disabled={!avail?.is_available && avail !== undefined}
                          onChange={(e) => {
                            updateAvailabilityMutation.mutate({
                              day_of_week: index,
                              start_time: e.target.value,
                              end_time: avail?.end_time || "17:00",
                              is_available: avail?.is_available ?? true
                            });
                          }}
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          className="w-28"
                          value={avail?.end_time || "17:00"}
                          disabled={!avail?.is_available && avail !== undefined}
                          onChange={(e) => {
                            updateAvailabilityMutation.mutate({
                              day_of_week: index,
                              start_time: avail?.start_time || "08:00",
                              end_time: e.target.value,
                              is_available: avail?.is_available ?? true
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="space-y-4 mt-4">
                {(() => {
                  const metrics = getMetrics(selectedStaff.user_id);
                  return (
                    <>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <Briefcase className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Trabajos Completados</p>
                              <p className="text-2xl font-bold">{metrics.jobs_completed}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-500/10">
                              <Clock className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Horas Trabajadas</p>
                              <p className="text-2xl font-bold">{metrics.total_hours.toFixed(1)} hrs</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-yellow-500/10">
                              <Star className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Calificación Promedio</p>
                              <p className="text-2xl font-bold">
                                {metrics.avg_quality_score ? metrics.avg_quality_score.toFixed(1) : "Sin calificaciones"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {selectedStaff.hire_date && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-green-500/10">
                                <Calendar className="h-5 w-5 text-green-500" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Antigüedad</p>
                                <p className="text-2xl font-bold">
                                  {Math.floor((new Date().getTime() - new Date(selectedStaff.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
