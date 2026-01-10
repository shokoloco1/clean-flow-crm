import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock, Image as ImageIcon, Download } from "lucide-react";
import { format } from "date-fns";
import type { Job } from "./JobsList";

export interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  created_at: string;
}

interface JobDetailDialogProps {
  job: Job | null;
  photos: JobPhoto[];
  onClose: () => void;
}

function calculateDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-success/10 text-success";
    case "in_progress": return "bg-warning/10 text-warning";
    case "cancelled": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

export function JobDetailDialog({ job, photos, onClose }: JobDetailDialogProps) {
  if (!job) return null;

  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{job.clients?.name || "Job Details"}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
              {job.status.replace("_", " ")}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium text-foreground">{job.location}</p>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Schedule & Duration</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(job.scheduled_date), "MMM d")} at {job.scheduled_time}
                  </p>
                </div>
                {job.start_time && (
                  <div>
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="font-medium text-success">
                      {format(new Date(job.start_time), "h:mm a")}
                    </p>
                  </div>
                )}
                {job.end_time && (
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="font-medium text-success">
                      {format(new Date(job.end_time), "h:mm a")}
                    </p>
                  </div>
                )}
                {job.start_time && job.end_time && (
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-bold text-primary">
                      {calculateDuration(job.start_time, job.end_time)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photos Gallery */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-5 w-5 text-primary" />
                <p className="font-medium text-foreground">Evidence Photos ({photos.length})</p>
              </div>
              
              {beforePhotos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Before ({beforePhotos.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {beforePhotos.map((photo) => (
                      <a 
                        key={photo.id} 
                        href={photo.photo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={photo.photo_url} 
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {afterPhotos.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">After ({afterPhotos.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {afterPhotos.map((photo) => (
                      <a 
                        key={photo.id} 
                        href={photo.photo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={photo.photo_url} 
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {photos.length === 0 && job.status !== 'pending' && (
            <div className="text-center py-6 bg-muted/50 rounded-lg">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No photos uploaded for this job</p>
            </div>
          )}

          {/* Actions */}
          {job.status === 'completed' && (
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
