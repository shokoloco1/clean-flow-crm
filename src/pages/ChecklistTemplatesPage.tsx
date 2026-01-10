import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  Edit,
  Trash2,
  Home,
  Briefcase,
  Plane,
  Stethoscope,
  Check,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

interface TaskItem {
  room: string;
  tasks: string[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  tasks: Json;
  is_default: boolean;
}

const templateTypeConfig = {
  residential: { icon: Home, label: "Residential", color: "bg-blue-500/10 text-blue-600" },
  commercial: { icon: Briefcase, label: "Commercial", color: "bg-purple-500/10 text-purple-600" },
  airbnb: { icon: Plane, label: "Airbnb", color: "bg-orange-500/10 text-orange-600" },
  medical: { icon: Stethoscope, label: "Medical", color: "bg-green-500/10 text-green-600" },
};

export default function ChecklistTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_type: "residential",
    tasksText: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("checklist_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name");

    setTemplates((data as ChecklistTemplate[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      template_type: "residential",
      tasksText: "",
    });
    setEditingTemplate(null);
  };

  const parseTasksToText = (tasks: Json): string => {
    if (!Array.isArray(tasks)) return "";
    
    return (tasks as unknown as TaskItem[])
      .map((room) => `[${room.room}]\n${room.tasks.join("\n")}`)
      .join("\n\n");
  };

  const parseTextToTasks = (text: string): TaskItem[] => {
    const sections = text.split(/\n*\[/).filter(Boolean);
    return sections.map((section) => {
      const lines = section.split("\n").filter(Boolean);
      const roomMatch = lines[0].match(/^([^\]]+)\]/);
      const room = roomMatch ? roomMatch[1].trim() : lines[0].trim();
      const tasks = lines.slice(1).map((t) => t.trim()).filter(Boolean);
      return { room, tasks };
    });
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      template_type: template.template_type,
      tasksText: parseTasksToText(template.tasks),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Template name is required");
      return;
    }

    const tasks = parseTextToTasks(formData.tasksText);

    const templateData = {
      name: formData.name,
      description: formData.description || null,
      template_type: formData.template_type,
      tasks: tasks as unknown as Json,
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from("checklist_templates")
        .update(templateData)
        .eq("id", editingTemplate.id);

      if (error) {
        toast.error("Failed to update template");
        return;
      }
      toast.success("Template updated!");
    } else {
      const { error } = await supabase.from("checklist_templates").insert(templateData);

      if (error) {
        toast.error("Failed to create template");
        return;
      }
      toast.success("Template created!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchTemplates();
  };

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error("Cannot delete default templates");
      return;
    }
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase.from("checklist_templates").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete template");
      return;
    }

    toast.success("Template deleted!");
    fetchTemplates();
  };

  const getTypeConfig = (type: string) => {
    return templateTypeConfig[type as keyof typeof templateTypeConfig] || templateTypeConfig.residential;
  };

  const getTotalTasks = (tasks: Json): number => {
    if (!Array.isArray(tasks)) return 0;
    return (tasks as unknown as TaskItem[]).reduce((acc, room) => acc + room.tasks.length, 0);
  };

  if (selectedTemplate) {
    const typeConfig = getTypeConfig(selectedTemplate.template_type);
    const TypeIcon = typeConfig.icon;
    const tasks = selectedTemplate.tasks as unknown as TaskItem[];

    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTemplate(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{selectedTemplate.name}</h1>
                {selectedTemplate.is_default && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              )}
            </div>
            <Badge className={typeConfig.color}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {typeConfig.label}
            </Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-4">
          {Array.isArray(tasks) && tasks.map((room, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{room.room}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {room.tasks.map((task, taskIndex) => (
                    <li key={taskIndex} className="flex items-center gap-2 text-sm">
                      <div className="h-5 w-5 rounded border border-border flex items-center justify-center">
                        <Check className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {task}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Checklist Templates</h1>
            <p className="text-sm text-muted-foreground">{templates.length} templates</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Template Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Deep Clean Residential"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this template"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.template_type}
                      onValueChange={(v) => setFormData({ ...formData, template_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="airbnb">Airbnb</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Tasks (Format: [Room Name] followed by tasks)</Label>
                    <Textarea
                      value={formData.tasksText}
                      onChange={(e) => setFormData({ ...formData, tasksText: e.target.value })}
                      placeholder={`[Kitchen]\nClean countertops\nMop floor\nEmpty trash\n\n[Bathroom]\nClean toilet\nWipe mirrors\nMop floor`}
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use [Room Name] to start a new section, then list tasks on separate lines
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmit} className="flex-1">
                    {editingTemplate ? "Update Template" : "Create Template"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">Create your first checklist template</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const typeConfig = getTypeConfig(template.template_type);
              const TypeIcon = typeConfig.icon;
              const totalTasks = getTotalTasks(template.tasks);
              const roomCount = Array.isArray(template.tasks) ? template.tasks.length : 0;

              return (
                <Card
                  key={template.id}
                  className="border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{template.name}</h3>
                          {template.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                        )}
                      </div>
                      <Badge className={typeConfig.color}>
                        <TypeIcon className="h-3 w-3" />
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{roomCount} rooms</span>
                      <span>{totalTasks} tasks</span>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {!template.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template.id, template.is_default);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
