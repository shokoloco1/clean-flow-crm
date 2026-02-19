import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { fetchStaffPaginated, type StaffMember } from "@/lib/queries/staff";
import { DEFAULT_PAGE_SIZE } from "@/lib/queries/pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStaffMetrics } from "@/hooks/useStaffMetrics";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InviteStaffDialog } from "@/components/staff/InviteStaffDialog";
import { StaffDetailSheet } from "@/components/staff/StaffDetailSheet";
import { PaginatedControls } from "@/components/PaginatedControls";
import {
  ArrowLeft,
  Users,
  Plus,
  Phone,
  Mail,
  Star,
  Search,
  UserCheck,
  UserX,
  UserMinus,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";

export default function StaffManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getMetrics, totalJobsCompleted, avgRating } = useStaffMetrics();

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const { data: staffResult, isLoading } = useQuery({
    queryKey: queryKeys.staff.list({ page, search: debouncedSearch, status: statusFilter }),
    queryFn: () =>
      fetchStaffPaginated({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: debouncedSearch,
        status: statusFilter,
      }),
  });
  const staffList = staffResult?.data ?? [];
  const totalCount = staffResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / DEFAULT_PAGE_SIZE);
  const activeStaff = staffList.filter((s) => s.is_active).length;

  const openStaffDetails = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsSheetOpen(true);
  };

  const handleQuickToggleStatus = async (staff: StaffMember) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !staff.is_active })
        .eq("id", staff.id);
      if (error) throw error;
      toast({
        title: staff.is_active ? "Staff deactivated" : "Staff activated",
        description: `${staff.full_name} has been ${staff.is_active ? "deactivated" : "activated"}.`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all() });
    } catch (error: any) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("delete-staff", {
        body: { staffUserId: staffToDelete.user_id },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: "Staff member deleted",
        description: `${staffToDelete.full_name} has been permanently deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all() });
      setStaffToDelete(null);
    } catch (error: any) {
      toast({ title: "Error deleting staff", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">Staff Management</h1>
                <p className="text-xs text-muted-foreground">Manage your team members</p>
              </div>
              <h1 className="text-lg font-bold sm:hidden">Staff</h1>
            </div>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Employee</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-full bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">Total Staff</p>
                  <p className="text-xl font-bold sm:text-2xl">{totalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-full bg-green-500/10 p-2">
                  <UserCheck className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">Active</p>
                  <p className="text-xl font-bold sm:text-2xl">{activeStaff}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-full bg-blue-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">Jobs</p>
                  <p className="text-xl font-bold sm:text-2xl">{totalJobsCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-full bg-yellow-500/10 p-2">
                  <Star className="h-4 w-4 text-yellow-500 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">Avg Rating</p>
                  <p className="text-xl font-bold sm:text-2xl">
                    {avgRating ? avgRating.toFixed(1) : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="flex-1 sm:flex-none"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                  className="flex-1 gap-1 sm:flex-none"
                >
                  <UserCheck className="h-3 w-3" />
                  Active
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                  className="flex-1 gap-1 sm:flex-none"
                >
                  <UserX className="h-3 w-3" />
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {totalCount} employee{totalCount !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading employees...</div>
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">
                  {debouncedSearch || statusFilter !== "all"
                    ? "No results found"
                    : "No employees registered"}
                </h3>
                <p className="mb-4 text-muted-foreground">
                  {debouncedSearch || statusFilter !== "all"
                    ? "Try different search terms or filters"
                    : "Add your first employee to start managing your team"}
                </p>
                {!debouncedSearch && statusFilter === "all" && (
                  <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Employee
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((staff) => {
                  const metrics = getMetrics(staff.user_id);
                  return (
                    <div
                      key={staff.id}
                      className="group flex cursor-pointer flex-col justify-between rounded-lg border p-4 transition-all hover:bg-muted/50 hover:shadow-sm sm:flex-row sm:items-center"
                      onClick={() => openStaffDetails(staff)}
                    >
                      <div className="mb-3 flex items-center gap-3 sm:mb-0 sm:gap-4">
                        <Avatar className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                            {staff.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-medium">{staff.full_name}</h3>
                            <Badge
                              variant={staff.is_active ? "default" : "secondary"}
                              className="shrink-0"
                            >
                              {staff.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{staff.email}</span>
                            </span>
                            {staff.phone && (
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{staff.phone}</span>
                              </span>
                            )}
                          </div>
                          {staff.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                              {staff.skills.slice(0, 2).map((skill) => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {staff.skills.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{staff.skills.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pl-13 flex items-center justify-between gap-4 sm:justify-end sm:gap-6 sm:pl-0">
                        <div className="flex items-center gap-4 text-xs sm:gap-6 sm:text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground">Jobs</p>
                            <p className="font-semibold">{metrics.jobs_completed}</p>
                          </div>
                          <div className="hidden text-center sm:block">
                            <p className="text-muted-foreground">Hours</p>
                            <p className="font-semibold">{metrics.total_hours.toFixed(0)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Rating</p>
                            <p className="flex items-center justify-center gap-1 font-semibold">
                              {metrics.avg_quality_score ? (
                                <>
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                  {metrics.avg_quality_score.toFixed(1)}
                                </>
                              ) : (
                                "-"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStaffDetails(staff);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openStaffDetails(staff);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickToggleStatus(staff);
                                }}
                              >
                                {staff.is_active ? (
                                  <>
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStaffToDelete(staff);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <PaginatedControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setIsInviteDialogOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform active:scale-95 md:hidden"
        aria-label="Add Employee"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Staff Detail Sheet */}
      <StaffDetailSheet
        staff={selectedStaff}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        getMetrics={getMetrics}
      />

      {/* Invite Staff Dialog */}
      <InviteStaffDialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!staffToDelete} onOpenChange={() => setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              This action <strong>cannot be undone</strong>. It will permanently delete{" "}
              <strong>{staffToDelete?.full_name}</strong>'s account, profile, and all access. Their
              completed job history will be preserved, but they will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteStaff}
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
