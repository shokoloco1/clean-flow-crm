import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2,
  RefreshCw,
  Repeat,
  CalendarSync,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queries/keys";
import { fetchRecurringSchedules, fetchRecurringSchedulesPaginated } from "@/lib/queries/recurring";
import { fetchClientsDropdown, fetchPropertiesDropdown, fetchStaffDropdown } from "@/lib/queries/reference";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries/pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface RecurringSchedule {
  id: string;
  client_id: string | null;
  property_id: string | null;
  assigned_staff_id: string | null;
  location: string;
  scheduled_time: string;
  notes: string | null;
  checklist: string[];
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  days_of_week: number[];
  day_of_month: number | null;
  is_active: boolean;
  last_generated_date: string | null;
  next_generation_date: string | null;
  created_at: string;
  clients: { name: string } | null;
  properties: { name: string } | null;
  profiles: { full_name: string } | null;
}

interface Client {
  id: string;
  name: string;
  address: string | null;
}

interface Property {
  id: string;
  name: string;
  address: string;
  client_id: string | null;
}

interface Staff {
  user_id: string;
  full_name: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

export default function RecurringJobsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringSchedule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const [formData, setFormData] = useState({
    client_id: "",
    property_id: "",
    assigned_staff_id: "",
    location: "",
    scheduled_time: "09:00",
    notes: "",
    frequency: "weekly" as "daily" | "weekly" | "biweekly" | "monthly",
    days_of_week: [] as number[],
    day_of_month: 1,
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: schedulesResult, isLoading: loading } = useQuery({
    queryKey: queryKeys.recurring.list({ page, search: debouncedSearch }),
    queryFn: () =>
      fetchRecurringSchedulesPaginated({ page, pageSize: DEFAULT_PAGE_SIZE, search: debouncedSearch }),
  });
  const schedules = schedulesResult?.data ?? [];
  const totalCount = schedulesResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / DEFAULT_PAGE_SIZE);

  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients.dropdown(),
    queryFn: fetchClientsDropdown,
    staleTime: 5 * 60 * 1000,
  });

  const { data: properties = [] } = useQuery({
    queryKey: queryKeys.properties.dropdown(),
    queryFn: fetchPropertiesDropdown,
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: queryKeys.staff.dropdown(),
    queryFn: fetchStaffDropdown,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateSchedules = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recurring.all() });
  }, [queryClient]);

  const resetForm = () => {
    setFormData({
      client_id: "",
      property_id: "",
      assigned_staff_id: "",
      location: "",
      scheduled_time: "09:00",
      notes: "",
      frequency: "weekly",
      days_of_week: [],
      day_of_month: 1,
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule: RecurringSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      client_id: schedule.client_id || "",
      property_id: schedule.property_id || "",
      assigned_staff_id: schedule.assigned_staff_id || "",
      location: schedule.location,
      scheduled_time: schedule.scheduled_time,
      notes: schedule.notes || "",
      frequency: schedule.frequency,
      days_of_week: schedule.days_of_week || [],
      day_of_month: schedule.day_of_month || 1,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.location || !formData.assigned_staff_id) {
      toast.error("Location and staff member are required");
      return;
    }

    if (
      (formData.frequency === "weekly" || formData.frequency === "biweekly") &&
      formData.days_of_week.length === 0
    ) {
      toast.error("Please select at least one day of the week");
      return;
    }

    const scheduleData = {
      client_id: formData.client_id || null,
      property_id: formData.property_id || null,
      assigned_staff_id: formData.assigned_staff_id,
      location: formData.location,
      scheduled_time: formData.scheduled_time,
      notes: formData.notes || null,
      frequency: formData.frequency,
      days_of_week:
        formData.frequency === "weekly" || formData.frequency === "biweekly"
          ? formData.days_of_week
          : [],
      day_of_month: formData.frequency === "monthly" ? formData.day_of_month : null,
    };

    if (editingSchedule) {
      const { error } = await supabase
        .from("recurring_schedules")
        .update(scheduleData)
        .eq("id", editingSchedule.id);

      if (error) {
        toast.error("Error updating schedule");
        return;
      }
      toast.success("Schedule updated");
    } else {
      const { error } = await supabase.from("recurring_schedules").insert(scheduleData);

      if (error) {
        toast.error("Error creating schedule");
        return;
      }
      toast.success("Schedule created");
    }

    setIsDialogOpen(false);
    resetForm();
    invalidateSchedules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring schedule?")) return;

    const { error } = await supabase.from("recurring_schedules").delete().eq("id", id);

    if (error) {
      toast.error("Error deleting schedule");
      return;
    }

    toast.success("Schedule deleted");
    invalidateSchedules();
  };

  const handleToggleActive = async (schedule: RecurringSchedule) => {
    const { error } = await supabase
      .from("recurring_schedules")
      .update({ is_active: !schedule.is_active })
      .eq("id", schedule.id);

    if (error) {
      toast.error("Error updating status");
      return;
    }

    toast.success(schedule.is_active ? "Schedule paused" : "Schedule activated");
    invalidateSchedules();
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-recurring-jobs");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data?.jobsCreated || 0} job(s) successfully`);
      invalidateSchedules();
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
    },
    onError: (error: Error) => {
      toast.error("Failed to generate jobs: " + error.message);
    },
  });

  const handleGenerateNow = () => {
    generateMutation.mutate();
  };

  const getFrequencyLabel = (frequency: string) => {
    return FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || frequency;
  };

  const getDaysLabel = (days: number[]) => {
    if (!days || days.length === 0) return "";
    return days.map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label).join(", ");
  };

  const filteredProperties = formData.client_id
    ? properties.filter((p) => p.client_id === formData.client_id)
    : properties;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Repeat className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Recurring Jobs</h1>
                <p className="text-sm text-muted-foreground">{schedules.length} schedules</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGenerateNow} disabled={generateMutation.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              Generate Now
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Schedule
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : schedules.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CalendarSync className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                No recurring schedules yet
              </h3>
              <p className="mb-6 max-w-sm text-muted-foreground">
                Set up weekly or monthly cleaning schedules and let Pulcrix auto-generate jobs for
                you.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className={`border-border ${!schedule.is_active ? "opacity-60" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {schedule.clients?.name || "No client"}
                        </h3>
                        <Badge variant={schedule.is_active ? "default" : "secondary"}>
                          {schedule.is_active ? "Active" : "Paused"}
                        </Badge>
                        <Badge variant="outline">{getFrequencyLabel(schedule.frequency)}</Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{schedule.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{schedule.scheduled_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{schedule.profiles?.full_name || "Unassigned"}</span>
                        </div>
                      </div>

                      {(schedule.frequency === "weekly" || schedule.frequency === "biweekly") && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Days: {getDaysLabel(schedule.days_of_week)}</span>
                        </div>
                      )}

                      {schedule.frequency === "monthly" && schedule.day_of_month && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Day of month: {schedule.day_of_month}</span>
                        </div>
                      )}

                      {schedule.last_generated_date && (
                        <p className="text-xs text-muted-foreground">
                          Last generated:{" "}
                          {format(new Date(schedule.last_generated_date), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={() => handleToggleActive(schedule)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setPage(pageNum)}
                        isActive={page === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 5 && page < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "New Recurring Schedule"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label>Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => {
                  const client = clients.find((c) => c.id === v);
                  setFormData({
                    ...formData,
                    client_id: v,
                    location: client?.address || formData.location,
                    property_id: "",
                  });
                }}
              >
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

            <div>
              <Label>Property</Label>
              <Select
                value={formData.property_id}
                onValueChange={(v) => {
                  const property = properties.find((p) => p.id === v);
                  setFormData({
                    ...formData,
                    property_id: v,
                    location: property?.address || formData.location,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProperties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location *</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Job address"
              />
            </div>

            <div>
              <Label>Assigned Staff *</Label>
              <Select
                value={formData.assigned_staff_id}
                onValueChange={(v) => setFormData({ ...formData, assigned_staff_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Scheduled Time</Label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>

            <div>
              <Label>Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(v: "daily" | "weekly" | "biweekly" | "monthly") =>
                  setFormData({ ...formData, frequency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.frequency === "weekly" || formData.frequency === "biweekly") && (
              <div>
                <Label>Days of Week</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <label
                      key={day.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                        formData.days_of_week.includes(day.value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={formData.days_of_week.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              days_of_week: [...formData.days_of_week, day.value].sort(),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              days_of_week: formData.days_of_week.filter((d) => d !== day.value),
                            });
                          }
                        }}
                        className="hidden"
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.frequency === "monthly" && (
              <div>
                <Label>Day of Month</Label>
                <Select
                  value={formData.day_of_month.toString()}
                  onValueChange={(v) => setFormData({ ...formData, day_of_month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Day {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special instructions"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingSchedule ? "Save Changes" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
