import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  // staffList, // Unused in this simplified component, but kept in interface for compatibility
  formData,
  onFormChange,
  onSubmit,
}: CreateJobDialogProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const { services, loading: loadingServices } = useCleaningServices();

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    onFormChange({
      ...formData,
      client_id: clientId,
      location: client?.address || formData.location,
    });
  };

  const handleServiceToggle = (serviceId: string) => {
    const newServices = selectedServices.includes(serviceId)
      ? selectedServices.filter((s) => s !== serviceId)
      : [...selectedServices, serviceId];

    setSelectedServices(newServices);

    // Update checklist with selected service labels
    const serviceLabels = newServices
      .map((id) => services.find((s) => s.id === id)?.label)
      .filter(Boolean)
      .join("\n");

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">📋 New Job</DialogTitle>
          <p className="text-sm text-muted-foreground">Fill in the fields to schedule a job</p>
        </DialogHeader>
        <div className="mt-4 space-y-5">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Client *</Label>
            <Select value={formData.client_id} onValueChange={handleClientChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="👤 Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    No clients yet. Create one first.
                  </p>
                ) : (
                  clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Address *</Label>
            <Input
              className="h-12"
              value={formData.location}
              onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
              placeholder="📍 Enter job address"
            />
          </div>

          {/* Staff Assignment - Availability Aware */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Assign to *</Label>
            <AvailabilityAwareStaffSelect
              date={formData.scheduled_date}
              time={formData.scheduled_time}
              value={formData.assigned_staff_id}
              onValueChange={(v) => onFormChange({ ...formData, assigned_staff_id: v })}
              placeholder="🧹 Select an employee"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">📅 Date</Label>
              <Input
                type="date"
                className="h-12"
                value={formData.scheduled_date}
                onChange={(e) => onFormChange({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">🕐 Time</Label>
              <Input
                type="time"
                className="h-12"
                value={formData.scheduled_time}
                onChange={(e) => onFormChange({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          {/* Services Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Services *</Label>
            <p className="text-xs text-muted-foreground">
              Select the cleaning services for this job
            </p>

            {loadingServices ? (
              <div className="flex items-center justify-center rounded-md border py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-md border py-8 text-center text-muted-foreground">
                <p>No services configured.</p>
                <p className="text-sm">Add services in Settings → Cleaning Services</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selectedServices.includes(service.id)
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleServiceToggle(service.id)}
                    >
                      <Checkbox
                        id={service.id}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => handleServiceToggle(service.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label htmlFor={service.id} className="cursor-pointer text-sm font-medium">
                          {service.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedServices.length > 0 && (
              <p className="text-xs font-medium text-primary">
                ✓ {selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""}{" "}
                selected
              </p>
            )}
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
          <Button onClick={onSubmit} className="h-12 w-full text-base">
            ✨ Create Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
