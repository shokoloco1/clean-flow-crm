import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  LogOut, Sparkles, Plus, Search, Users, Building2, 
  Mail, Phone, MapPin, FileText, Edit, Trash2, Eye,
  Briefcase, CheckCircle2, Clock, TrendingUp, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  access_codes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientJob {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  profiles: { full_name: string } | null;
}

interface ClientStats {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  completionRate: number;
}

const emptyClient: Omit<Client, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  email: '',
  phone: '',
  address: '',
  access_codes: '',
  notes: ''
};

export default function ClientsPage() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [formData, setFormData] = useState(emptyClient);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Fetch clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Client[];
    }
  });

  // Fetch client jobs
  const { data: clientJobs = [] } = useQuery({
    queryKey: ['client-jobs', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, location, scheduled_date, scheduled_time, status, start_time, end_time,
          assigned_staff_id
        `)
        .eq('client_id', selectedClient.id)
        .order('scheduled_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      
      // Fetch staff names separately
      const staffIds = [...new Set(data.map(j => j.assigned_staff_id).filter(Boolean))];
      let staffMap: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', staffIds);
        staffMap = Object.fromEntries((staffData || []).map(s => [s.user_id, s.full_name]));
      }
      
      return data.map(job => ({
        ...job,
        profiles: job.assigned_staff_id ? { full_name: staffMap[job.assigned_staff_id] || 'Sin asignar' } : null
      })) as ClientJob[];
    },
    enabled: !!selectedClient
  });

  // Calculate client stats
  const clientStats: ClientStats = clientJobs.reduce((acc, job) => {
    acc.totalJobs++;
    if (job.status === 'completed') acc.completedJobs++;
    else if (job.status === 'pending') acc.pendingJobs++;
    else if (job.status === 'in_progress') acc.inProgressJobs++;
    return acc;
  }, { totalJobs: 0, completedJobs: 0, pendingJobs: 0, inProgressJobs: 0, completionRate: 0 });
  
  clientStats.completionRate = clientStats.totalJobs > 0 
    ? Math.round((clientStats.completedJobs / clientStats.totalJobs) * 100) 
    : 0;

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyClient) => {
      const { error } = await supabase.from('clients').insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        access_codes: data.access_codes || null,
        notes: data.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente creado exitosamente');
      setIsCreateOpen(false);
      setFormData(emptyClient);
    },
    onError: () => toast.error('Error al crear cliente')
  });

  // Update client mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof emptyClient }) => {
      const { error } = await supabase
        .from('clients')
        .update({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          access_codes: data.access_codes || null,
          notes: data.notes || null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente actualizado');
      setEditingClient(null);
      setFormData(emptyClient);
      if (selectedClient && editingClient?.id === selectedClient.id) {
        setSelectedClient(null);
      }
    },
    onError: () => toast.error('Error al actualizar cliente')
  });

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado');
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      if (selectedClient && clientToDelete?.id === selectedClient.id) {
        setSelectedClient(null);
      }
    },
    onError: () => toast.error('Error al eliminar cliente. Puede tener trabajos asociados.')
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      access_codes: client.access_codes || '',
      notes: client.notes || ''
    });
    setIsCreateOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pendiente" },
      in_progress: { variant: "default", label: "En Progreso" },
      completed: { variant: "outline", label: "Completado" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Global stats
  const globalStats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.email || c.phone).length,
    withAddress: clients.filter(c => c.address).length
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
              <p className="text-sm text-muted-foreground">Gestión de Clientes</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clientes</p>
                  <p className="text-2xl font-bold">{globalStats.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Con Contacto</p>
                  <p className="text-2xl font-bold">{globalStats.activeClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Con Dirección</p>
                  <p className="text-2xl font-bold">{globalStats.withAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingClient(null);
              setFormData(emptyClient);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Actualiza la información del cliente' : 'Agrega un nuevo cliente al sistema'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dirección completa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access_codes">Códigos de Acceso</Label>
                  <Input
                    id="access_codes"
                    value={formData.access_codes || ''}
                    onChange={(e) => setFormData({ ...formData, access_codes: e.target.value })}
                    placeholder="Códigos de entrada, alarmas, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales sobre el cliente"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingClient ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay clientes</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar primer cliente
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setClientToDelete(client);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Cliente</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar a "{clientToDelete?.name}"? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => clientToDelete && deleteMutation.mutate(clientToDelete.id)}
                disabled={deleteMutation.isPending}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Client Detail Sheet */}
        <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedClient && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {selectedClient.name}
                  </SheetTitle>
                  <SheetDescription>
                    Cliente desde {format(new Date(selectedClient.created_at), "MMMM yyyy", { locale: es })}
                  </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="info" className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Información</TabsTrigger>
                    <TabsTrigger value="jobs">Trabajos</TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        {selectedClient.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedClient.email}</span>
                          </div>
                        )}
                        {selectedClient.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedClient.phone}</span>
                          </div>
                        )}
                        {selectedClient.address && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedClient.address}</span>
                          </div>
                        )}
                        {selectedClient.access_codes && (
                          <div className="flex items-start gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm text-muted-foreground">Códigos de Acceso</p>
                              <p>{selectedClient.access_codes}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.notes && (
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-2">Notas</p>
                            <p className="text-sm">{selectedClient.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="jobs" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Historial de Trabajos</CardTitle>
                        <CardDescription>{clientJobs.length} trabajos registrados</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {clientJobs.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No hay trabajos registrados
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientJobs.map((job) => (
                                <TableRow key={job.id}>
                                  <TableCell>
                                    {format(new Date(job.scheduled_date), "dd MMM yyyy", { locale: es })}
                                  </TableCell>
                                  <TableCell className="max-w-[120px] truncate">
                                    {job.location}
                                  </TableCell>
                                  <TableCell>
                                    {job.profiles?.full_name || "Sin asignar"}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="stats" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-2xl font-bold">{clientStats.totalJobs}</p>
                              <p className="text-sm text-muted-foreground">Total Trabajos</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                            <div>
                              <p className="text-2xl font-bold">{clientStats.completedJobs}</p>
                              <p className="text-sm text-muted-foreground">Completados</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-yellow-500" />
                            <div>
                              <p className="text-2xl font-bold">{clientStats.pendingJobs}</p>
                              <p className="text-sm text-muted-foreground">Pendientes</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                            <div>
                              <p className="text-2xl font-bold">{clientStats.completionRate}%</p>
                              <p className="text-sm text-muted-foreground">Tasa Completado</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
