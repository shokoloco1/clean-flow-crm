import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle2, 
  Clock, 
  Camera, 
  ListChecks, 
  Loader2,
  PartyPopper,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface JobData {
  id: string;
  location: string;
  start_time: string | null;
  client?: {
    name: string;
  } | null;
}

interface JobStats {
  photosCount: number;
  checklistTotal: number;
  checklistCompleted: number;
}

const ISSUE_OPTIONS = [
  { id: "no_issues", labelKey: "no_issues" },
  { id: "missing_supplies", labelKey: "missing_supplies" },
  { id: "property_damage", labelKey: "property_damage" },
  { id: "access_issues", labelKey: "access_issues" },
  { id: "other", labelKey: "other_issue" },
];

export default function JobCompletePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [job, setJob] = useState<JobData | null>(null);
  const [stats, setStats] = useState<JobStats>({ photosCount: 0, checklistTotal: 0, checklistCompleted: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [staffNotes, setStaffNotes] = useState("");
  const [selectedIssues, setSelectedIssues] = useState<string[]>(["no_issues"]);

  useEffect(() => {
    if (id) {
      fetchJobData();
    }
  }, [id]);

  const fetchJobData = async () => {
    if (!id) return;

    // Fetch job, photos count, and checklist stats in parallel
    const [jobResult, photosResult, checklistResult] = await Promise.all([
      supabase
        .from("jobs")
        .select(`id, location, start_time, client:clients(name)`)
        .eq("id", id)
        .single(),
      supabase
        .from("job_photos")
        .select("id", { count: "exact" })
        .eq("job_id", id),
      supabase
        .from("checklist_items")
        .select("status")
        .eq("job_id", id)
    ]);

    if (jobResult.error) {
      toast.error("Error loading job");
      navigate("/staff");
      return;
    }

    const jobData: JobData = {
      id: jobResult.data.id,
      location: jobResult.data.location,
      start_time: jobResult.data.start_time,
      client: Array.isArray(jobResult.data.client) ? jobResult.data.client[0] : jobResult.data.client
    };

    const checklistItems = checklistResult.data || [];
    const completedItems = checklistItems.filter(item => 
      item.status === 'done' || item.status === 'na'
    ).length;

    setJob(jobData);
    setStats({
      photosCount: photosResult.count || 0,
      checklistTotal: checklistItems.length,
      checklistCompleted: completedItems
    });
    setLoading(false);
  };

  const calculateDuration = (): { minutes: number; formatted: string } => {
    if (!job?.start_time) return { minutes: 0, formatted: "0:00" };
    
    const start = new Date(job.start_time);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return {
      minutes,
      formatted: `${hours}:${mins.toString().padStart(2, '0')}`
    };
  };

  const handleIssueToggle = (issueId: string) => {
    if (issueId === "no_issues") {
      setSelectedIssues(["no_issues"]);
    } else {
      setSelectedIssues(prev => {
        const withoutNoIssues = prev.filter(i => i !== "no_issues");
        if (prev.includes(issueId)) {
          const newIssues = withoutNoIssues.filter(i => i !== issueId);
          return newIssues.length === 0 ? ["no_issues"] : newIssues;
        } else {
          return [...withoutNoIssues, issueId];
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (!id || !job) return;
    
    setSubmitting(true);
    
    const { minutes } = calculateDuration();
    const issueReport = selectedIssues.includes("no_issues") 
      ? null 
      : selectedIssues.join(", ");

    // Update job to completed
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        status: "completed",
        end_time: new Date().toISOString(),
        staff_notes: staffNotes || null,
        issue_reported: issueReport,
        actual_duration_minutes: minutes
      })
      .eq("id", id);

    if (updateError) {
      toast.error(t("error_completing"));
      setSubmitting(false);
      return;
    }

    // Try to capture checkout GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await supabase
            .from("jobs")
            .update({
              checkout_lat: position.coords.latitude,
              checkout_lng: position.coords.longitude
            })
            .eq("id", id);
        },
        () => {
          // GPS error - continue anyway
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    toast.success(t("job_completed"));
    navigate("/staff");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const duration = calculateDuration();
  const checklistPercentage = stats.checklistTotal > 0 
    ? Math.round((stats.checklistCompleted / stats.checklistTotal) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Success Header */}
      <div className="bg-success/10 border-b border-success/20 p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-3">
          <PartyPopper className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("great_work")}</h1>
        <p className="text-muted-foreground mt-1">{job.client?.name || job.location}</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Job Summary */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("job_summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{duration.formatted}</p>
                <p className="text-xs text-muted-foreground">{t("total_time")}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <ListChecks className="h-5 w-5 text-success mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{checklistPercentage}%</p>
                <p className="text-xs text-muted-foreground">{t("tasks_completed")}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Camera className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{stats.photosCount}</p>
                <p className="text-xs text-muted-foreground">{t("photos_taken")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("additional_notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder={t("notes")}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Issue Reporting */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {t("report_issues")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ISSUE_OPTIONS.map((option) => (
              <div key={option.id} className="flex items-center space-x-3">
                <Checkbox
                  id={option.id}
                  checked={selectedIssues.includes(option.id)}
                  onCheckedChange={() => handleIssueToggle(option.id)}
                />
                <Label 
                  htmlFor={option.id} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {t(option.labelKey as any)}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 text-lg font-semibold gap-2 bg-success hover:bg-success/90"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("sending_report")}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              {t("confirm_and_send")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
