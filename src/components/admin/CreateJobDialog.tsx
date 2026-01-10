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
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    onFormChange({ 
      ...formData, 
      client_id: clientId,
      location: client?.address || formData.location
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Client *</Label>
            <Select 
              value={formData.client_id} 
              onValueChange={handleClientChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
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
              onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
              placeholder="Enter address"
            />
          </div>

          <div>
            <Label>Assign Staff *</Label>
            <Select 
              value={formData.assigned_staff_id} 
              onValueChange={(v) => onFormChange({ ...formData, assigned_staff_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map(staff => (
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
                onChange={(e) => onFormChange({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Time *</Label>
              <Input 
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => onFormChange({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Task Checklist (one per line)</Label>
            <Textarea 
              value={formData.checklist}
              onChange={(e) => onFormChange({ ...formData, checklist: e.target.value })}
              placeholder="Empty trash bins&#10;Mop floors&#10;Clean windows"
              rows={4}
            />
          </div>

          <div>
            <Label>Notes for Staff</Label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
              placeholder="Any special instructions..."
              rows={2}
            />
          </div>

          <Button onClick={onSubmit} className="w-full">
            Create Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
