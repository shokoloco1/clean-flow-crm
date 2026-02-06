import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  UserPlus,
  Phone,
  DollarSign,
  Award,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Mail,
  RefreshCw,
  AlertTriangle
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
}

interface InviteResult {
  success: boolean;
  userId?: string;
  emailSent: boolean;
  emailError?: string;
  message: string;
}

const initialFormData: FormData = {
  email: "",
  fullName: "",
  phone: "",
  hourlyRate: "",
  certifications: []
};

export function InviteStaffDialog({ open, onOpenChange }: InviteStaffDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastInviteResult, setLastInviteResult] = useState<InviteResult | null>(null);
  const [showEmailWarning, setShowEmailWarning] = useState(false);

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
    mutationFn: async (): Promise<InviteResult> => {
      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: {
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone || null,
          hourlyRate: formData.hourlyRate || null,
          certifications: formData.certifications
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as InviteResult;
    },
    onSuccess: (result) => {
      setLastInviteResult(result);
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });

      if (result.emailSent) {
        toast.success(`Invitation sent to ${formData.email}`, {
          description: "They will receive an email to set up their account"
        });
        handleClose();
      } else {
        // Staff was created but email failed
        setShowEmailWarning(true);
        toast.warning("Staff member created", {
          description: "Email delivery may have failed. You can resend the invitation.",
          duration: 6000
        });
      }
    },
    onError: (error: Error) => {
      if (error.message?.includes("already registered")) {
        setErrors({ email: "This email is already registered. Please use a different email address." });
        toast.error("Email already exists", {
          description: "This person already has an account. Try a different email."
        });
      } else {
        toast.error(error.message || "Failed to send invitation");
      }
    }
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async () => {
      // For resending, we can use Supabase's password reset which sends an email
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/signup?invited=true`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password reset email sent", {
        description: `${formData.fullName} can use this link to set up their password`
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast.error("Failed to resend invitation", {
        description: error.message
      });
    }
  });

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setLastInviteResult(null);
    setShowEmailWarning(false);
    onOpenChange(false);
  };

  const toggleCertification = (cert: string) => {
    if (formData.certifications.includes(cert)) {
      setFormData({ ...formData, certifications: formData.certifications.filter(c => c !== cert) });
    } else {
      setFormData({ ...formData, certifications: [...formData.certifications, cert] });
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      createStaffMutation.mutate();
    }
  };

  const handleResend = () => {
    resendInvitationMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            Add New Employee
          </DialogTitle>
          <DialogDescription>
            Enter employee details and they'll receive login instructions via email.
          </DialogDescription>
        </DialogHeader>

        {/* Email delivery warning */}
        {showEmailWarning && lastInviteResult && !lastInviteResult.emailSent && (
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <p className="font-medium">Staff member created, but email may not have been delivered.</p>
              <p className="text-sm mt-1">
                {lastInviteResult.emailError || "Please resend the invitation or share login instructions manually."}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResend}
                  disabled={resendInvitationMutation.isPending}
                  className="border-amber-600 text-amber-700 hover:bg-amber-100"
                >
                  {resendInvitationMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Resend Invitation
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClose}
                  className="text-amber-700"
                >
                  Close
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-5 py-2">
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
                disabled={showEmailWarning}
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
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@example.com.au"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setErrors({ ...errors, email: "" });
                  }}
                  disabled={showEmailWarning}
                  className={`h-12 pl-10 ${errors.email ? "border-destructive" : ""}`}
                />
              </div>
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
                  disabled={showEmailWarning}
                  className="h-12"
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
                  disabled={showEmailWarning}
                  className={`h-12 ${errors.hourlyRate ? "border-destructive" : ""}`}
                />
                {errors.hourlyRate && (
                  <p className="text-xs text-destructive">{errors.hourlyRate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Certifications Section */}
          <div className="space-y-3 pt-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Award className="h-4 w-4 text-muted-foreground" />
              Certifications (Optional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Select any certifications this employee holds
            </p>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <Badge
                  key={cert}
                  variant={formData.certifications.includes(cert) ? "default" : "outline"}
                  className={`cursor-pointer transition-all hover:scale-105 py-2 px-3 ${showEmailWarning ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={() => !showEmailWarning && toggleCertification(cert)}
                >
                  {formData.certifications.includes(cert) && (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  )}
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {!showEmailWarning && (
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto h-12">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createStaffMutation.isPending}
              className="w-full sm:w-auto h-12"
            >
              {createStaffMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
