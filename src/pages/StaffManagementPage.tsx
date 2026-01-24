import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { InviteStaffDialog } from "@/components/staff/InviteStaffDialog";
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
  Award,
  Search,
  Filter,
  UserCheck,
  UserX,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2
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
  { short: "Dom", full: "Domingo" },
  { short: "Lun", full: "Lunes" },
  { short: "Mar", full: "Martes" },
  { short: "Mié", full: "Miércoles" },
  { short: "Jue", full: "Jueves" },
  { short: "Vie", full: "Viernes" },
  { short: "Sáb", full: "Sábado" }
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
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StaffProfile>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

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

  // Filter staff list
  const filteredStaffList = staffList?.filter(staff => {
    const matchesSearch = staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && staff.is_active) ||
                          (statusFilter === "inactive" && !staff.is_active);
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalStaff = staffList?.length || 0;
  const activeStaff = staffList?.filter(s => s.is_active).length || 0;
  const avgRating = metricsData 
    ? Object.values(metricsData).filter(m => m.avg_quality_score).reduce((acc, m) => acc + (m.avg_quality_score || 0), 0) / 
      (Object.values(metricsData).filter(m => m.avg_quality_score).length || 1)
    : 0;
  const totalJobsCompleted = metricsData 
    ? Object.values(metricsData).reduce((acc, m) => acc + m.jobs_completed, 0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">Gestión de Empleados</h1>
                <p className="text-xs text-muted-foreground">Administra tu equipo de trabajo</p>
              </div>
              <h1 className="sm:hidden text-lg font-bold">Empleados</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsInviteDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Agregar Empleado</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Empleados</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalStaff}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10 shrink-0">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Activos</p>
                  <p className="text-xl sm:text-2xl font-bold">{activeStaff}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Trabajos</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalJobsCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/10 shrink-0">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Calif. Promedio</p>
                  <p className="text-xl sm:text-2xl font-bold">{avgRating ? avgRating.toFixed(1) : "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={statusFilter === "all" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="flex-1 sm:flex-none"
                >
                  Todos
                </Button>
                <Button 
                  variant={statusFilter === "active" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                  className="flex-1 sm:flex-none gap-1"
                >
                  <UserCheck className="h-3 w-3" />
                  Activos
                </Button>
                <Button 
                  variant={statusFilter === "inactive" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                  className="flex-1 sm:flex-none gap-1"
                >
                  <UserX className="h-3 w-3" />
                  Inactivos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Miembros del Equipo</CardTitle>
                <CardDescription>
                  {filteredStaffList?.length || 0} empleado{filteredStaffList?.length !== 1 ? 's' : ''} encontrado{filteredStaffList?.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Cargando empleados...</div>
              </div>
            ) : filteredStaffList?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {staffList?.length === 0 ? "No hay empleados registrados" : "No se encontraron resultados"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {staffList?.length === 0 
                    ? "Agrega tu primer empleado para comenzar a gestionar tu equipo"
                    : "Intenta con otros términos de búsqueda o filtros"}
                </p>
                {staffList?.length === 0 && (
                  <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Primer Empleado
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStaffList?.map((staff) => {
                  const metrics = getMetrics(staff.user_id);
                  return (
                    <div
                      key={staff.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all hover:shadow-sm"
                      onClick={() => openStaffDetails(staff)}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-0">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {staff.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium truncate">{staff.full_name}</h3>
                            <Badge 
                              variant={staff.is_active ? "default" : "secondary"}
                              className="shrink-0"
                            >
                              {staff.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{staff.email}</span>
                            </span>
                            {staff.phone && (
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{staff.phone}</span>
                              </span>
                            )}
                          </div>
                          {/* Skills badges - mobile */}
                          {staff.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 sm:hidden">
                              {staff.skills.slice(0, 2).map(skill => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {staff.skills.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{staff.skills.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pl-13 sm:pl-0">
                        <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground">Trabajos</p>
                            <p className="font-semibold">{metrics.jobs_completed}</p>
                          </div>
                          <div className="text-center hidden sm:block">
                            <p className="text-muted-foreground">Horas</p>
                            <p className="font-semibold">{metrics.total_hours.toFixed(0)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Calif.</p>
                            <p className="font-semibold flex items-center justify-center gap-1">
                              {metrics.avg_quality_score ? (
                                <>
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  {metrics.avg_quality_score.toFixed(1)}
                                </>
                              ) : "-"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStaffDetails(staff);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
        <SheetContent className="w-full sm:max-w-xl p-0">
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                  {selectedStaff?.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">{selectedStaff?.full_name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-3 w-3" />
                  {selectedStaff?.email}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-6">
              {selectedStaff && (
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="profile" className="text-xs sm:text-sm">
                      <User className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Perfil</span>
                    </TabsTrigger>
                    <TabsTrigger value="availability" className="text-xs sm:text-sm">
                      <Clock className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Horario</span>
                    </TabsTrigger>
                    <TabsTrigger value="metrics" className="text-xs sm:text-sm">
                      <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Métricas</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Profile Tab */}
                  <TabsContent value="profile" className="space-y-6 mt-0">
                    {/* Status Toggle */}
                    <Card className={editForm.is_active ? "border-green-500/50 bg-green-500/5" : "border-orange-500/50 bg-orange-500/5"}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {editForm.is_active ? (
                              <UserCheck className="h-5 w-5 text-green-500" />
                            ) : (
                              <UserX className="h-5 w-5 text-orange-500" />
                            )}
                            <div>
                              <p className="font-medium">Estado del Empleado</p>
                              <p className="text-sm text-muted-foreground">
                                {editForm.is_active ? "Puede recibir trabajos" : "No recibe trabajos"}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={editForm.is_active}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Información Básica
                      </h4>
                      
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
                          placeholder="+52 123 456 7890"
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
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              className="pl-7"
                              value={editForm.hourly_rate || ""}
                              onChange={(e) => setEditForm({ ...editForm, hourly_rate: parseFloat(e.target.value) || null })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Emergency Contact */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Contacto de Emergencia
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre</Label>
                          <Input
                            value={editForm.emergency_contact_name || ""}
                            onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                            placeholder="Nombre del contacto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            value={editForm.emergency_contact_phone || ""}
                            onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                            placeholder="Número de teléfono"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Skills */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Habilidades
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_OPTIONS.map((skill) => (
                          <Badge
                            key={skill}
                            variant={editForm.skills?.includes(skill) ? "default" : "outline"}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleSkill(skill)}
                          >
                            {editForm.skills?.includes(skill) && <CheckCircle className="h-3 w-3 mr-1" />}
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Certifications */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Certificaciones
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {CERTIFICATION_OPTIONS.map((cert) => (
                          <Badge
                            key={cert}
                            variant={editForm.certifications?.includes(cert) ? "default" : "outline"}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleCertification(cert)}
                          >
                            {editForm.certifications?.includes(cert) && <CheckCircle className="h-3 w-3 mr-1" />}
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveProfile} 
                      className="w-full mt-6" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </TabsContent>

                  {/* Availability Tab */}
                  <TabsContent value="availability" className="space-y-4 mt-0">
                    <p className="text-sm text-muted-foreground">
                      Configura el horario semanal de disponibilidad para este empleado.
                    </p>
                    
                    <div className="space-y-3">
                      {DAYS_OF_WEEK.map((day, index) => {
                        const avail = getAvailabilityForDay(index);
                        const isAvailable = avail?.is_available ?? (index >= 1 && index <= 5);
                        
                        return (
                          <Card key={day.full} className={!isAvailable ? "opacity-60" : ""}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <Switch
                                    checked={isAvailable}
                                    onCheckedChange={(checked) => {
                                      updateAvailabilityMutation.mutate({
                                        day_of_week: index,
                                        start_time: avail?.start_time || "08:00",
                                        end_time: avail?.end_time || "17:00",
                                        is_available: checked
                                      });
                                    }}
                                  />
                                  <div>
                                    <span className="font-medium">{day.full}</span>
                                    {!isAvailable && (
                                      <p className="text-xs text-muted-foreground">No disponible</p>
                                    )}
                                  </div>
                                </div>
                                
                                {isAvailable && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="time"
                                      className="w-24 text-sm"
                                      value={avail?.start_time || "08:00"}
                                      onChange={(e) => {
                                        updateAvailabilityMutation.mutate({
                                          day_of_week: index,
                                          start_time: e.target.value,
                                          end_time: avail?.end_time || "17:00",
                                          is_available: true
                                        });
                                      }}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <Input
                                      type="time"
                                      className="w-24 text-sm"
                                      value={avail?.end_time || "17:00"}
                                      onChange={(e) => {
                                        updateAvailabilityMutation.mutate({
                                          day_of_week: index,
                                          start_time: avail?.start_time || "08:00",
                                          end_time: e.target.value,
                                          is_available: true
                                        });
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Metrics Tab */}
                  <TabsContent value="metrics" className="space-y-4 mt-0">
                    {(() => {
                      const metrics = getMetrics(selectedStaff.user_id);
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <Card>
                              <CardContent className="p-4 text-center">
                                <Briefcase className="h-8 w-8 mx-auto text-primary mb-2" />
                                <p className="text-2xl font-bold">{metrics.jobs_completed}</p>
                                <p className="text-sm text-muted-foreground">Trabajos Completados</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4 text-center">
                                <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                                <p className="text-2xl font-bold">{metrics.total_hours.toFixed(1)}</p>
                                <p className="text-sm text-muted-foreground">Horas Trabajadas</p>
                              </CardContent>
                            </Card>
                          </div>

                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-yellow-500/10">
                                  <Star className="h-6 w-6 text-yellow-500" />
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Calificación Promedio</p>
                                  <p className="text-2xl font-bold">
                                    {metrics.avg_quality_score 
                                      ? `${metrics.avg_quality_score.toFixed(1)} / 5.0`
                                      : "Sin calificaciones aún"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {selectedStaff.hire_date && (
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-green-500/10">
                                    <Calendar className="h-6 w-6 text-green-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Antigüedad</p>
                                    <p className="text-2xl font-bold">
                                      {(() => {
                                        const months = Math.floor(
                                          (new Date().getTime() - new Date(selectedStaff.hire_date).getTime()) / 
                                          (1000 * 60 * 60 * 24 * 30)
                                        );
                                        if (months < 1) return "Menos de 1 mes";
                                        if (months < 12) return `${months} mes${months > 1 ? 'es' : ''}`;
                                        const years = Math.floor(months / 12);
                                        const remainingMonths = months % 12;
                                        return `${years} año${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}` : ''}`;
                                      })()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Since {new Date(selectedStaff.hire_date).toLocaleDateString('en-AU', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {selectedStaff.hourly_rate && (
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-primary/10">
                                    <TrendingUp className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Ingresos Estimados</p>
                                    <p className="text-2xl font-bold">
                                      ${(metrics.total_hours * selectedStaff.hourly_rate).toLocaleString('en-AU', { 
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2 
                                      })}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Basado en {metrics.total_hours.toFixed(1)} hrs × ${selectedStaff.hourly_rate}/hr
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
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Invite Staff Dialog */}
      <InviteStaffDialog 
        open={isInviteDialogOpen} 
        onOpenChange={setIsInviteDialogOpen} 
      />
    </div>
  );
}

// Missing User icon from TabsList
function User(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
