import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { fetchCalendarJobs, type CalendarJob as CalendarJobRecord } from "@/lib/queries/calendar";
import { fetchClientsDropdown } from "@/lib/queries/reference";
import { fetchStaffDropdown } from "@/lib/queries/reference";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, LogOut, Calendar, Plus, Clock, MapPin, User, Loader2 } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";

interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  client_id: string | null;
  assigned_staff_id: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

interface Client {
  id: string;
  name: string;
  address: string | null;
}

interface Staff {
  user_id: string;
  full_name: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    job: Job;
  };
}

export default function CalendarPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
  };

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    client_id: "",
    location: "",
    assigned_staff_id: "",
    scheduled_date: format(new Date(), "yyyy-MM-dd"),
    scheduled_time: "09:00",
    notes: "",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "hsl(160, 84%, 39%)", border: "hsl(160, 84%, 35%)", text: "hsl(0, 0%, 100%)" };
      case "in_progress":
        return { bg: "hsl(38, 92%, 50%)", border: "hsl(38, 92%, 45%)", text: "hsl(0, 0%, 100%)" };
      case "cancelled":
        return { bg: "hsl(0, 84%, 60%)", border: "hsl(0, 84%, 55%)", text: "hsl(0, 0%, 100%)" };
      default:
        return { bg: "hsl(215, 19%, 35%)", border: "hsl(215, 19%, 30%)", text: "hsl(0, 0%, 100%)" };
    }
  };

  // --- React Query: data fetching ---
  const { data: calendarJobs = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.calendar.jobs(),
    queryFn: fetchCalendarJobs,
  });

  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients.dropdown(),
    queryFn: fetchClientsDropdown,
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: queryKeys.staff.dropdown(),
    queryFn: fetchStaffDropdown,
    staleTime: 5 * 60 * 1000,
  });

  const transformJobsToEvents = useCallback((jobs: Job[]): CalendarEvent[] => {
    return jobs.map((job) => {
      const colors = getStatusColor(job.status);
      const startDateTime = `${job.scheduled_date}T${job.scheduled_time}`;
      const [hours, minutes] = job.scheduled_time.split(":").map(Number);
      const endHour = hours + 2; // Default 2-hour duration
      const endTime = `${String(endHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const endDateTime = `${job.scheduled_date}T${endTime}`;

      return {
        id: job.id,
        title: job.clients?.name || job.location,
        start: startDateTime,
        end: endDateTime,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: { job },
      };
    });
  }, []);

  const events = useMemo(() => transformJobsToEvents(calendarJobs as Job[]), [calendarJobs, transformJobsToEvents]);

  // Real-time subscription: invalidate calendar query on any jobs table change
  useEffect(() => {
    const channel = supabase
      .channel("calendar-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.calendar.jobs() });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const job = clickInfo.event.extendedProps.job as Job;
    setSelectedJob(job);
    setIsViewOpen(true);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setFormData({
      client_id: "",
      location: "",
      assigned_staff_id: "",
      scheduled_date: format(selectInfo.start, "yyyy-MM-dd"),
      scheduled_time: format(selectInfo.start, "HH:mm"),
      notes: "",
    });
    setIsCreateOpen(true);
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const job = dropInfo.event.extendedProps.job as Job;
    const newDate = format(dropInfo.event.start!, "yyyy-MM-dd");
    const newTime = format(dropInfo.event.start!, "HH:mm");

    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: newDate,
        scheduled_time: newTime,
      })
      .eq("id", job.id);

    if (error) {
      toast.error("Error updating job schedule");
      dropInfo.revert();
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.jobs() });
      toast.success("Job rescheduled successfully");
    }
  };

  const createJobMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("jobs").insert({
        client_id: data.client_id,
        location: data.location,
        assigned_staff_id: data.assigned_staff_id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.jobs() });
      toast.success("Job created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Error creating job");
    },
  });

  const handleCreateJob = () => {
    if (!formData.client_id || !formData.location || !formData.assigned_staff_id) {
      toast.error("Please fill in all required fields");
      return;
    }
    createJobMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      location: "",
      assigned_staff_id: "",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_time: "09:00",
      notes: "",
    });
  };

  const handleEditJob = async () => {
    if (!selectedJob) return;

    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        notes: formData.notes,
        assigned_staff_id: formData.assigned_staff_id || selectedJob.assigned_staff_id,
      })
      .eq("id", selectedJob.id);

    if (error) {
      toast.error("Error updating job");
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.jobs() });
      toast.success("Job updated successfully");
      setIsViewOpen(false);
      setSelectedJob(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success";
      case "in_progress":
        return "bg-warning/10 text-warning";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <PulcrixLogo />
              <div>
                <h1 className="text-xl font-bold text-foreground">Calendar</h1>
                <p className="text-sm text-muted-foreground">Job Scheduling</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Schedule</CardTitle>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-secondary" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span>Completed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : (
              <div className="fc-wrapper [&_.fc-button-active]:!bg-primary/80 [&_.fc-button:hover]:bg-primary/90 [&_.fc-button]:border-primary [&_.fc-button]:bg-primary [&_.fc-button]:text-primary-foreground [&_.fc-col-header-cell-cushion]:text-foreground [&_.fc-day-today]:bg-accent/30 [&_.fc-daygrid-day-number]:text-foreground [&_.fc-daygrid-day]:border-border [&_.fc-event]:cursor-pointer [&_.fc-scrollgrid-section>*]:border-border [&_.fc-scrollgrid]:border-border [&_.fc-timegrid-slot-label]:text-muted-foreground [&_.fc-timegrid-slot]:border-border [&_.fc-toolbar-title]:text-foreground [&_.fc]:bg-card">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  events={events}
                  editable={true}
                  selectable={true}
                  selectMirror={true}
                  dayMaxEvents={3}
                  eventClick={handleEventClick}
                  select={handleDateSelect}
                  eventDrop={handleEventDrop}
                  height="auto"
                  buttonText={{
                    today: "Today",
                    month: "Month",
                    week: "Week",
                    day: "Day",
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Job Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label>Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => {
                  const client = clients.find((c) => c.id === v);
                  setFormData({
                    ...formData,
                    client_id: v,
                    location: client?.address || formData.location,
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
              <Label>Location *</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter address"
              />
            </div>

            <div>
              <Label>Assign Staff *</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes for staff"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateJob}>Create Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Job Dialog */}
      <Dialog
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) setSelectedJob(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {selectedJob.clients?.name || "No client"}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(selectedJob.status)}`}
                >
                  {selectedJob.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{selectedJob.location}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(parseISO(selectedJob.scheduled_date), "EEEE, MMMM d, yyyy")} at{" "}
                  {selectedJob.scheduled_time}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Assigned to: {selectedJob.profiles?.full_name || "Unassigned"}</span>
              </div>

              {selectedJob.notes && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">{selectedJob.notes}</p>
                </div>
              )}

              <div className="space-y-4 border-t border-border pt-4">
                <h4 className="font-medium text-foreground">Reschedule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>New Date</Label>
                    <Input
                      type="date"
                      defaultValue={selectedJob.scheduled_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, scheduled_date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>New Time</Label>
                    <Input
                      type="time"
                      defaultValue={selectedJob.scheduled_time}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, scheduled_time: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Reassign Staff</Label>
                  <Select
                    defaultValue={selectedJob.assigned_staff_id || undefined}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, assigned_staff_id: v }))
                    }
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
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button onClick={handleEditJob}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
