import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Camera, CheckSquare, Loader2 } from "lucide-react";
import { JobTimer } from "@/components/staff/JobTimer";
import AdvancedChecklist from "@/components/AdvancedChecklist";
import { toast } from "sonner";

interface JobData {
  id: string;
  location: string;
  start_time: string | null;
  checklist: string[] | null;
  property?: {
    estimated_hours: number | null;
  } | null;
  client?: {
    name: string;
  } | null;
}

export default function JobChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklistProgress, setChecklistProgress] = useState(0);

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  const fetchJob = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        location,
        start_time,
        checklist,
        property:properties(estimated_hours),
        client:clients(name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Error loading job");
      navigate("/staff");
      return;
    }

    // Handle the nested objects properly
    const jobData: JobData = {
      id: data.id,
      location: data.location,
      start_time: data.start_time,
      checklist: data.checklist as string[] | null,
      property: Array.isArray(data.property) ? data.property[0] : data.property,
      client: Array.isArray(data.client) ? data.client[0] : data.client
    };

    setJob(jobData);
    setLoading(false);
  };

  const handleProgressUpdate = (percentage: number) => {
    setChecklistProgress(percentage);
  };

  const canContinue = checklistProgress >= 80;

  const handleContinue = () => {
    navigate(`/staff/job/${id}/photos-after`);
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

  const startedAt = job.start_time ? new Date(job.start_time) : null;
  const legacyChecklist = Array.isArray(job.checklist) ? job.checklist : [];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/staff/job/${id}/photos-before`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("go_back")}
          </Button>
          
          {startedAt && (
            <JobTimer 
              startedAt={startedAt} 
              estimatedHours={job.property?.estimated_hours ?? undefined}
              compact
            />
          )}
        </div>
        
        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-foreground">{t("checklist")}</span>
            <span className="text-muted-foreground">{checklistProgress}%</span>
          </div>
          <Progress value={checklistProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {checklistProgress < 80 
              ? `${t("tasks_completed")}: ${checklistProgress}% (80% ${t("minimum_photos").replace('3 photos', '')})`
              : "✓ " + t("on_track")
            }
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Job Info Card */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              {job.client?.name || t("unknown_client")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{job.location}</p>
          </CardContent>
        </Card>

        {/* Checklist Component */}
        <AdvancedChecklist
          jobId={job.id}
          jobStatus="in_progress"
          legacyChecklist={legacyChecklist}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full h-14 text-lg font-semibold gap-2"
          size="lg"
        >
          <Camera className="h-5 w-5" />
          {t("photos_after_title")}
        </Button>
        {!canContinue && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            {t("complete_all_photos").replace('photos', 'tasks')} (80%+)
          </p>
        )}
      </div>
    </div>
  );
}
