import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  UserPlus,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 1,
    title: "Your Business",
    icon: Building2,
    description: "Tell us about your cleaning business",
  },
  { id: 2, title: "First Client", icon: Users, description: "Add your first client" },
  { id: 3, title: "First Staff", icon: UserPlus, description: "Add a team member" },
  { id: 4, title: "First Job", icon: Briefcase, description: "Create your first job" },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Business info
  const [businessName, setBusinessName] = useState("");
  const [businessABN, setBusinessABN] = useState("");

  // Step 2: Client info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  // Step 3: Staff info
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [createdStaffId, setCreatedStaffId] = useState<string | null>(null);

  // Step 4: Job info
  const [jobLocation, setJobLocation] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [jobTime, setJobTime] = useState("09:00");

  const progress = (currentStep / STEPS.length) * 100;

  const handleSaveBusinessInfo = async () => {
    if (!businessName.trim()) {
      toast.error("Please enter your business name");
      return false;
    }

    setIsSubmitting(true);
    try {
      // Save business settings
      const settings = [
        { key: "company_name", value: JSON.stringify(businessName), description: "Company name" },
        {
          key: "company_abn",
          value: JSON.stringify(businessABN),
          description: "Australian Business Number",
        },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(setting, { onConflict: "key" });

        if (error) throw error;
      }

      toast.success("Business info saved!");
      return true;
    } catch (err) {
      logger.error("Error saving business info:", err);
      toast.error("Failed to save business info");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClient = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter a client name");
      return false;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: clientName.trim(),
          phone: clientPhone.trim() || null,
          email: clientEmail.trim() || null,
          address: clientAddress.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedClientId(data.id);
      setJobLocation(clientAddress || "");
      toast.success("Client created!");
      return true;
    } catch (err) {
      logger.error("Error creating client:", err);
      toast.error("Failed to create client");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!staffName.trim() || !staffEmail.trim()) {
      toast.error("Please enter staff name and email");
      return false;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-staff", {
        body: {
          email: staffEmail.trim(),
          fullName: staffName.trim(),
          phone: staffPhone.trim() || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedStaffId(data.userId);
      toast.success("Staff invitation sent!");
      return true;
    } catch (err) {
      logger.error("Error inviting staff:", err);
      toast.error(err instanceof Error ? err.message : "Failed to invite staff");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateJob = async () => {
    if (!jobLocation.trim() || !jobDate) {
      toast.error("Please enter job location and date");
      return false;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("jobs").insert({
        client_id: createdClientId,
        assigned_staff_id: createdStaffId,
        location: jobLocation.trim(),
        scheduled_date: jobDate,
        scheduled_time: jobTime,
        status: "pending",
      });

      if (error) throw error;

      // Mark onboarding as complete
      await supabase.from("system_settings").upsert(
        {
          key: "onboarding_completed",
          value: JSON.stringify(true),
          description: "Whether the onboarding wizard has been completed",
        },
        { onConflict: "key" },
      );

      toast.success("Job created! Onboarding complete 🎉");
      return true;
    } catch (err) {
      logger.error("Error creating job:", err);
      toast.error("Failed to create job");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    let success = false;

    switch (currentStep) {
      case 1:
        success = await handleSaveBusinessInfo();
        break;
      case 2:
        success = await handleCreateClient();
        break;
      case 3:
        success = await handleInviteStaff();
        break;
      case 4:
        success = await handleCreateJob();
        if (success) {
          onComplete();
          return;
        }
        break;
    }

    if (success && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const canSkip = currentStep === 2 || currentStep === 3;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="pb-2 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <PulcrixLogo variant="icon" size="sm" />
            <CardTitle className="text-2xl">Welcome to Your Cleaning Business</CardTitle>
          </div>
          <CardDescription>Let's get you set up in just a few steps</CardDescription>

          {/* Progress bar */}
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </p>
          </div>
        </CardHeader>

        {/* Step indicators */}
        <div className="px-6 py-4">
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted text-muted-foreground",
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 hidden text-xs font-medium sm:block",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <CardContent className="pt-4">
          {/* Step 1: Business Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="mb-6 text-center">
                <Building2 className="mx-auto mb-3 h-12 w-12 text-primary" />
                <h3 className="text-lg font-semibold">Tell us about your business</h3>
                <p className="text-sm text-muted-foreground">
                  This info appears on invoices and reports
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., Sparkle Clean Services"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessABN">ABN (Australian Business Number)</Label>
                  <Input
                    id="businessABN"
                    placeholder="e.g., 12 345 678 901"
                    value={businessABN}
                    onChange={(e) => setBusinessABN(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Optional - used for invoices</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: First Client */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="mb-6 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-primary" />
                <h3 className="text-lg font-semibold">Add your first client</h3>
                <p className="text-sm text-muted-foreground">You can add more clients later</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g., John Smith"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">
                      <Phone className="mr-1 inline h-3 w-3" />
                      Phone
                    </Label>
                    <Input
                      id="clientPhone"
                      placeholder="0412 345 678"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">
                      <Mail className="mr-1 inline h-3 w-3" />
                      Email
                    </Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="john@email.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientAddress">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    Address
                  </Label>
                  <Input
                    id="clientAddress"
                    placeholder="123 Main St, Sydney NSW 2000"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                  />
                </div>
              </div>

              {createdClientId && (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  <Check className="mr-2 h-4 w-4" />
                  Client created successfully!
                </Badge>
              )}
            </div>
          )}

          {/* Step 3: First Staff */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="mb-6 text-center">
                <UserPlus className="mx-auto mb-3 h-12 w-12 text-primary" />
                <h3 className="text-lg font-semibold">Add a team member</h3>
                <p className="text-sm text-muted-foreground">They'll receive an email invitation</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staffName">Full Name *</Label>
                  <Input
                    id="staffName"
                    placeholder="e.g., Maria Garcia"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staffEmail">Email *</Label>
                  <Input
                    id="staffEmail"
                    type="email"
                    placeholder="maria@email.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    An invitation will be sent to this email
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staffPhone">Phone (optional)</Label>
                  <Input
                    id="staffPhone"
                    placeholder="0423 456 789"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                  />
                </div>
              </div>

              {createdStaffId && (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  <Check className="mr-2 h-4 w-4" />
                  Invitation sent successfully!
                </Badge>
              )}
            </div>
          )}

          {/* Step 4: First Job */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="mb-6 text-center">
                <Briefcase className="mx-auto mb-3 h-12 w-12 text-primary" />
                <h3 className="text-lg font-semibold">Create your first job</h3>
                <p className="text-sm text-muted-foreground">
                  Schedule a cleaning job to see it in action
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jobLocation">Job Location *</Label>
                  <Input
                    id="jobLocation"
                    placeholder="123 Main St, Sydney NSW 2000"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobDate">Date *</Label>
                    <Input
                      id="jobDate"
                      type="date"
                      value={jobDate}
                      onChange={(e) => setJobDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTime">Time</Label>
                    <Input
                      id="jobTime"
                      type="time"
                      value={jobTime}
                      onChange={(e) => setJobTime(e.target.value)}
                    />
                  </div>
                </div>

                {createdClientId && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Client:</span>{" "}
                      <span className="font-medium">{clientName}</span>
                    </p>
                    {createdStaffId && (
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">Assigned to:</span>{" "}
                        <span className="font-medium">{staffName}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-2">
              {canSkip && (
                <Button variant="outline" onClick={handleSkip} disabled={isSubmitting}>
                  Skip
                </Button>
              )}

              <Button onClick={handleNext} disabled={isSubmitting}>
                {isSubmitting ? (
                  "Saving..."
                ) : currentStep === 4 ? (
                  <>
                    Complete Setup
                    <PulcrixLogo variant="icon" size="sm" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
