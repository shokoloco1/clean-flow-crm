import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { fetchInvoicesPaginated, type Invoice } from "@/lib/queries/invoices";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries/pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PaginatedControls } from "@/components/PaginatedControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  FileText,
  Eye,
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { InvoiceDetailDialog } from "@/components/invoices/InvoiceDetailDialog";
import { AccountingExport } from "@/components/invoices/AccountingExport";
import { InvoiceStatusActions } from "@/components/invoices/InvoiceStatusActions";

const statusColors: Record<string, string> = {
  draft: "secondary",
  sent: "outline",
  paid: "default",
  overdue: "destructive",
};

function InvoiceMobileCard({
  invoice,
  onView,
}: {
  invoice: Invoice;
  onView: () => void;
}) {
  return (
    <button
      onClick={onView}
      className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-foreground">{invoice.invoice_number}</span>
          <Badge variant={statusColors[invoice.status] as any} className="shrink-0 text-[10px]">
            {invoice.status}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">{invoice.clients?.name || "—"}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Due {format(parseISO(invoice.due_date), "dd/MM/yy")}
          </span>
          <span className="font-semibold text-foreground">${Number(invoice.total).toFixed(2)}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const { data: result, isLoading: loading } = useQuery({
    queryKey: queryKeys.invoices.list({ page, search: debouncedSearch }),
    queryFn: () =>
      fetchInvoicesPaginated({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: debouncedSearch,
        status: statusFilter,
      }),
  });
  const invoices = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / DEFAULT_PAGE_SIZE);

  const invalidateInvoices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
  }, [queryClient]);

  const stats = {
    total: totalCount,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    totalAmount: invoices.reduce((sum, i) => sum + Number(i.total), 0),
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Invoices</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="sticky top-0 z-10 hidden border-b border-border bg-card md:block">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Invoicing</h1>
              <p className="text-sm text-muted-foreground">Manage your invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AccountingExport invoices={invoices} />
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats — horizontal scroll on mobile */}
        <div className="-mx-4 mb-6 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:mb-8 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0">
          <Card className="min-w-[130px] shrink-0 md:min-w-0">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 md:h-12 md:w-12">
                  <FileText className="h-4 w-4 text-primary md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold md:text-2xl">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[130px] shrink-0 md:min-w-0">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 md:h-12 md:w-12">
                  <Clock className="h-4 w-4 text-warning md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold md:text-2xl">{stats.draft + stats.sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[130px] shrink-0 md:min-w-0">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 md:h-12 md:w-12">
                  <CheckCircle className="h-4 w-4 text-success md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-xl font-bold md:text-2xl">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[130px] shrink-0 md:min-w-0">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 md:h-12 md:w-12">
                  <DollarSign className="h-4 w-4 text-primary md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoiced</p>
                  <p className="text-xl font-bold md:text-2xl">${stats.totalAmount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by number or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card>
          <CardHeader className="pb-0 md:pb-3">
            <CardTitle className="text-base md:text-lg">Invoice List</CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No invoices</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create first invoice
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile: tappable card list */}
                <div className="divide-y divide-border md:hidden">
                  {invoices.map((invoice) => (
                    <InvoiceMobileCard
                      key={invoice.id}
                      invoice={invoice}
                      onView={() => setSelectedInvoice(invoice)}
                    />
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.clients?.name || "—"}</TableCell>
                          <TableCell>
                            {format(parseISO(invoice.issue_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>{format(parseISO(invoice.due_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-semibold">
                            ${Number(invoice.total).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusActions
                              invoiceId={invoice.id}
                              currentStatus={invoice.status}
                              clientEmail={invoice.clients?.email}
                              onStatusChange={invalidateInvoices}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <PaginatedControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform active:scale-95 md:hidden"
        aria-label="New Invoice"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>

      <CreateInvoiceDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={invalidateInvoices}
      />

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onUpdated={invalidateInvoices}
      />
    </div>
  );
}
