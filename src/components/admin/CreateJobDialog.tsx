import { useState } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// Cleaning services for Australian market
const CLEANING_SERVICES = [
  { id: 'general', label: 'General Cleaning', description: 'Standard house cleaning' },
  { id: 'deep', label: 'Deep Cleaning', description: 'Thorough top-to-bottom cleaning' },
  { id: 'end_of_lease', label: 'End of Lease Cleaning', description: 'Bond back guarantee cleaning' },
  { id: 'move_in', label: 'Move In/Out Cleaning', description: 'Pre or post move cleaning' },
  { id: 'airbnb', label: 'Airbnb Turnover', description: 'Quick turnaround for short-term rentals' },
  { id: 'spring', label: 'Spring Cleaning', description: 'Seasonal deep clean' },
  { id: 'carpet', label: 'Carpet Cleaning', description: 'Steam or dry carpet cleaning' },
  { id: 'windows', label: 'Window Cleaning', description: 'Interior and exterior windows' },
  { id: 'oven', label: 'Oven Cleaning', description: 'Professional oven degreasing' },
  { id: 'bathroom', label: 'Bathroom Deep Clean', description: 'Tile, grout, and fixtures' },
  { id: 'kitchen', label: 'Kitchen Deep Clean', description: 'Appliances, cabinets, surfaces' },
  { id: 'office', label: 'Office Cleaning', description: 'Commercial workspace cleaning' },
  { id: 'post_construction', label: 'Post Construction', description: 'Builder clean services' },
  { id: 'upholstery', label: 'Upholstery Cleaning', description: 'Sofas, chairs, mattresses' },
];

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
      .map(id => CLEANING_SERVICES.find(s => s.id === id)?.label)
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Staff Assignment */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Assign to *</Label>
            <Select 
              value={formData.assigned_staff_id} 
              onValueChange={(v) => onFormChange({ ...formData, assigned_staff_id: v })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="🧹 Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {staffList.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    No employees yet. Invite one first.
                  </p>
                ) : (
                  staffList.map(staff => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
            <p className="text-xs text-muted-foreground">Select the cleaning services for this job</p>
            <ScrollArea className="h-[200px] rounded-md border p-3">
              <div className="space-y-3">
                {CLEANING_SERVICES.map(service => (
                  <div 
                    key={service.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedServices.includes(service.id) 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
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
                      <label 
                        htmlFor={service.id} 
                        className="font-medium text-sm cursor-pointer"
                      >
                        {service.label}
                      </label>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {selectedServices.length > 0 && (
              <p className="text-xs text-primary font-medium">
                ✓ {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
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
          <Button onClick={onSubmit} className="w-full h-12 text-base">
            ✨ Create Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}