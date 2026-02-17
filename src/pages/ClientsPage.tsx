import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queries/keys";
import { fetchClientsPaginated, type Client } from "@/lib/queries/clients";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries/pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { enAU } from "date-fns/locale";
import {
  LogOut,
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  FileText,
  Edit,
  Trash2,
  Eye,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { PaginatedControls } from "@/components/PaginatedControls";
import {
  capitalizeWords,
  formatAUPhone,
  formatABN,
  isValidEmail,
  isValidAUPhone,
  isValidABN,
} from "@/lib/validation";
import { logger } from "@/lib/logger";

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

const emptyClient: Omit<Client, "id" | "created_at" | "updated_at" | "portal_token"> = {
  name: "",
  email: "",
  phone: "",
  abn: "",
  notes: "",
};

export default function ClientsPage() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientJobCount, setClientJobCount] = useState<number>(0);
  const [isCheckingJobs, setIsCheckingJobs] = useState(false);
  const [formData, setFormData] =
    useState<Omit<Client, "id" | "created_at" | "updated_at" | "portal_token">>(emptyClient);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
  };

  // Handle name change with auto-capitalize
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Apply capitalize on blur, not on every keystroke for better UX
      setFormData((prev) => ({ ...prev, name: value }));
      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
    },
    [fieldErrors.name],
  );

  const handleNameBlur = useCallback(() => {
    if (formData.name) {
      setFormData((prev) => ({ ...prev, name: capitalizeWords(prev.name) }));
    }
  }, [formData.name]);

  // Handle email change with validation
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setFormData((prev) => ({ ...prev, email: value }));

    if (value && !isValidEmail(value)) {
      setFieldErrors((prev) => ({ ...prev, email: "Invalid email format" }));
    } else {
      setFieldErrors((prev) => ({ ...prev, email: "" }));
    }
  }, []);

  // Handle phone change with AU formatting
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAUPhone(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));

    // Only validate if there's significant input
    const digits = formatted.replace(/\D/g, "");
    if (digits.length >= 10 && !isValidAUPhone(formatted)) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: "Invalid AU phone (04XX XXX XXX or +61 X XXXX XXXX)",
      }));
    } else {
      setFieldErrors((prev) => ({ ...prev, phone: "" }));
    }
  }, []);

  // Handle ABN change with formatting and validation
  const handleABNChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatABN(e.target.value);
    setFormData((prev) => ({ ...prev, abn: formatted }));

    // Only validate when 11 digits entered
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 11 && !isValidABN(formatted)) {
      setFieldErrors((prev) => ({ ...prev, abn: "Invalid ABN (checksum failed)" }));
    } else {
      setFieldErrors((prev) => ({ ...prev, abn: "" }));
    }
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch clients with server-side pagination + search
  const { data: result, isLoading } = useQuery({
    queryKey: queryKeys.clients.list({ page, search: debouncedSearch }),
    queryFn: () =>
      fetchClientsPaginated({ page, pageSize: DEFAULT_PAGE_SIZE, search: debouncedSearch }),
  });
  const clients = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / DEFAULT_PAGE_SIZE);

  // Fetch client jobs
  const { data: clientJobs = [] } = useQuery({
    queryKey: ["client-jobs", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          id, location, scheduled_date, scheduled_time, status, start_time, end_time,
          assigned_staff_id
        `,
        )
        .eq("client_id", selectedClient.id)
        .order("scheduled_date", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Fetch staff names separately
      const staffIds = [
        ...new Set(data.map((j) => j.assigned_staff_id).filter((id): id is string => id !== null)),
      ];
      let staffMap: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", staffIds);
        staffMap = Object.fromEntries((staffData || []).map((s) => [s.user_id, s.full_name]));
      }

      return data.map((job) => ({
        ...job,
        profiles: job.assigned_staff_id
          ? { full_name: staffMap[job.assigned_staff_id] || "Unassigned" }
          : null,
      })) as ClientJob[];
    },
    enabled: !!selectedClient,
  });

  // Calculate client stats
  const clientStats: ClientStats = clientJobs.reduce(
    (acc, job) => {
      acc.totalJobs++;
      if (job.status === "completed") acc.completedJobs++;
      else if (job.status === "pending") acc.pendingJobs++;
      else if (job.status === "in_progress") acc.inProgressJobs++;
      return acc;
    },
    { totalJobs: 0, completedJobs: 0, pendingJobs: 0, inProgressJobs: 0, completionRate: 0 },
  );

  clientStats.completionRate =
    clientStats.totalJobs > 0
      ? Math.round((clientStats.completedJobs / clientStats.totalJobs) * 100)
      : 0;

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyClient) => {
      const { error } = await supabase.from("clients").insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        abn: data.abn || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      toast.success("Client created successfully");
      setIsCreateOpen(false);
      setFormData(emptyClient);
    },
    onError: () => toast.error("Error creating client"),
  });

  // Update client mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof emptyClient }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          abn: data.abn || null,
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      toast.success("Client updated");
      setEditingClient(null);
      setFormData(emptyClient);
      if (selectedClient && editingClient?.id === selectedClient.id) {
        setSelectedClient(null);
      }
    },
    onError: () => toast.error("Error updating client"),
  });

  // Check jobs before delete
  const checkClientJobs = async (clientId: string): Promise<number> => {
    const { count, error } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (error) {
      logger.error("Error checking jobs:", error);
      return 0;
    }
    return count || 0;
  };

  // Open delete dialog with job validation
  const handleDeleteClick = async (client: Client) => {
    setClientToDelete(client);
    setIsCheckingJobs(true);
    setIsDeleteDialogOpen(true);

    const jobCount = await checkClientJobs(client.id);
    setClientJobCount(jobCount);
    setIsCheckingJobs(false);
  };

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, update any associated jobs to remove client reference
      if (clientJobCount > 0) {
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ client_id: null })
          .eq("client_id", id);

        if (updateError) {
          logger.error("Error unlinking jobs:", updateError);
          // Continue with deletion anyway - jobs will become orphaned but won't block
        }
      }

      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Client deleted successfully");
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      setClientJobCount(0);
      if (selectedClient && clientToDelete?.id === selectedClient.id) {
        setSelectedClient(null);
      }
    },
    onError: () => toast.error("Error deleting client"),
  });

  const handleSubmit = () => {
    // Reset errors
    setFieldErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = "Invalid email format";
    }

    const phoneDigits = (formData.phone || "").replace(/\D/g, "");
    if (
      phoneDigits.length > 0 &&
      phoneDigits.length >= 10 &&
      !isValidAUPhone(formData.phone || "")
    ) {
      errors.phone = "Invalid Australian phone number";
    }

    const abnDigits = (formData.abn || "").replace(/\D/g, "");
    if (abnDigits.length === 11 && !isValidABN(formData.abn || "")) {
      errors.abn = "Invalid ABN";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the form errors");
      return;
    }

    // Clean data before submit
    const cleanData = {
      ...formData,
      name: capitalizeWords(formData.name.trim()),
      email: formData.email?.trim() || "",
      phone: formData.phone?.trim() || "",
      abn: formData.abn?.trim() || "",
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
      email: client.email || "",
      phone: client.phone || "",
      abn: client.abn || "",
      notes: client.notes || "",
    });
    setIsCreateOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      pending: { variant: "secondary", label: "Pending" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Global stats (from current page — counts are approximate when paginated)
  const globalStats = {
    totalClients: totalCount,
    activeClients: clients.filter((c) => c.email || c.phone).length,
    withABN: clients.filter((c) => c.abn).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon" aria-label="Go back to admin">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <PulcrixLogo />
              <div>
                <h1 className="text-xl font-bold text-foreground">Pulcrix</h1>
                <p className="text-sm text-muted-foreground">Client Management</p>
              </div>
            </Link>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setEditingClient(null);
                setFormData(emptyClient);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "New Client"}</DialogTitle>
                <DialogDescription>
                  {editingClient ? "Update client information" : "Add a new client to the system"}
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
                    <p className="flex items-center gap-1 text-xs text-destructive">
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
                      value={formData.email || ""}
                      onChange={handleEmailChange}
                      placeholder="email@example.com"
                      className={fieldErrors.email ? "border-destructive" : ""}
                    />
                    {fieldErrors.email && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={handlePhoneChange}
                      placeholder="04XX XXX XXX"
                      maxLength={15}
                      className={fieldErrors.phone ? "border-destructive" : ""}
                    />
                    {fieldErrors.phone && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
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
                    value={formData.abn || ""}
                    onChange={handleABNChange}
                    placeholder="XX XXX XXX XXX"
                    maxLength={14}
                    className={fieldErrors.abn ? "border-destructive" : ""}
                  />
                  {fieldErrors.abn ? (
                    <p className="flex items-center gap-1 text-xs text-destructive">
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
                    value={formData.notes || ""}
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
                  {editingClient ? "Update" : "Create"}
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
              {totalCount} client{totalCount !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No clients found</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add first client
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
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
                        aria-label="View client details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(client)}
                        aria-label="Edit client"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(client)}
                        aria-label="Delete client"
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

        {/* Pagination */}
        <PaginatedControls page={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) {
              setClientToDelete(null);
              setClientJobCount(0);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Client</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>

            {isCheckingJobs ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Checking associated jobs...</span>
              </div>
            ) : clientJobCount > 0 ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-warning">Warning: Associated Jobs Found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This client has{" "}
                      <strong>
                        {clientJobCount} job{clientJobCount !== 1 ? "s" : ""}
                      </strong>{" "}
                      associated. Deleting will unlink these jobs from the client (jobs will be
                      preserved but marked as unassigned).
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => clientToDelete && deleteMutation.mutate(clientToDelete.id)}
                disabled={deleteMutation.isPending || isCheckingJobs}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : clientJobCount > 0 ? (
                  "Delete Anyway"
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Client Detail Sheet */}
        <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <SheetContent className="overflow-y-auto sm:max-w-xl">
            {selectedClient && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {selectedClient.name}
                  </SheetTitle>
                  <SheetDescription>
                    Client since{" "}
                    {format(new Date(selectedClient.created_at), "MMMM yyyy", { locale: enAU })}
                  </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="info" className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Information</TabsTrigger>
                    <TabsTrigger value="jobs">Jobs</TabsTrigger>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4 space-y-4">
                    <Card>
                      <CardContent className="space-y-4 pt-6">
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
                          <div className="border-t pt-4">
                            <p className="mb-2 text-sm text-muted-foreground">Notes</p>
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
                          <p className="py-8 text-center text-muted-foreground">No jobs recorded</p>
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
                                    {format(new Date(job.scheduled_date), "dd MMM yyyy", {
                                      locale: enAU,
                                    })}
                                  </TableCell>
                                  <TableCell className="max-w-[120px] truncate">
                                    {job.location}
                                  </TableCell>
                                  <TableCell>{job.profiles?.full_name || "Unassigned"}</TableCell>
                                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="stats" className="mt-4 space-y-4">
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
