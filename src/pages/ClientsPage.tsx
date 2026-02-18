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

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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
    <div className="min-h-screen bg-background pb-24">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex items-center justify-between px-3 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-foreground">Clients</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Desktop Header */}
        <div className="container mx-auto hidden items-center justify-between px-4 py-4 md:flex">
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

      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8">
        {/* Stats Cards — horizontal scroll on mobile, grid on desktop */}
        <div className="mb-4 flex gap-3 overflow-x-auto pb-1 md:mb-8 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0">
          {[
            { label: "Total Clients", value: globalStats.totalClients, icon: Users, color: "bg-primary/10", iconColor: "text-primary" },
            { label: "With Contact", value: globalStats.activeClients, icon: CheckCircle2, color: "bg-secondary", iconColor: "text-secondary-foreground" },
            { label: "With ABN", value: globalStats.withABN, icon: FileText, color: "bg-primary/10", iconColor: "text-primary" },
          ].map(({ label, value, icon: Icon, color, iconColor }) => (
            <Card key={label} className="min-w-[140px] flex-shrink-0 md:min-w-0">
              <CardContent className="p-3 md:pt-6">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-12 md:w-12 ${color}`}>
                    <Icon className={`h-4 w-4 md:h-6 md:w-6 ${iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground md:text-sm">{label}</p>
                    <p className="text-xl font-bold md:text-2xl">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search bar */}
        <div className="mb-4 flex gap-3 md:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Desktop only: inline New Client button */}
          <Button className="hidden md:flex" onClick={() => clientForm.setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </div>

        {/* Clients List */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-xl">Clients</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {totalCount} client{totalCount !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 md:px-6">
            {isLoading ? (
              <div className="space-y-3 p-2">
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
              <div className="divide-y divide-border">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex cursor-pointer items-center justify-between px-2 py-3 transition-colors hover:bg-muted/50 md:rounded-lg md:p-4"
                    onClick={() => setSelectedClient(client)}
                  >
                    {/* Avatar + info */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{client.name}</p>
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground md:flex-row md:gap-3 md:text-sm">
                          {client.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop: action buttons */}
                    <div
                      className="ml-2 hidden shrink-0 items-center gap-1 md:flex"
                      onClick={(e) => e.stopPropagation()}
                    >
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

                    {/* Mobile: tap hint icon */}
                    <div className="ml-2 shrink-0 text-muted-foreground md:hidden">
                      <Eye className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <PaginatedControls page={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Dialogs */}
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

        <ClientDeleteDialog
          isOpen={clientDelete.isDeleteDialogOpen}
          onOpenChange={clientDelete.handleDialogOpenChange}
          clientToDelete={clientDelete.clientToDelete}
          clientJobCount={clientDelete.clientJobCount}
          isCheckingJobs={clientDelete.isCheckingJobs}
          onConfirm={clientDelete.confirmDelete}
          isDeleting={clientDelete.isDeleting}
        />

        <ClientDetailSheet
          client={selectedClient}
          isOpen={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
        />
      </main>

      {/* Mobile FAB — New Client */}
      <Button
        onClick={() => clientForm.setIsCreateOpen(true)}
        size="lg"
        className="fixed bottom-6 right-4 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
