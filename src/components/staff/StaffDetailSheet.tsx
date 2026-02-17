import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import { type StaffMember } from "@/lib/queries/staff";
import { type StaffMetrics } from "@/hooks/useStaffMetrics";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { StaffProfileForm } from "./StaffProfileForm";
import { StaffAvailabilityEditor } from "./StaffAvailabilityEditor";
import { StaffMetricsPanel } from "./StaffMetricsPanel";
import { User, Clock, TrendingUp, Mail } from "lucide-react";

interface StaffDetailSheetProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  getMetrics: (userId: string) => StaffMetrics;
}

export function StaffDetailSheet({
  staff,
  isOpen,
  onOpenChange,
  getMetrics,
}: StaffDetailSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editForm, setEditForm] = useState<Partial<StaffMember>>({});

  useEffect(() => {
    if (staff) setEditForm(staff);
  }, [staff]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<StaffMember>) => {
      if (!staff) throw new Error("No staff selected");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: updates.full_name,
          phone: updates.phone,
          emergency_contact_name: updates.emergency_contact_name,
          emergency_contact_phone: updates.emergency_contact_phone,
          skills: updates.skills,
          certifications: updates.certifications,
          hire_date: updates.hire_date,
          hourly_rate: updates.hourly_rate,
          is_active: updates.is_active,
        })
        .eq("id", staff.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all() });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-xl">
        <SheetHeader className="p-6 pb-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                {staff?.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{staff?.full_name}</SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {staff?.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-6">
            {staff && (
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-3">
                  <TabsTrigger value="profile" className="text-xs sm:text-sm">
                    <User className="mr-1 h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Profile</span>
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="text-xs sm:text-sm">
                    <Clock className="mr-1 h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Schedule</span>
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="text-xs sm:text-sm">
                    <TrendingUp className="mr-1 h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Metrics</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-0">
                  <StaffProfileForm
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onSave={() => updateProfileMutation.mutate(editForm)}
                    isSaving={updateProfileMutation.isPending}
                  />
                </TabsContent>

                <TabsContent value="availability" className="mt-0">
                  <StaffAvailabilityEditor staffUserId={staff.user_id} />
                </TabsContent>

                <TabsContent value="metrics" className="mt-0">
                  <StaffMetricsPanel staff={staff} metrics={getMetrics(staff.user_id)} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
