import { type StaffMember } from "@/lib/queries/staff";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, AlertCircle, CheckCircle, Briefcase, Award, UserCheck, UserX } from "lucide-react";

const SKILL_OPTIONS = [
  "Residential Cleaning",
  "Commercial Cleaning",
  "Deep Cleaning",
  "Window Cleaning",
  "Carpet Cleaning",
  "Industrial Kitchen Cleaning",
  "Chemical Handling",
  "Post-Construction Cleaning",
];

const CERTIFICATION_OPTIONS = [
  "Hazardous Chemical Handling",
  "First Aid",
  "Occupational Safety",
  "Hospital Cleaning",
  "Green Cleaning",
];

interface StaffProfileFormProps {
  editForm: Partial<StaffMember>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<StaffMember>>>;
  onSave: () => void;
  isSaving: boolean;
}

export function StaffProfileForm({
  editForm,
  setEditForm,
  onSave,
  isSaving,
}: StaffProfileFormProps) {
  const toggleSkill = (skill: string) => {
    const currentSkills = editForm.skills || [];
    if (currentSkills.includes(skill)) {
      setEditForm({ ...editForm, skills: currentSkills.filter((s) => s !== skill) });
    } else {
      setEditForm({ ...editForm, skills: [...currentSkills, skill] });
    }
  };

  const toggleCertification = (cert: string) => {
    const currentCerts = editForm.certifications || [];
    if (currentCerts.includes(cert)) {
      setEditForm({ ...editForm, certifications: currentCerts.filter((c) => c !== cert) });
    } else {
      setEditForm({ ...editForm, certifications: [...currentCerts, cert] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Toggle */}
      <Card
        className={
          editForm.is_active
            ? "border-green-500/50 bg-green-500/5"
            : "border-orange-500/50 bg-orange-500/5"
        }
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {editForm.is_active ? (
                <UserCheck className="h-5 w-5 text-green-500" />
              ) : (
                <UserX className="h-5 w-5 text-orange-500" />
              )}
              <div>
                <p className="font-medium">Employee Status</p>
                <p className="text-sm text-muted-foreground">
                  {editForm.is_active ? "Can receive jobs" : "Cannot receive jobs"}
                </p>
              </div>
            </div>
            <Switch
              checked={editForm.is_active}
              onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold">
          <User className="h-4 w-4" />
          Basic Information
        </h4>

        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input
            value={editForm.full_name || ""}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={editForm.phone || ""}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            placeholder="+61 4XX XXX XXX"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Hire Date</Label>
            <Input
              type="date"
              value={editForm.hire_date || ""}
              onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Hourly Rate (AUD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                className="pl-7"
                value={editForm.hourly_rate || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, hourly_rate: parseFloat(e.target.value) || null })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          Emergency Contact
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={editForm.emergency_contact_name || ""}
              onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
              placeholder="Contact name"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={editForm.emergency_contact_phone || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, emergency_contact_phone: e.target.value })
              }
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Skills */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold">
          <Briefcase className="h-4 w-4" />
          Skills
        </h4>
        <div className="flex flex-wrap gap-2">
          {SKILL_OPTIONS.map((skill) => (
            <Badge
              key={skill}
              variant={editForm.skills?.includes(skill) ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => toggleSkill(skill)}
            >
              {editForm.skills?.includes(skill) && <CheckCircle className="mr-1 h-3 w-3" />}
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Certifications */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold">
          <Award className="h-4 w-4" />
          Certifications
        </h4>
        <div className="flex flex-wrap gap-2">
          {CERTIFICATION_OPTIONS.map((cert) => (
            <Badge
              key={cert}
              variant={editForm.certifications?.includes(cert) ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => toggleCertification(cert)}
            >
              {editForm.certifications?.includes(cert) && <CheckCircle className="mr-1 h-3 w-3" />}
              {cert}
            </Badge>
          ))}
        </div>
      </div>

      <Button onClick={onSave} className="mt-6 w-full" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
