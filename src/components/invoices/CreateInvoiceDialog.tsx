import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, FileText } from "lucide-react";
import { PriceListReference } from "@/components/price-lists/PriceListReference";
import { format, differenceInMinutes } from "date-fns";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
}

interface CompletedJob {
  id: string;
  location: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string; hourly_rate: number | null } | null;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  job_id?: string;
}

interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateInvoiceDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: CreateInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(
    format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedClientId) {
      fetchCompletedJobs(selectedClientId);
    } else {
      setCompletedJobs([]);
      setSelectedJobs(new Set());
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    if (data) setClients(data);
  };

  const fetchCompletedJobs = async (clientId: string) => {
    // First get jobs
    const { data: jobsData } = await supabase
      .from("jobs")
      .select(`
        id, location, scheduled_date, start_time, end_time, assigned_staff_id,
        clients (name)
      `)
      .eq("client_id", clientId)
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false })
      .limit(50);

    if (jobsData && jobsData.length > 0) {
      // Get staff profiles for hourly rates
      const staffIds = [...new Set(jobsData.map(j => j.assigned_staff_id).filter(Boolean))];
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, hourly_rate")
        .in("user_id", staffIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const jobs: CompletedJob[] = jobsData.map(job => ({
        id: job.id,
        location: job.location,
        scheduled_date: job.scheduled_date,
        start_time: job.start_time,
        end_time: job.end_time,
        clients: job.clients,
        profiles: job.assigned_staff_id ? profilesMap.get(job.assigned_staff_id) || null : null
      }));

      setCompletedJobs(jobs);
    } else {
      setCompletedJobs([]);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobs(newSelection);
    updateLineItemsFromJobs(newSelection);
  };

  const calculateJobDuration = (job: CompletedJob): number => {
    if (!job.start_time || !job.end_time) return 1;
    const minutes = differenceInMinutes(new Date(job.end_time), new Date(job.start_time));
    return Math.max(Math.round((minutes / 60) * 100) / 100, 0.25); // Min 15 min
  };

  const updateLineItemsFromJobs = (jobIds: Set<string>) => {
    const items: InvoiceLineItem[] = [];
    
    jobIds.forEach((jobId) => {
      const job = completedJobs.find((j) => j.id === jobId);
      if (job) {
        const hours = calculateJobDuration(job);
        const hourlyRate = job.profiles?.hourly_rate || 25; // Default rate
        const total = hours * hourlyRate;

        items.push({
          id: `job-${jobId}`,
          description: `Cleaning - ${job.location} (${format(new Date(job.scheduled_date), "dd/MM/yyyy")})`,
          quantity: hours,
          unit_price: hourlyRate,
          total,
          job_id: jobId,
        });
      }
    });

    setLineItems(items);
  };

  const addManualLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `manual-${Date.now()}`,
        description: "",
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ]);
  };

  const updateLineItem = (id: string, field: string, value: string | number) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unit_price") {
            updated.total = Number(updated.quantity) * Number(updated.unit_price);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
    // Also remove from selected jobs if it's a job item
    if (id.startsWith("job-")) {
      const jobId = id.replace("job-", "");
      const newSelection = new Set(selectedJobs);
      newSelection.delete(jobId);
      setSelectedJobs(newSelection);
    }
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setLoading(true);

    try {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: "", // Will be auto-generated
          client_id: selectedClientId,
          status: "draft",
          due_date: dueDate,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          notes: notes || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsToInsert = lineItems.map((item) => ({
        invoice_id: invoice.id,
        job_id: item.job_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("Invoice created successfully");
      onOpenChange(false);
      onCreated();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Error creating invoice");
    }

    setLoading(false);
  };

  const resetForm = () => {
    setSelectedClientId("");
    setSelectedJobs(new Set());
    setLineItems([]);
    setTaxRate(0);
    setNotes("");
    setDueDate(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>New Invoice</DialogTitle>
            <PriceListReference 
              trigger={
                <Button variant="outline" size="sm" type="button">
                  <FileText className="h-4 w-4 mr-2" />
                  View Prices
                </Button>
              }
            />
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Completed Jobs Selection */}
          {selectedClientId && completedJobs.length > 0 && (
            <div className="space-y-2">
              <Label>Completed Jobs (select to add)</Label>
              <Card>
                <CardContent className="p-3 max-h-48 overflow-y-auto space-y-2">
                  {completedJobs.map((job) => {
                    const hours = calculateJobDuration(job);
                    const rate = job.profiles?.hourly_rate || 25;
                    return (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleJobSelection(job.id)}
                      >
                        <Checkbox checked={selectedJobs.has(job.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{job.location}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(job.scheduled_date), "dd/MM/yyyy")} • {hours.toFixed(2)}h × ${rate}/h
                          </p>
                        </div>
                        <span className="text-sm font-semibold">
                          ${(hours * rate).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Invoice Items</Label>
              <Button variant="outline" size="sm" onClick={addManualLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <Card>
              <CardContent className="p-3 space-y-3">
                {lineItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select jobs or add items manually
                  </p>
                ) : (
                  lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, "description", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, "quantity", Number(e.target.value))
                          }
                          step="0.25"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateLineItem(item.id, "unit_price", Number(e.target.value))
                          }
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2 text-right font-semibold">
                        ${item.total.toFixed(2)}
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tax and Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tax (%)</Label>
                <Input
                  type="number"
                  className="w-24 text-right"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
