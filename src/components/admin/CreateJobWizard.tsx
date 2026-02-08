import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, Search, Plus, User, MapPin,
  Calendar as CalendarIcon, CheckCircle, ArrowLeft, ArrowRight,
  Phone, Building, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { useCleaningServices } from "@/hooks/useCleaningServices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface Client {
  id: string;
  name: string;
  address: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Staff {
  user_id: string;
  full_name: string;
}

export interface NewJobData {
  client_id: string;
  location: string;
  assigned_staff_id: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
  checklist: string;
}

interface CreateJobWizardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  staffList: Staff[];
  formData: NewJobData;
  onFormChange: (data: NewJobData) => void;
  onSubmit: () => void;
  onClientCreated?: () => void;
}

const STEPS = [
  { id: 1, title: "Select Client", icon: User },
  { id: 2, title: "Service & Schedule", icon: CalendarIcon },
  { id: 3, title: "Confirm", icon: CheckCircle },
];

export function CreateJobWizard({
  isOpen,
  onOpenChange,
  clients,
  staffList,
  formData,
  onFormChange,
  onSubmit,
  onClientCreated
}: CreateJobWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    formData.scheduled_date ? new Date(formData.scheduled_date) : new Date()
  );
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [staffConflicts, setStaffConflicts] = useState<string[]>([]);
  
  const { services, loading: loadingServices } = useCleaningServices();

  // Check if selected date is in the past
  const isDateInPast = useMemo(() => {
    if (!selectedDate) return false;
    const today = startOfDay(new Date());
    return isBefore(selectedDate, today);
  }, [selectedDate]);

  // Check for staff conflicts when date/time/staff changes
  useEffect(() => {
    const checkStaffConflicts = async () => {
      if (!formData.scheduled_date || !formData.scheduled_time || !formData.assigned_staff_id) {
        setStaffConflicts([]);
        return;
      }

      const { data: existingJobs } = await supabase
        .from("jobs")
        .select("id, scheduled_time, clients(name)")
        .eq("scheduled_date", formData.scheduled_date)
        .eq("assigned_staff_id", formData.assigned_staff_id)
        .neq("status", "cancelled");

      if (existingJobs && existingJobs.length > 0) {
        // Check for time overlap (same time slot)
        const conflicts = existingJobs
          .filter(job => job.scheduled_time === formData.scheduled_time)
          .map(job => `Already assigned to ${(job.clients as { name?: string } | null)?.name || 'a job'} at ${job.scheduled_time}`);
        
        setStaffConflicts(conflicts);
      } else {
        setStaffConflicts([]);
      }
    };

    checkStaffConflicts();
  }, [formData.scheduled_date, formData.scheduled_time, formData.assigned_staff_id]);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  // Get selected client
  const selectedClient = useMemo(() => 
    clients.find(c => c.id === formData.client_id),
    [clients, formData.client_id]
  );

  // Auto-suggest staff based on availability (simplified - first available)
  const suggestedStaff = useMemo(() => {
    if (staffList.length === 0) return null;
    // In a real implementation, this would check staff_availability table
    // and filter by zone/location. For now, suggest first available.
    return staffList[0];
  }, [staffList]);

  // Auto-select suggested staff when moving to step 2
  useEffect(() => {
    if (currentStep === 2 && !formData.assigned_staff_id && suggestedStaff) {
      onFormChange({ ...formData, assigned_staff_id: suggestedStaff.user_id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, suggestedStaff]);

  const handleClientSelect = (client: Client) => {
    onFormChange({
      ...formData,
      client_id: client.id,
      location: client.address || ""
    });
  };

  const handleServiceToggle = (serviceId: string) => {
    const newServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(s => s !== serviceId)
      : [...selectedServices, serviceId];
    
    setSelectedServices(newServices);
    
    const serviceLabels = newServices
      .map(id => services.find(s => s.id === id)?.label)
      .filter(Boolean)
      .join('\n');
    
    onFormChange({ ...formData, checklist: serviceLabels });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      onFormChange({ ...formData, scheduled_date: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleTimeSelect = (time: string) => {
    onFormChange({ ...formData, scheduled_time: time });
  };

  const handleQuickAddClient = async () => {
    if (!quickAddName.trim()) {
      toast.error("Please enter a client name");
      return;
    }

    setIsCreatingClient(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: quickAddName.trim(),
          phone: quickAddPhone.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Client created!");
      setQuickAddName("");
      setQuickAddPhone("");
      setShowQuickAdd(false);
      onClientCreated?.();
      
      // Auto-select the new client
      handleClientSelect(data as Client);
    } catch (err) {
      logger.error("Error creating client:", err);
      toast.error("Failed to create client");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.client_id;
      case 2:
        return selectedServices.length > 0 && formData.scheduled_date && formData.scheduled_time;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentStep(1);
      setSearchQuery("");
      setSelectedServices([]);
      setShowQuickAdd(false);
      setQuickAddName("");
      setQuickAddPhone("");
      setStaffConflicts([]);
    }
    onOpenChange(open);
  };

  const getSelectedServiceNames = () => {
    return selectedServices
      .map(id => services.find(s => s.id === id)?.label)
      .filter(Boolean);
  };

  const getSelectedStaffName = () => {
    return staffList.find(s => s.user_id === formData.assigned_staff_id)?.full_name || "Not assigned";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
          <DialogTitle className="text-xl">📋 New Job</DialogTitle>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  currentStep >= step.id 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "border-muted-foreground/30 text-muted-foreground"
                )}>
                  <step.icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "ml-2 text-xs font-medium hidden sm:block",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 sm:w-12 h-0.5 mx-2",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 py-4 px-4 sm:px-6 pb-6">
            {/* Step 1: Select Client */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>

                {/* Quick Add Button */}
                {!showQuickAdd && (
                  <Button
                    variant="outline"
                    className="w-full h-12 border-dashed"
                    onClick={() => setShowQuickAdd(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Add Client
                  </Button>
                )}

                {/* Quick Add Form */}
                {showQuickAdd && (
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">New Client</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowQuickAdd(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <Input
                      placeholder="Client name *"
                      value={quickAddName}
                      onChange={(e) => setQuickAddName(e.target.value)}
                    />
                    <Input
                      placeholder="Phone (optional)"
                      value={quickAddPhone}
                      onChange={(e) => setQuickAddPhone(e.target.value)}
                    />
                    <Button 
                      className="w-full"
                      onClick={handleQuickAddClient}
                      disabled={isCreatingClient}
                    >
                      {isCreatingClient ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add Client
                    </Button>
                  </div>
                )}

                {/* Client List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No clients found</p>
                      <p className="text-sm">Try a different search or add a new client</p>
                    </div>
                  ) : (
                    filteredClients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className={cn(
                          "w-full text-left p-4 rounded-lg border transition-all",
                          formData.client_id === client.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{client.name}</p>
                            {client.phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </p>
                            )}
                            {client.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {client.address}
                              </p>
                            )}
                          </div>
                          {formData.client_id === client.id && (
                            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Location Override */}
                {formData.client_id && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm">Job Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
                      placeholder="Enter job address"
                      className="h-10"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Service & Schedule */}
            {currentStep === 2 && (
              <div className="space-y-5">
                {/* Services as Chips */}
                <div className="space-y-3">
                  <Label className="font-medium">Select Services</Label>
                  {loadingServices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {services.map(service => (
                        <button
                          key={service.id}
                          onClick={() => handleServiceToggle(service.id)}
                          className={cn(
                            "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                            selectedServices.includes(service.id)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          {service.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedServices.length > 0 && (
                    <p className="text-xs text-primary">
                      ✓ {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Date & Time Selection - Simple inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-date" className="font-medium">Date *</Label>
                    <Input
                      id="job-date"
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        onFormChange({ ...formData, scheduled_date: dateValue });
                        if (dateValue) {
                          handleDateSelect(new Date(dateValue + "T00:00:00"));
                        }
                      }}
                      min={new Date().toISOString().split("T")[0]}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-time" className="font-medium">Time *</Label>
                    <Input
                      id="job-time"
                      type="time"
                      value={formData.scheduled_time ? formData.scheduled_time.slice(0, 5) : ""}
                      onChange={(e) => {
                        const timeValue = e.target.value;
                        if (timeValue) {
                          // Convert 24h to 12h format for display consistency
                          const [hours, minutes] = timeValue.split(":");
                          const h = parseInt(hours);
                          const suffix = h >= 12 ? "PM" : "AM";
                          const h12 = h % 12 || 12;
                          const formatted = `${h12}:${minutes} ${suffix}`;
                          handleTimeSelect(formatted);
                        }
                      }}
                      className="h-12"
                    />
                  </div>
                </div>
                {isDateInPast && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Warning: Selected date is in the past
                    </AlertDescription>
                  </Alert>
                )}

                {/* Staff Assignment (Auto-suggested) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Assigned Staff</Label>
                    {suggestedStaff && (
                      <Badge variant="secondary" className="text-xs">
                        Auto-suggested
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {staffList.map(staff => (
                      <button
                        key={staff.user_id}
                        onClick={() => onFormChange({ ...formData, assigned_staff_id: staff.user_id })}
                        className={cn(
                          "px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                          formData.assigned_staff_id === staff.user_id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <User className="h-3 w-3" />
                        {staff.full_name}
                      </button>
                    ))}
                  </div>
                  
                  {/* Staff Conflict Warning */}
                  {staffConflicts.length > 0 && (
                    <Alert className="border-warning bg-warning/10 py-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-sm text-warning">
                        ⚠️ Scheduling conflict: {staffConflicts[0]}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="font-medium">Notes (optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
                    placeholder="Special instructions, access codes, etc..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  {/* Client */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Client</p>
                      <p className="font-medium">{selectedClient?.name || "Unknown"}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium">{formData.location || "No address"}</p>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Services</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getSelectedServiceNames().map((name, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""} at {formData.scheduled_time}
                      </p>
                    </div>
                  </div>

                  {/* Staff */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned To</p>
                      <p className="font-medium">{getSelectedStaffName()}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {formData.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{formData.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 sm:p-6 pt-3 pb-4 border-t bg-background shrink-0">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
