import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCleaningServices } from "@/hooks/useCleaningServices";
import { AvailabilityAwareStaffSelect } from "./AvailabilityAwareStaffSelect";

export interface Client {
  id: string;
  name: string;
  address: string | null;
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

interface CreateJobDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  staffList: Staff[];
  formData: NewJobData;
  onFormChange: (data: NewJobData) => void;
  onSubmit: () => void;
}

export function CreateJobDialog({
  isOpen,
  onOpenChange,
  clients,
  staffList,
  formData,
  onFormChange,
  onSubmit
}: CreateJobDialogProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const { services, loading: loadingServices } = useCleaningServices();

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    onFormChange({ 
      ...formData, 
      client_id: clientId,
      location: client?.address || formData.location
    });
  };

  const handleServiceToggle = (serviceId: string) => {
    const newServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(s => s !== serviceId)
      : [...selectedServices, serviceId];
    
    setSelectedServices(newServices);
    
    // Update checklist with selected service labels
    const serviceLabels = newServices
      .map(id => services.find(s => s.id === id)?.label)
      .filter(Boolean)
      .join('\n');
    
    onFormChange({ ...formData, checklist: serviceLabels });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedServices([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        <DialogHeader>
          <DialogTitle className="text-xl">📋 New Job</DialogTitle>
          <p className="text-sm text-muted-foreground">Fill in the fields to schedule a job</p>
        </DialogHeader>
        <div className="space-y-5 mt-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Client *</Label>
            <Select 
              value={formData.client_id} 
              onValueChange={handleClientChange}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="👤 Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    No clients yet. Create one first.
                  </p>
                ) : (
                  clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Services Selection - Chips Style */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select Services *</Label>

            {loadingServices ? (
              <div className="flex items-center justify-center py-8 border rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 border rounded-md text-muted-foreground">
                <p>No services configured.</p>
                <p className="text-sm">Add services in Settings</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {services.map(service => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceToggle(service.id)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      selectedServices.includes(service.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {service.label}
                  </button>
                ))}
              </div>
            )}

            {selectedServices.length > 0 && (
              <p className="text-xs text-primary font-medium">
                {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Date *</Label>
              <Input
                type="date"
                className="h-12"
                value={formData.scheduled_date}
                onChange={(e) => onFormChange({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Time *</Label>
              <Input
                type="time"
                className="h-12"
                value={formData.scheduled_time}
                onChange={(e) => onFormChange({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          {/* Staff Assignment - Availability Aware */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Assign Staff *</Label>
            <AvailabilityAwareStaffSelect
              date={formData.scheduled_date}
              time={formData.scheduled_time}
              value={formData.assigned_staff_id}
              onValueChange={(v) => onFormChange({ ...formData, assigned_staff_id: v })}
              placeholder="Select an employee"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Address *</Label>
            <Input
              className="h-12"
              value={formData.location}
              onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
              placeholder="Enter job address"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Notes for employee (optional)</Label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
              placeholder="Special instructions, access codes, etc..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button onClick={onSubmit} className="w-full h-12 text-base">
            ✨ Create Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
