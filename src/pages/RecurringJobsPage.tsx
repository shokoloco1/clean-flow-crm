import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringSchedule | null>(null);
  const [generating, setGenerating] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [schedulesRes, clientsRes, propertiesRes, staffRolesRes] = await Promise.all([
      supabase
        .from("recurring_schedules")
        .select(`
          *,
          clients (name),
          properties (name)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, address").order("name"),
      supabase.from("properties").select("id, name, address, client_id").eq("is_active", true).order("name"),
      supabase.from("user_roles").select("user_id").eq("role", "staff"),
    ]);

    const staffIds = staffRolesRes.data?.map((r) => r.user_id) || [];
    const { data: staffData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", staffIds.length > 0 ? staffIds : ['']);

    // Map staff names to schedules
    const staffMap = Object.fromEntries((staffData || []).map(s => [s.user_id, s.full_name]));
    const schedulesWithStaff = (schedulesRes.data || []).map((schedule: any) => ({
      ...schedule,
      profiles: schedule.assigned_staff_id ? { full_name: staffMap[schedule.assigned_staff_id] || 'Unassigned' } : null
    }));

    setSchedules(schedulesWithStaff as RecurringSchedule[]);
    setClients((clientsRes.data as Client[]) || []);
    setProperties((propertiesRes.data as Property[]) || []);
    setStaffList((staffData as Staff[]) || []);
    setLoading(false);
  };

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

    if ((formData.frequency === "weekly" || formData.frequency === "biweekly") && formData.days_of_week.length === 0) {
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
      days_of_week: formData.frequency === "weekly" || formData.frequency === "biweekly" ? formData.days_of_week : [],
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
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring schedule?")) return;

    const { error } = await supabase.from("recurring_schedules").delete().eq("id", id);

    if (error) {
      toast.error("Error deleting schedule");
      return;
    }

    toast.success("Schedule deleted");
    fetchData();
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
    fetchData();
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recurring-jobs");

      if (error) throw error;

      toast.success(`${data.jobsCreated} job(s) generated`);
      fetchData();
    } catch (error: any) {
      toast.error("Error generating jobs: " + error.message);
    }
    setGenerating(false);
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
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Repeat className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
              <h1 className="text-xl font-bold text-foreground">Recurring Jobs</h1>
                <p className="text-sm text-muted-foreground">{schedules.length} schedules</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGenerateNow} disabled={generating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
              Generate Now
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : schedules.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarSync className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No recurring schedules yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Set up weekly or monthly cleaning schedules and let CleanFlow auto-generate jobs for you.
              </p>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className={`border-border ${!schedule.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground text-lg">
                          {schedule.clients?.name || "No client"}
                        </h3>
                        <Badge variant={schedule.is_active ? "default" : "secondary"}>
                          {schedule.is_active ? "Active" : "Paused"}
                        </Badge>
                        <Badge variant="outline">{getFrequencyLabel(schedule.frequency)}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
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
                          Last generated: {format(new Date(schedule.last_generated_date), "dd/MM/yyyy")}
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
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "New Recurring Schedule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <label
                      key={day.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.days_of_week.includes(day.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
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
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
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
