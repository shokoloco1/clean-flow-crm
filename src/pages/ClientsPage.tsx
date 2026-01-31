import { useState, useCallback } from "react";
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
import { enAU } from "date-fns/locale";
import { 
  LogOut, Sparkles, Plus, Search, Users, Building2, 
  Mail, Phone, MapPin, FileText, Edit, Trash2, Eye,
  Briefcase, CheckCircle2, Clock, TrendingUp, ArrowLeft,
  Copy, ExternalLink, Link as LinkIcon, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  capitalizeWords,
  formatAUPhone,
  formatABN,
  isValidEmail,
  isValidAUPhone,
  isValidABN,
} from "@/lib/validation";
interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  abn: string | null;
  notes: string | null;
  portal_token: string | null;
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

const emptyClient: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'portal_token'> = {
  name: '',
  email: '',
  phone: '',
  abn: '',
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
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'portal_token'>>(emptyClient);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Handle name change with auto-capitalize
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Apply capitalize on blur, not on every keystroke for better UX
    setFormData(prev => ({ ...prev, name: value }));
    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
  }, [fieldErrors.name]);

  const handleNameBlur = useCallback(() => {
    if (formData.name) {
      setFormData(prev => ({ ...prev, name: capitalizeWords(prev.name) }));
    }
  }, [formData.name]);

  // Handle email change with validation
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setFormData(prev => ({ ...prev, email: value }));
    
    if (value && !isValidEmail(value)) {
      setFieldErrors(prev => ({ ...prev, email: 'Invalid email format' }));
    } else {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  }, []);

  // Handle phone change with AU formatting
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAUPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    
    // Only validate if there's significant input
    const digits = formatted.replace(/\D/g, '');
    if (digits.length >= 10 && !isValidAUPhone(formatted)) {
      setFieldErrors(prev => ({ ...prev, phone: 'Invalid AU phone (04XX XXX XXX or +61 X XXXX XXXX)' }));
    } else {
      setFieldErrors(prev => ({ ...prev, phone: '' }));
    }
  }, []);

  // Handle ABN change with formatting and validation
  const handleABNChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatABN(e.target.value);
    setFormData(prev => ({ ...prev, abn: formatted }));
    
    // Only validate when 11 digits entered
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 11 && !isValidABN(formatted)) {
      setFieldErrors(prev => ({ ...prev, abn: 'Invalid ABN (checksum failed)' }));
    } else {
      setFieldErrors(prev => ({ ...prev, abn: '' }));
    }
  }, []);
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
        profiles: job.assigned_staff_id ? { full_name: staffMap[job.assigned_staff_id] || 'Unassigned' } : null
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
        abn: data.abn || null,
        notes: data.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created successfully');
      setIsCreateOpen(false);
      setFormData(emptyClient);
    },
    onError: () => toast.error('Error creating client')
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
          abn: data.abn || null,
          notes: data.notes || null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated');
      setEditingClient(null);
      setFormData(emptyClient);
      if (selectedClient && editingClient?.id === selectedClient.id) {
        setSelectedClient(null);
      }
    },
    onError: () => toast.error('Error updating client')
  });

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      if (selectedClient && clientToDelete?.id === selectedClient.id) {
        setSelectedClient(null);
      }
    },
    onError: () => toast.error('Error deleting client. It may have associated jobs.')
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.abn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    // Reset errors
    setFieldErrors({});
    
    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    const phoneDigits = (formData.phone || '').replace(/\D/g, '');
    if (phoneDigits.length > 0 && phoneDigits.length >= 10 && !isValidAUPhone(formData.phone || '')) {
      errors.phone = 'Invalid Australian phone number';
    }
    
    const abnDigits = (formData.abn || '').replace(/\D/g, '');
    if (abnDigits.length === 11 && !isValidABN(formData.abn || '')) {
      errors.abn = 'Invalid ABN';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the form errors');
      return;
    }

    // Clean data before submit
    const cleanData = {
      ...formData,
      name: capitalizeWords(formData.name.trim()),
      email: formData.email?.trim() || '',
      phone: formData.phone?.trim() || '',
      abn: formData.abn?.trim() || '',
    };
    
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      abn: client.abn || '',
      notes: client.notes || ''
    });
    setIsCreateOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Global stats
  const globalStats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.email || c.phone).length,
    withABN: clients.filter(c => c.abn).length
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
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CleanFlow</h1>
                <p className="text-sm text-muted-foreground">Client Management</p>
              </div>
            </Link>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
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
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">{globalStats.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With Contact</p>
                  <p className="text-2xl font-bold">{globalStats.activeClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With ABN</p>
                  <p className="text-2xl font-bold">{globalStats.withABN}</p>
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
              placeholder="Search clients..."
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
                New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'New Client'}</DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Update client information' : 'Add a new client to the system'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    placeholder="Client name"
                    className={fieldErrors.name ? "border-destructive" : ""}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={handleEmailChange}
                      placeholder="email@example.com"
                      className={fieldErrors.email ? "border-destructive" : ""}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={handlePhoneChange}
                      placeholder="04XX XXX XXX"
                      maxLength={15}
                      className={fieldErrors.phone ? "border-destructive" : ""}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN</Label>
                  <Input
                    id="abn"
                    value={formData.abn || ''}
                    onChange={handleABNChange}
                    placeholder="XX XXX XXX XXX"
                    maxLength={14}
                    className={fieldErrors.abn ? "border-destructive" : ""}
                  />
                  {fieldErrors.abn ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.abn}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Australian Business Number (11 digits)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about the client"
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingClient ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
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
                <p className="text-muted-foreground">No clients found</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add first client
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
              <DialogTitle>Delete Client</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => clientToDelete && deleteMutation.mutate(clientToDelete.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
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
                    Client since {format(new Date(selectedClient.created_at), "MMMM yyyy", { locale: enAU })}
                  </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="info" className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Information</TabsTrigger>
                    <TabsTrigger value="jobs">Jobs</TabsTrigger>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
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
                        {selectedClient.abn && (
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">ABN / ID</p>
                              <span>{selectedClient.abn}</span>
                            </div>
                          </div>
                        )}
                        {selectedClient.notes && (
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-2">Notes</p>
                            <p className="text-sm">{selectedClient.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="jobs" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Job History</CardTitle>
                        <CardDescription>{clientJobs.length} jobs recorded</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {clientJobs.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No jobs recorded
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientJobs.map((job) => (
                                <TableRow key={job.id}>
                                  <TableCell>
                                    {format(new Date(job.scheduled_date), "dd MMM yyyy", { locale: enAU })}
                                  </TableCell>
                                  <TableCell className="max-w-[120px] truncate">
                                    {job.location}
                                  </TableCell>
                                  <TableCell>
                                    {job.profiles?.full_name || "Unassigned"}
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
                              <p className="text-sm text-muted-foreground">Total Jobs</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-2xl font-bold">{clientStats.completedJobs}</p>
                              <p className="text-sm text-muted-foreground">Completed</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="text-2xl font-bold">{clientStats.pendingJobs}</p>
                              <p className="text-sm text-muted-foreground">Pending</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-2xl font-bold">{clientStats.completionRate}%</p>
                              <p className="text-sm text-muted-foreground">Completion Rate</p>
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
