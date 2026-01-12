import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Image as ImageIcon, FileText, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateSingleJobPDF } from "@/lib/pdfUtils";
import { JobTimeline } from "@/components/JobTimeline";
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ completed_at: string | null; task_name: string }[]>([]);
  const [alerts, setAlerts] = useState<{ created_at: string; message: string; is_resolved: boolean }[]>([]);

  useEffect(() => {
    if (job) {
      fetchTimelineData();
    }
  }, [job]);

  const fetchTimelineData = async () => {
    if (!job) return;

    const [checklistRes, alertsRes] = await Promise.all([
      supabase
        .from('checklist_items')
        .select('completed_at, task_name')
        .eq('job_id', job.id),
      supabase
        .from('job_alerts')
        .select('created_at, message, is_resolved')
        .eq('job_id', job.id)
    ]);

    setChecklistItems(checklistRes.data || []);
    setAlerts(alertsRes.data || []);
  };

  if (!job) return null;

  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Fetch checklist items for this job
      const { data: checklistItems } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('job_id', job.id)
        .order('sort_order');

      const doc = generateSingleJobPDF(
        job as Parameters<typeof generateSingleJobPDF>[0],
        photos,
        checklistItems || []
      );
      
      doc.save(`trabajo_${job.clients?.name || 'job'}_${job.scheduled_date}.pdf`);
      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="timeline">
              <History className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Ubicación</p>
                <p className="font-medium text-foreground">{job.location}</p>
              </div>
            </div>

            {/* Time Info */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Horario y Duración</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Programado</p>
                    <p className="font-medium text-foreground">
                      {format(new Date(job.scheduled_date), "MMM d")} a las {job.scheduled_time}
                    </p>
                  </div>
                  {job.start_time && (
                    <div>
                      <p className="text-xs text-muted-foreground">Iniciado</p>
                      <p className="font-medium text-success">
                        {format(new Date(job.start_time), "h:mm a")}
                      </p>
                    </div>
                  )}
                  {job.end_time && (
                    <div>
                      <p className="text-xs text-muted-foreground">Completado</p>
                      <p className="font-medium text-success">
                        {format(new Date(job.end_time), "h:mm a")}
                      </p>
                    </div>
                  )}
                  {job.start_time && job.end_time && (
                    <div>
                      <p className="text-xs text-muted-foreground">Duración</p>
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
                  <p className="font-medium text-foreground">Fotos de Evidencia ({photos.length})</p>
                </div>
                
                {beforePhotos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Antes ({beforePhotos.length})</p>
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
                    <p className="text-sm text-muted-foreground mb-2">Después ({afterPhotos.length})</p>
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
                <p className="text-muted-foreground">No hay fotos para este trabajo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <JobTimeline
              job={{
                id: job.id,
                created_at: job.created_at,
                start_time: job.start_time,
                end_time: job.end_time,
                status: job.status,
                scheduled_date: job.scheduled_date,
                scheduled_time: job.scheduled_time,
              }}
              photos={photos.map(p => ({ created_at: p.created_at, photo_type: p.photo_type }))}
              checklistItems={checklistItems}
              alerts={alerts}
            />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Descargar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
