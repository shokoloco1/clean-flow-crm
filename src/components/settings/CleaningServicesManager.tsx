import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  GripVertical,
  Pencil,
  Check,
  X
} from "lucide-react";

export interface CleaningService {
  id: string;
  label: string;
  description: string;
}

interface CleaningServicesManagerProps {
  services: CleaningService[];
  onServicesChange: (services: CleaningService[]) => void;
}

export function CleaningServicesManager({ 
  services, 
  onServicesChange 
}: CleaningServicesManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CleaningService | null>(null);
  const [newService, setNewService] = useState<CleaningService>({
    id: "",
    label: "",
    description: ""
  });
  const [isAdding, setIsAdding] = useState(false);

  const generateId = (label: string) => {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  const handleAdd = () => {
    if (!newService.label.trim()) return;
    
    const id = generateId(newService.label);
    const serviceToAdd = { ...newService, id };
    
    // Check for duplicate ID
    if (services.some(s => s.id === id)) {
      return;
    }
    
    onServicesChange([...services, serviceToAdd]);
    setNewService({ id: "", label: "", description: "" });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onServicesChange(services.filter(s => s.id !== id));
  };

  const handleEdit = (service: CleaningService) => {
    setEditingId(service.id);
    setEditForm({ ...service });
  };

  const handleSaveEdit = () => {
    if (!editForm || !editForm.label.trim()) return;
    
    onServicesChange(
      services.map(s => s.id === editingId ? editForm : s)
    );
    setEditingId(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Cleaning Services
        </CardTitle>
        <CardDescription>
          Manage the list of cleaning services available when creating jobs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[350px] rounded-md border">
          <div className="p-4 space-y-2">
            {services.map((service, index) => (
              <div 
                key={service.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border bg-card
                  ${editingId === service.id ? 'border-primary' : 'border-border'}
                `}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                
                {editingId === service.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editForm?.label || ""}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, label: e.target.value } : null)}
                      placeholder="Service name"
                      className="h-9"
                    />
                    <Input
                      value={editForm?.description || ""}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                      placeholder="Description"
                      className="h-9"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{service.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(service)}
                        aria-label="Edit service"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(service.id)}
                        aria-label="Delete service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {services.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No services configured</p>
                <p className="text-sm">Add your first cleaning service below</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Add New Service */}
        {isAdding ? (
          <div className="space-y-3 p-4 border border-dashed border-primary rounded-lg bg-primary/5">
            <Label className="text-sm font-medium">Add New Service</Label>
            <Input
              value={newService.label}
              onChange={(e) => setNewService(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Service name (e.g., End of Lease Cleaning)"
              className="h-11"
            />
            <Input
              value={newService.description}
              onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Short description"
              className="h-11"
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!newService.label.trim()}>
                <Plus className="h-4 w-4 mr-2" /> Add Service
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full h-11" 
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add New Service
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          {services.length} service{services.length !== 1 ? 's' : ''} configured. 
          These will appear in the job creation form.
        </p>
      </CardContent>
    </Card>
  );
}
