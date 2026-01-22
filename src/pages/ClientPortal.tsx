import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  User,
  Building2,
  Eye,
  Lock,
  AlertCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
}

interface PortalJob {
  id: string;
  client_id: string;
  client_name: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  staff_name: string | null;
  property_name: string | null;
  photos: JobPhoto[] | null;
}

export default function ClientPortal() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  
  const [token, setToken] = useState(tokenFromUrl || "");
  const [inputToken, setInputToken] = useState("");
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PortalJob | null>(null);

  useEffect(() => {
    if (tokenFromUrl) {
      fetchClientData(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const fetchClientData = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.rpc('get_client_portal_data', {
        p_token: accessToken
      });

      if (fetchError) {
        throw fetchError;
      }

      if (!data || data.length === 0) {
        setError("Código de acceso inválido o sin trabajos registrados");
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Parse the data properly - photos comes as jsonb
      const typedJobs: PortalJob[] = data.map((job: any) => ({
        ...job,
        photos: Array.isArray(job.photos) ? job.photos : []
      }));
      setJobs(typedJobs);
      setClientName(typedJobs[0]?.client_name || "Cliente");
      setToken(accessToken);
      setAuthenticated(true);
    } catch (err: any) {
      setError("Error al acceder al portal. Verifica tu código de acceso.");
      setAuthenticated(false);
    }
    
    setLoading(false);
  };

  const handleSubmitToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      fetchClientData(inputToken.trim());
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { 
          label: "Completado", 
          variant: "default" as const,
          className: "bg-success/10 text-success border-success/30"
        };
      case "in_progress":
        return { 
          label: "En Progreso", 
          variant: "secondary" as const,
          className: "bg-warning/10 text-warning border-warning/30"
        };
      default:
        return { 
          label: "Programado", 
          variant: "outline" as const,
          className: "bg-muted text-muted-foreground"
        };
    }
  };

  const scheduledJobs = jobs.filter(j => j.status === "pending");
  const inProgressJobs = jobs.filter(j => j.status === "in_progress");
  const completedJobs = jobs.filter(j => j.status === "completed");

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
              <p className="text-sm text-muted-foreground">Portal de Clientes</p>
            </div>
          </div>
        </header>

        {/* Login Form */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Acceso al Portal</CardTitle>
              <CardDescription>
                Ingresa tu código de acceso único para ver tus trabajos de limpieza
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitToken} className="space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Ingresa tu código de acceso"
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    className="pr-10 h-12 text-center font-mono text-lg tracking-wider"
                    disabled={loading}
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={loading || !inputToken.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Acceder al Portal
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-6">
                ¿No tienes un código? Contacta a tu proveedor de servicios de limpieza.
              </p>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-4">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            Powered by CleanFlow
          </div>
        </footer>
      </div>
    );
  }

  // Portal Dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
              <p className="text-sm text-muted-foreground">Portal de Clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Building2 className="h-3 w-3 mr-1" />
              {clientName}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setAuthenticated(false);
                setToken("");
                setJobs([]);
                setInputToken("");
              }}
            >
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Bienvenido, {clientName}
            </h2>
            <p className="text-muted-foreground">
              Aquí puedes ver el historial de servicios de limpieza realizados y programados.
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Programados</p>
                  <p className="text-2xl font-bold">{scheduledJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                  <p className="text-2xl font-bold">{inProgressJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completados</p>
                  <p className="text-2xl font-bold">{completedJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="all">Todos ({jobs.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Programados</TabsTrigger>
            <TabsTrigger value="progress">En Progreso</TabsTrigger>
            <TabsTrigger value="completed">Completados</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <JobList 
              jobs={jobs} 
              onViewJob={setSelectedJob} 
              getStatusConfig={getStatusConfig}
            />
          </TabsContent>
          <TabsContent value="scheduled">
            <JobList 
              jobs={scheduledJobs} 
              onViewJob={setSelectedJob}
              getStatusConfig={getStatusConfig}
              emptyMessage="No hay trabajos programados"
            />
          </TabsContent>
          <TabsContent value="progress">
            <JobList 
              jobs={inProgressJobs} 
              onViewJob={setSelectedJob}
              getStatusConfig={getStatusConfig}
              emptyMessage="No hay trabajos en progreso"
            />
          </TabsContent>
          <TabsContent value="completed">
            <JobList 
              jobs={completedJobs} 
              onViewJob={setSelectedJob}
              getStatusConfig={getStatusConfig}
              emptyMessage="No hay trabajos completados"
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>Detalle del Servicio</span>
                  <Badge className={getStatusConfig(selectedJob.status).className}>
                    {getStatusConfig(selectedJob.status).label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {format(parseISO(selectedJob.scheduled_date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Hora Programada</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {selectedJob.scheduled_time}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selectedJob.location}
                  </p>
                  {selectedJob.property_name && (
                    <p className="text-sm text-muted-foreground ml-6">
                      Propiedad: {selectedJob.property_name}
                    </p>
                  )}
                </div>

                {/* Staff */}
                {selectedJob.staff_name && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Personal Asignado</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {selectedJob.staff_name}
                    </p>
                  </div>
                )}

                {/* Time Details for completed jobs */}
                {selectedJob.status === "completed" && selectedJob.start_time && selectedJob.end_time && (
                  <Card className="bg-success/5 border-success/20">
                    <CardContent className="py-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Inicio</p>
                          <p className="font-semibold text-success">
                            {format(new Date(selectedJob.start_time), "HH:mm")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fin</p>
                          <p className="font-semibold text-success">
                            {format(new Date(selectedJob.end_time), "HH:mm")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Duración</p>
                          <p className="font-semibold text-success">
                            {calculateDuration(selectedJob.start_time, selectedJob.end_time)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Photos */}
                {selectedJob.photos && selectedJob.photos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Fotos del Servicio ({selectedJob.photos.length})
                    </h4>
                    
                    {/* Before Photos */}
                    {selectedJob.photos.filter(p => p.photo_type === 'before').length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Antes</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedJob.photos
                            .filter(p => p.photo_type === 'before')
                            .map((photo) => (
                              <a
                                key={photo.id}
                                href={photo.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={photo.photo_url}
                                  alt="Antes"
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* After Photos */}
                    {selectedJob.photos.filter(p => p.photo_type === 'after').length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Después</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedJob.photos
                            .filter(p => p.photo_type === 'after')
                            .map((photo) => (
                              <a
                                key={photo.id}
                                href={photo.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={photo.photo_url}
                                  alt="Después"
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No photos message */}
                {(!selectedJob.photos || selectedJob.photos.length === 0) && selectedJob.status === "completed" && (
                  <div className="text-center py-6 bg-muted/50 rounded-lg">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay fotos disponibles para este servicio</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Job List Component
interface JobListProps {
  jobs: PortalJob[];
  onViewJob: (job: PortalJob) => void;
  getStatusConfig: (status: string) => { label: string; variant: "default" | "secondary" | "outline"; className: string };
  emptyMessage?: string;
}

function JobList({ jobs, onViewJob, getStatusConfig, emptyMessage = "No hay trabajos" }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const statusConfig = getStatusConfig(job.status);
        const photoCount = job.photos?.length || 0;
        
        return (
          <Card 
            key={job.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewJob(job)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={statusConfig.className}>
                      {statusConfig.label}
                    </Badge>
                    {photoCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {photoCount} fotos
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(parseISO(job.scheduled_date), "d MMM yyyy", { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {job.scheduled_time}
                    </span>
                  </div>
                  
                  <p className="text-foreground mt-1 truncate flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    {job.location}
                  </p>
                </div>
                
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
