import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Clock, Image as ImageIcon, FileText, Loader2, History,
  Phone, MessageSquare, User, CheckCircle, Circle,
  Receipt, Mail, Send
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateSingleJobPDF } from "@/lib/pdfUtils";
import { JobTimeline } from "@/components/JobTimeline";
import { cn } from "@/lib/utils";
import { useQuickInvoice } from "@/hooks/useQuickInvoice";
import { useInvoiceEmail } from "@/hooks/useInvoiceEmail";
import { formatAUD } from "@/lib/australian";
import type { Job } from "./JobsList";

export interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  created_at: string;
}

interface ClientInfo {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface JobDetailDialogProps {
  job: Job | null;
  photos: JobPhoto[];
  onClose: () => void;
}

const STATUS_STEPS = [
  { key: "created", label: "Created", icon: Circle },
  { key: "pending", label: "Assigned", icon: User },
  { key: "in_progress", label: "In Progress", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

function calculateDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function getStatusIndex(status: string): number {
  if (status === "completed") return 3;
  if (status === "in_progress") return 2;
  if (status === "pending") return 1;
  return 0;
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "in_progress": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "cancelled": return "bg-red-500/10 text-red-600 border-red-500/20";
    default: return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  }
}

export function JobDetailDialog({ job, photos, onClose }: JobDetailDialogProps) {
  const navigate = useNavigate();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ completed_at: string | null; task_name: string }[]>([]);
  const [alerts, setAlerts] = useState<{ created_at: string; message: string; is_resolved: boolean }[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<{ id: string; total: number } | null>(null);

  const { generateInvoiceFromJob, isGenerating: isGeneratingInvoice } = useQuickInvoice();
  const { sendInvoiceEmail, isSending: isSendingEmail } = useInvoiceEmail();

  useEffect(() => {
    if (job) {
      fetchTimelineData();
      fetchClientInfo();
      setGeneratedInvoice(null);
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

  const fetchClientInfo = async () => {
    if (!job) return;
    
    // Fetch client info via the job
    const { data: jobData } = await supabase
      .from('jobs')
      .select('client_id, clients(id, name, phone, email, address)')
      .eq('id', job.id)
      .single();
    
    if (jobData?.clients) {
      setClientInfo(jobData.clients as unknown as ClientInfo);
    }
  };

  const handleCall = () => {
    if (clientInfo?.phone) {
      window.open(`tel:${clientInfo.phone}`, "_self");
      toast.success(`Calling ${clientInfo.phone}`);
    }
  };

  const handleSMS = () => {
    if (clientInfo?.phone) {
      window.open(`sms:${clientInfo.phone}`, "_self");
    }
  };

  const handleEmail = () => {
    if (clientInfo?.email) {
      window.open(`mailto:${clientInfo.email}`, "_blank");
    }
  };

  const handleCreateInvoice = async () => {
    if (!job) return;
    
    const result = await generateInvoiceFromJob(job.id);
    if (result) {
      setGeneratedInvoice({ id: result.invoiceId, total: result.total });
    }
  };

  const handleSendInvoice = async () => {
    if (!generatedInvoice) return;
    
    const success = await sendInvoiceEmail(generatedInvoice.id);
    if (success) {
      toast.success("Invoice sent to client!");
    }
  };

  const handleViewInvoice = () => {
    if (!generatedInvoice) return;
    onClose();
    navigate(`/admin/invoices?view=${generatedInvoice.id}`);
  };

  const handleDownloadPDF = async () => {
    if (!job) return;
    setIsGeneratingPDF(true);
    try {
      const { data: items } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('job_id', job.id)
        .order('sort_order');

      const doc = generateSingleJobPDF(
        job as Parameters<typeof generateSingleJobPDF>[0],
        photos,
        items || []
      );
      
      doc.save(`job_${job.clients?.name || 'job'}_${job.scheduled_date}.pdf`);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!job) return null;

  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');
  const currentStatusIndex = getStatusIndex(job.status);

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{job.clients?.name || "Job Details"}</span>
            <Badge variant="outline" className={getStatusColor(job.status)}>
              {job.status.replace("_", " ")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Visual Status Timeline */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, index) => {
              const isActive = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const StepIcon = step.icon;
              
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isActive 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "bg-muted border-muted-foreground/30 text-muted-foreground",
                      isCurrent && "ring-4 ring-primary/20"
                    )}>
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "text-xs mt-2 font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {index < STATUS_STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-1 mx-2 rounded-full",
                      index < currentStatusIndex ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">
              <ImageIcon className="h-4 w-4 mr-2" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <History className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Client Info Card */}
            {clientInfo && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{clientInfo.name}</p>
                      {clientInfo.phone && (
                        <p className="text-sm text-muted-foreground">{clientInfo.phone}</p>
                      )}
                      {clientInfo.email && (
                        <p className="text-sm text-muted-foreground">{clientInfo.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {clientInfo.phone && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={handleCall}
                          title="Call"
                        >
                          <Phone className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={handleSMS}
                          title="SMS"
                        >
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        </Button>
                      </>
                    )}
                    {clientInfo.email && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleEmail}
                        title="Email"
                      >
                        <Mail className="h-4 w-4 text-orange-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                      <p className="font-medium text-green-600">
                        {format(new Date(job.start_time), "h:mm a")}
                      </p>
                    </div>
                  )}
                  {job.end_time && (
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="font-medium text-green-600">
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

            {/* Notes */}
            {job.notes && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Notes</p>
                <p>{job.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-4 mt-4">
            {photos.length > 0 ? (
              <div className="space-y-6">
                {beforePhotos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                        Before ({beforePhotos.length})
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {beforePhotos.map((photo) => (
                        <a 
                          key={photo.id} 
                          href={photo.photo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80 transition-opacity ring-2 ring-orange-500/20"
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
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        After ({afterPhotos.length})
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {afterPhotos.map((photo) => (
                        <a 
                          key={photo.id} 
                          href={photo.photo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80 transition-opacity ring-2 ring-green-500/20"
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
            ) : (
              <div className="text-center py-12 bg-muted/50 rounded-lg">
                <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No photos yet</p>
                <p className="text-sm text-muted-foreground">Staff will upload before/after photos during the job</p>
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
        <Separator className="my-4" />
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
          
          {job.status === "completed" && !generatedInvoice && (
            <Button 
              onClick={handleCreateInvoice}
              disabled={isGeneratingInvoice}
            >
              {isGeneratingInvoice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate Invoice
                </>
              )}
            </Button>
          )}

          {generatedInvoice && (
            <div className="flex gap-2 items-center">
              <Badge variant="secondary" className="h-9 px-3">
                Invoice: {formatAUD(generatedInvoice.total)}
              </Badge>
              <Button 
                variant="outline"
                onClick={handleViewInvoice}
              >
                View
              </Button>
              {clientInfo?.email && (
                <Button 
                  onClick={handleSendInvoice}
                  disabled={isSendingEmail}
                  className="bg-primary"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to Client
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
