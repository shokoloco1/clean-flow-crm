import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Camera,
  Play,
  Square,
  ExternalLink,
  CheckSquare,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  checklist: string[];
  start_time: string | null;
  end_time: string | null;
  photo_urls: string[];
  clients: { name: string } | null;
}

interface JobDetailViewProps {
  job: Job;
  onBack: () => void;
  onUpdate: () => void;
}

export default function JobDetailView({ job, onBack, onUpdate }: JobDetailViewProps) {
  const [currentJob, setCurrentJob] = useState(job);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStartJob = async () => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("jobs")
      .update({ 
        status: "in_progress", 
        start_time: new Date().toISOString() 
      })
      .eq("id", currentJob.id);

    if (error) {
      toast.error("Failed to start job");
    } else {
      setCurrentJob({ 
        ...currentJob, 
        status: "in_progress", 
        start_time: new Date().toISOString() 
      });
      toast.success("Job started!");
      onUpdate();
    }
    setIsUpdating(false);
  };

  const handleCompleteJob = async () => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("jobs")
      .update({ 
        status: "completed", 
        end_time: new Date().toISOString() 
      })
      .eq("id", currentJob.id);

    if (error) {
      toast.error("Failed to complete job");
    } else {
      setCurrentJob({ 
        ...currentJob, 
        status: "completed", 
        end_time: new Date().toISOString() 
      });
      toast.success("Job completed! Great work!");
      onUpdate();
    }
    setIsUpdating(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    // For demo purposes, we'll simulate upload
    // In production, this would upload to Supabase Storage
    const newPhotoUrls = [...(currentJob.photo_urls || [])];
    
    for (const file of Array.from(files)) {
      // Create a local URL for preview
      const localUrl = URL.createObjectURL(file);
      newPhotoUrls.push(localUrl);
    }

    const { error } = await supabase
      .from("jobs")
      .update({ photo_urls: newPhotoUrls })
      .eq("id", currentJob.id);

    if (error) {
      toast.error("Failed to upload photos");
    } else {
      setCurrentJob({ ...currentJob, photo_urls: newPhotoUrls });
      toast.success(`${files.length} photo(s) uploaded!`);
    }
    
    setIsUploading(false);
  };

  const openInMaps = () => {
    const encodedAddress = encodeURIComponent(currentJob.location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
  };

  const checklist = Array.isArray(currentJob.checklist) ? currentJob.checklist : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {currentJob.clients?.name || "Job Details"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(currentJob.scheduled_date), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Location Card */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Location</span>
                </div>
                <p className="text-muted-foreground ml-7">{currentJob.location}</p>
              </div>
              <Button variant="outline" size="sm" onClick={openInMaps}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Maps
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Card */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">Schedule</span>
            </div>
            <div className="ml-7 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Scheduled Time:</span>
                <span className="font-medium text-foreground">{currentJob.scheduled_time}</span>
              </div>
              {currentJob.start_time && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Started At:</span>
                  <span className="font-medium text-success">
                    {format(new Date(currentJob.start_time), "h:mm a")}
                  </span>
                </div>
              )}
              {currentJob.end_time && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed At:</span>
                  <span className="font-medium text-success">
                    {format(new Date(currentJob.end_time), "h:mm a")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist Card */}
        {checklist.length > 0 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-5 w-5 text-primary" />
                Task Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {checklist.map((task, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{task}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos Section */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-5 w-5 text-primary" />
              Before & After Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Photo Grid */}
            {currentJob.photo_urls && currentJob.photo_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {currentJob.photo_urls.map((url, index) => (
                  <div key={index} className="aspect-square rounded-lg bg-muted overflow-hidden">
                    <img 
                      src={url} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Button */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploading || currentJob.status === "completed"}
              />
              <Button 
                variant="outline" 
                className="w-full" 
                disabled={isUploading || currentJob.status === "completed"}
                asChild
              >
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photos
                    </>
                  )}
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="pt-4 space-y-3">
          {currentJob.status === "pending" && (
            <Button 
              className="w-full h-14 text-lg"
              onClick={handleStartJob}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Play className="h-5 w-5 mr-2" />
              )}
              Start Job
            </Button>
          )}

          {currentJob.status === "in_progress" && (
            <Button 
              className="w-full h-14 text-lg bg-success hover:bg-success/90"
              onClick={handleCompleteJob}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              Complete Job
            </Button>
          )}

          {currentJob.status === "completed" && (
            <div className="flex items-center justify-center gap-2 py-4 text-success">
              <CheckCircle2 className="h-6 w-6" />
              <span className="text-lg font-semibold">Job Completed</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
