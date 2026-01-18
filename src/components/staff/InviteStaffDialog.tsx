import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  UserPlus, 
  Mail, 
  User, 
  Phone, 
  DollarSign,
  Briefcase,
  Award,
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";

const SKILL_OPTIONS = [
  "Limpieza Residencial",
  "Limpieza Comercial",
  "Limpieza Profunda",
  "Limpieza de Ventanas",
  "Limpieza de Alfombras",
  "Limpieza de Cocina Industrial",
  "Manejo de Químicos",
  "Limpieza Post-Construcción"
];

const CERTIFICATION_OPTIONS = [
  "Manejo de Químicos Peligrosos",
  "Primeros Auxilios",
  "Seguridad Ocupacional",
  "Limpieza Hospitalaria",
  "Green Cleaning"
];

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  email: string;
  fullName: string;
  phone: string;
  hourlyRate: string;
  skills: string[];
  certifications: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  sendInviteEmail: boolean;
}

const initialFormData: FormData = {
  email: "",
  fullName: "",
  phone: "",
  hourlyRate: "",
  skills: [],
  certifications: [],
  emergencyContactName: "",
  emergencyContactPhone: "",
  sendInviteEmail: true
};

export function InviteStaffDialog({ open, onOpenChange }: InviteStaffDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2>(1);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = "El nombre es requerido";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "El nombre debe tener al menos 2 caracteres";
    }

    if (formData.hourlyRate && isNaN(parseFloat(formData.hourlyRate))) {
      newErrors.hourlyRate = "Ingresa un número válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createStaffMutation = useMutation({
    mutationFn: async () => {
      // Generate a temporary password for the new staff member
      const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

      // 1. Create the user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      const userId = authData.user.id;

      // 2. Create the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone || null,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          skills: formData.skills,
          certifications: formData.certifications,
          emergency_contact_name: formData.emergencyContactName || null,
          emergency_contact_phone: formData.emergencyContactPhone || null,
          hire_date: new Date().toISOString().split('T')[0],
          is_active: true
        });

      if (profileError) throw profileError;

      // 3. Assign the staff role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "staff"
        });

      if (roleError) throw roleError;

      // 4. Create default availability (Mon-Fri 8am-5pm)
      const availabilityRecords = [1, 2, 3, 4, 5].map(day => ({
        user_id: userId,
        day_of_week: day,
        start_time: "08:00",
        end_time: "17:00",
        is_available: true
      }));

      // Add weekend as unavailable
      availabilityRecords.push(
        { user_id: userId, day_of_week: 0, start_time: "08:00", end_time: "17:00", is_available: false },
        { user_id: userId, day_of_week: 6, start_time: "08:00", end_time: "17:00", is_available: false }
      );

      await supabase.from("staff_availability").insert(availabilityRecords);

      return { email: formData.email, tempPassword };
    },
    onSuccess: (data) => {
      toast({
        title: "¡Empleado agregado!",
        description: `${formData.fullName} ha sido registrado exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Error creating staff:", error);
      
      if (error.message?.includes("already registered")) {
        setErrors({ email: "Este email ya está registrado" });
      } else {
        toast({
          title: "Error al crear empleado",
          description: error.message || "Ocurrió un error inesperado",
          variant: "destructive"
        });
      }
    }
  });

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setStep(1);
    onOpenChange(false);
  };

  const handleNextStep = () => {
    if (validateForm()) {
      setStep(2);
    }
  };

  const toggleSkill = (skill: string) => {
    if (formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
    } else {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
    }
  };

  const toggleCertification = (cert: string) => {
    if (formData.certifications.includes(cert)) {
      setFormData({ ...formData, certifications: formData.certifications.filter(c => c !== cert) });
    } else {
      setFormData({ ...formData, certifications: [...formData.certifications, cert] });
    }
  };

  const handleSubmit = () => {
    createStaffMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            {step === 1 ? "👤 Agregar Empleado" : "🛠️ Habilidades"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Paso 1 de 2: Ingresa los datos básicos del nuevo empleado"
              : "Paso 2 de 2: Selecciona habilidades y certificaciones (opcional)"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex-1 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base font-medium">
                  Nombre Completo *
                </Label>
                <Input
                  id="fullName"
                  placeholder="Ej: María García López"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    setErrors({ ...errors, fullName: "" });
                  }}
                  className={`h-12 ${errors.fullName ? "border-destructive" : ""}`}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="empleado@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setErrors({ ...errors, email: "" });
                  }}
                  className={`h-12 ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Se enviará un email con las instrucciones de acceso
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+52 123 456 7890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourlyRate" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Tarifa/Hora
                  </Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={formData.hourlyRate}
                    onChange={(e) => {
                      setFormData({ ...formData, hourlyRate: e.target.value });
                      setErrors({ ...errors, hourlyRate: "" });
                    }}
                    className={errors.hourlyRate ? "border-destructive" : ""}
                  />
                  {errors.hourlyRate && (
                    <p className="text-xs text-destructive">{errors.hourlyRate}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Contacto de Emergencia (Opcional)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Nombre del contacto"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  />
                  <Input
                    placeholder="Teléfono"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Skills Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Habilidades
              </Label>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={formData.skills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleSkill(skill)}
                  >
                    {formData.skills.includes(skill) && (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Certifications Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Certificaciones
              </Label>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATION_OPTIONS.map((cert) => (
                  <Badge
                    key={cert}
                    variant={formData.certifications.includes(cert) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleCertification(cert)}
                  >
                    {formData.certifications.includes(cert) && (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Resumen del Empleado</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Nombre:</strong> {formData.fullName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                {formData.phone && <p><strong>Teléfono:</strong> {formData.phone}</p>}
                {formData.hourlyRate && <p><strong>Tarifa:</strong> ${formData.hourlyRate}/hora</p>}
                {formData.skills.length > 0 && (
                  <p><strong>Habilidades:</strong> {formData.skills.length} seleccionadas</p>
                )}
                {formData.certifications.length > 0 && (
                  <p><strong>Certificaciones:</strong> {formData.certifications.length} seleccionadas</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto h-12">
                Cancelar
              </Button>
              <Button onClick={handleNextStep} className="w-full sm:w-auto h-12">
                Continuar →
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto h-12">
                ← Atrás
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createStaffMutation.isPending}
                className="w-full sm:w-auto h-12"
              >
                {createStaffMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "✨ Agregar Empleado"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
