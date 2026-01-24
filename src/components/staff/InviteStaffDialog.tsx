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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  UserPlus, 
  Phone, 
  DollarSign,
  Award,
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";

const CERTIFICATION_OPTIONS = [
  "First Aid Certificate",
  "Working with Children Check",
  "Police Check",
  "White Card",
  "Chemical Handling Certificate",
  "Food Safety Certificate",
  "COVID-19 Infection Control"
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
  certifications: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const initialFormData: FormData = {
  email: "",
  fullName: "",
  phone: "",
  hourlyRate: "",
  certifications: [],
  emergencyContactName: "",
  emergencyContactPhone: ""
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
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

    if (formData.hourlyRate && isNaN(parseFloat(formData.hourlyRate))) {
      newErrors.hourlyRate = "Please enter a valid number";
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
      if (!authData.user) throw new Error("Could not create user");

      const userId = authData.user.id;

      // 2. Create the profile (skills set to empty array)
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone || null,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          skills: [],
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
    onSuccess: () => {
      toast({
        title: "Employee added!",
        description: `${formData.fullName} has been registered successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Error creating staff:", error);
      
      if (error.message?.includes("already registered")) {
        setErrors({ email: "This email is already registered" });
      } else {
        toast({
          title: "Error creating employee",
          description: error.message || "An unexpected error occurred",
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
            {step === 1 ? "Add Employee" : "Certifications"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Step 1 of 2: Enter the employee's basic information"
              : "Step 2 of 2: Select certifications (optional)"}
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
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Sarah Johnson"
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
                  placeholder="employee@example.com.au"
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
                  An email with login instructions will be sent
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="04XX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourlyRate" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Hourly Rate (AUD)
                  </Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="35.00"
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
                  Emergency Contact (Optional)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Contact name"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  />
                  <Input
                    placeholder="Phone number"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Certifications Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Certifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Select any certifications this employee holds
              </p>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATION_OPTIONS.map((cert) => (
                  <Badge
                    key={cert}
                    variant={formData.certifications.includes(cert) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105 py-2 px-3"
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
              <h4 className="font-medium text-sm">Employee Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Name:</strong> {formData.fullName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
                {formData.hourlyRate && <p><strong>Hourly Rate:</strong> ${formData.hourlyRate}/hr</p>}
                {formData.certifications.length > 0 && (
                  <p><strong>Certifications:</strong> {formData.certifications.length} selected</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto h-12">
                Cancel
              </Button>
              <Button onClick={handleNextStep} className="w-full sm:w-auto h-12">
                Continue →
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto h-12">
                ← Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createStaffMutation.isPending}
                className="w-full sm:w-auto h-12"
              >
                {createStaffMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Add Employee"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
