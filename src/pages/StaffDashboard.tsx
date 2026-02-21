import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LogOut, Calendar, Smile, ChevronDown, Clock, Loader2, Timer } from "lucide-react";
import { PulcrixLogo } from "@/components/PulcrixLogo";
import { format } from "date-fns";
import JobDetailView from "@/components/JobDetailView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useJobStatusChange } from "@/hooks/useJobStatusChange";
import { NextJobCard } from "@/components/staff/NextJobCard";
import { TodayJobsList } from "@/components/staff/TodayJobsList";
import { StaffAvailabilityCalendar } from "@/components/staff/StaffAvailabilityCalendar";
import { LanguageSwitcher } from "@/components/staff/LanguageSwitcher";
import { queryKeys } from "@/lib/queries/keys";
import {
  fetchMyJobs,
  fetchChecklistProgress,
  type StaffProperty,
} from "@/lib/queries/staff-dashboard";

interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  checklist: string[];
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  property_id: string | null;
  clients: { name: string } | null;
  properties: StaffProperty | null;
}

export default function StaffDashboard() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { data: jobsRaw = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.staffDashboard.myJobs(user?.id ?? ""),
    queryFn: () => fetchMyJobs(user?.id ?? ""),
    enabled: !!user?.id,
  });

  const jobs = jobsRaw as Job[];

  // Get in-progress job IDs for checklist progress query
  const inProgressJobIds = useMemo(
    () => jobs.filter((j) => j.status === "in_progress").map((j) => j.id),
    [jobs],
  );

  const { data: checklistProgressMap = {} } = useQuery({
    queryKey: queryKeys.staffDashboard.checklistProgress(user?.id ?? ""),
    queryFn: () => fetchChecklistProgress(inProgressJobIds),
    enabled: inProgressJobIds.length > 0,
  });

  const invalidateMyJobs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.staffDashboard.myJobs(user?.id ?? "") });
  }, [queryClient, user?.id]);

  const { updatingJobId, advanceStatus } = useJobStatusChange(invalidateMyJobs);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
  };

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("my-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `assigned_staff_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.staffDashboard.myJobs(user.id) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Group jobs by date
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayJobs = useMemo(
    () => jobs.filter((j) => j.scheduled_date === todayStr),
    [jobs, todayStr],
  );
  const upcomingJobs = useMemo(
    () => jobs.filter((j) => j.scheduled_date !== todayStr),
    [jobs, todayStr],
  );

  if (selectedJob) {
    return (
      <JobDetailView
        job={selectedJob}
        onBack={() => {
          setSelectedJob(null);
          invalidateMyJobs();
        }}
        onUpdate={invalidateMyJobs}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="safe-area-inset-top sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <PulcrixLogo />
            <div>
              <h1 className="text-xl font-bold text-foreground">Pulcrix</h1>
              <p className="text-sm text-muted-foreground">{t("my_jobs")}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/staff/time-history")}
              className="h-12 w-12"
              title={t("my_hours")}
            >
              <Timer className="h-5 w-5" />
            </Button>
            <LanguageSwitcher />
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="h-12 w-12"
            >
              {isSigningOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-24">
        {/* Date Header */}
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-semibold text-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">{t("loading_jobs")}</p>
          </div>
        ) : todayJobs.length === 0 && upcomingJobs.length === 0 ? (
          /* Empty State - Friendly message */
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <Smile className="h-10 w-10 text-success" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-foreground">🎉 {t("day_off")}</h3>
              <p className="text-lg text-muted-foreground">{t("no_jobs_scheduled")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Next Job - Hero Card */}
            {todayJobs.length > 0 && (
              <>
                <NextJobCard
                  job={todayJobs.find((j) => j.status !== "completed") || todayJobs[0]}
                  isUpdating={
                    updatingJobId ===
                    (todayJobs.find((j) => j.status !== "completed") || todayJobs[0]).id
                  }
                  onStartComplete={() => {
                    const nextJob = todayJobs.find((j) => j.status !== "completed") || todayJobs[0];
                    // Use new workflow for pending jobs, legacy flow for in_progress
                    if (nextJob.status === "pending") {
                      navigate(`/staff/job/${nextJob.id}/start`);
                    } else {
                      advanceStatus(nextJob.id, nextJob.status);
                    }
                  }}
                  onViewDetails={() => {
                    const nextJob = todayJobs.find((j) => j.status !== "completed") || todayJobs[0];
                    setSelectedJob(nextJob);
                  }}
                  checklistProgress={
                    checklistProgressMap[
                      (todayJobs.find((j) => j.status !== "completed") || todayJobs[0]).id
                    ] || null
                  }
                />

                {/* Today's Jobs List */}
                {todayJobs.length > 1 && (
                  <TodayJobsList
                    jobs={todayJobs}
                    currentJobId={
                      (todayJobs.find((j) => j.status !== "completed") || todayJobs[0]).id
                    }
                    onSelectJob={(job) => setSelectedJob(job)}
                  />
                )}
              </>
            )}

            {/* Upcoming Jobs (simplified) */}
            {upcomingJobs.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  <ChevronDown className="h-4 w-4" />
                  📅 {t("upcoming")} ({upcomingJobs.length})
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2">
                    {upcomingJobs.slice(0, 3).map((job) => (
                      <Card
                        key={job.id}
                        className="cursor-pointer opacity-70 transition-all active:scale-[0.98]"
                        onClick={() => setSelectedJob(job)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="mb-0.5 text-xs text-muted-foreground">
                                {format(new Date(job.scheduled_date), "EEE, MMM d")} •{" "}
                                {job.scheduled_time}
                              </p>
                              <p className="truncate font-medium text-foreground">
                                {job.clients?.name || t("unknown_client")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {upcomingJobs.length > 3 && (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        +{upcomingJobs.length - 3} more upcoming jobs
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Staff Availability Calendar */}
            <Collapsible className="pt-4">
              <CollapsibleTrigger className="mb-2 flex w-full items-center gap-2 px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                <ChevronDown className="h-4 w-4" />
                <Clock className="h-4 w-4" />
                {t("my_availability")}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <StaffAvailabilityCalendar compact />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </main>
    </div>
  );
}
