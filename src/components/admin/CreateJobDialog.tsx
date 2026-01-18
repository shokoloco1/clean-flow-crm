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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">📋 Nuevo Trabajo</DialogTitle>
          <p className="text-sm text-muted-foreground">Llena los campos para programar un trabajo</p>
        </DialogHeader>
        <div className="space-y-5 mt-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Cliente *</Label>
            <Select 
              value={formData.client_id} 
              onValueChange={handleClientChange}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="👤 Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    No hay clientes. Crea uno primero.
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
            <Label className="text-base font-medium">Dirección *</Label>
            <Input 
              className="h-12"
              value={formData.location}
              onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
              placeholder="📍 Ingresa la dirección del trabajo"
            />
          </div>

          {/* Staff Assignment */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Asignar a *</Label>
            <Select 
              value={formData.assigned_staff_id} 
              onValueChange={(v) => onFormChange({ ...formData, assigned_staff_id: v })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="🧹 Selecciona un empleado" />
              </SelectTrigger>
              <SelectContent>
                {staffList.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    No hay empleados. Invita uno primero.
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
              <Label className="text-base font-medium">📅 Fecha</Label>
              <Input 
                type="date"
                className="h-12"
                value={formData.scheduled_date}
                onChange={(e) => onFormChange({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">🕐 Hora</Label>
              <Input 
                type="time"
                className="h-12"
                value={formData.scheduled_time}
                onChange={(e) => onFormChange({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Lista de tareas (opcional)</Label>
            <Textarea 
              value={formData.checklist}
              onChange={(e) => onFormChange({ ...formData, checklist: e.target.value })}
              placeholder="✓ Vaciar basura&#10;✓ Trapear pisos&#10;✓ Limpiar ventanas"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Una tarea por línea</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Notas para el empleado (opcional)</Label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
              placeholder="Instrucciones especiales, códigos de acceso, etc..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button onClick={onSubmit} className="w-full h-12 text-base">
            ✨ Crear Trabajo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
