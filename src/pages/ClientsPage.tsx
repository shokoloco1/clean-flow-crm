import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queries/keys";
import { fetchClientsPaginated, type Client } from "@/lib/queries/clients";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries/pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useClientForm } from "@/hooks/useClientForm";
import { useClientDelete } from "@/hooks/useClientDelete";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { ClientDeleteDialog } from "@/components/clients/ClientDeleteDialog";
import { ClientDetailSheet } from "@/components/clients/ClientDetailSheet";
import { PaginatedControls } from "@/components/PaginatedControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PulcrixLogo } from "@/components/PulcrixLogo";

export default function ClientsPage() {
  const { signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
  };

  const clientForm = useClientForm({
    onMutateSuccess: (editedId) => {
      if (editedId && selectedClient?.id === editedId) setSelectedClient(null);
    },
  });

  const clientDelete = useClientDelete({
    onDeleteSuccess: (deletedId) => {
      if (selectedClient?.id === deletedId) setSelectedClient(null);
    },
  });

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
          <Button onClick={() => clientForm.setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
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
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => clientForm.setIsCreateOpen(true)}
                >
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
                        onClick={() => clientForm.openEditDialog(client)}
                        aria-label="Edit client"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => clientDelete.handleDeleteClick(client)}
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

        {/* Form Dialog */}
        <ClientFormDialog
          isOpen={clientForm.isCreateOpen}
          onOpenChange={clientForm.handleDialogOpenChange}
          editingClient={clientForm.editingClient}
          formData={clientForm.formData}
          setFormData={clientForm.setFormData}
          fieldErrors={clientForm.fieldErrors}
          onNameChange={clientForm.handleNameChange}
          onNameBlur={clientForm.handleNameBlur}
          onEmailChange={clientForm.handleEmailChange}
          onPhoneChange={clientForm.handlePhoneChange}
          onABNChange={clientForm.handleABNChange}
          onSubmit={clientForm.handleSubmit}
          isSubmitting={clientForm.isSubmitting}
        />

        {/* Delete Dialog */}
        <ClientDeleteDialog
          isOpen={clientDelete.isDeleteDialogOpen}
          onOpenChange={clientDelete.handleDialogOpenChange}
          clientToDelete={clientDelete.clientToDelete}
          clientJobCount={clientDelete.clientJobCount}
          isCheckingJobs={clientDelete.isCheckingJobs}
          onConfirm={clientDelete.confirmDelete}
          isDeleting={clientDelete.isDeleting}
        />

        {/* Detail Sheet */}
        <ClientDetailSheet
          client={selectedClient}
          isOpen={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
        />
      </main>
    </div>
  );
}
