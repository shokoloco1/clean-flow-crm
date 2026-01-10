import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  CheckSquare, 
  Check, 
  X, 
  AlertTriangle,
  Camera,
  Loader2,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  job_id: string;
  room_name: string;
  task_name: string;
  status: 'pending' | 'done' | 'na' | 'issue';
  issue_photo_url: string | null;
  issue_note: string | null;
  completed_at: string | null;
  sort_order: number;
}

interface AdvancedChecklistProps {
  jobId: string;
  jobStatus: string;
  legacyChecklist?: string[];
  onProgressUpdate?: (percentage: number) => void;
}

export default function AdvancedChecklist({ 
  jobId, 
  jobStatus, 
  legacyChecklist = [],
  onProgressUpdate 
}: AdvancedChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [issuePhotoUrl, setIssuePhotoUrl] = useState<string | null>(null);

  const isEditable = jobStatus === 'in_progress';

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("job_id", jobId)
      .order("room_name")
      .order("sort_order");

    if (error) {
      console.error("Error fetching checklist items:", error);
      return;
    }

    if (data && data.length > 0) {
      setItems(data as ChecklistItem[]);
      // Auto-expand first room
      const rooms = [...new Set(data.map(item => item.room_name))];
      setExpandedRooms(new Set([rooms[0]]));
    } else if (legacyChecklist.length > 0) {
      // Initialize from legacy checklist if no items exist
      await initializeFromLegacy();
    }
    
    setLoading(false);
  }, [jobId, legacyChecklist]);

  const initializeFromLegacy = async () => {
    // Convert legacy checklist (simple string array) to advanced format
    // Group by room if format is "Room: Task" or put all in "General"
    const newItems = legacyChecklist.map((task, index) => {
      let roomName = "General";
      let taskName = task;
      
      // Check if task includes room prefix like "Kitchen: Clean sink"
      if (task.includes(":")) {
        const parts = task.split(":");
        roomName = parts[0].trim();
        taskName = parts.slice(1).join(":").trim();
      }
      
      return {
        job_id: jobId,
        room_name: roomName,
        task_name: taskName,
        status: 'pending' as const,
        sort_order: index
      };
    });

    if (newItems.length > 0) {
      const { data, error } = await supabase
        .from("checklist_items")
        .insert(newItems)
        .select();

      if (!error && data) {
        setItems(data as ChecklistItem[]);
        const rooms = [...new Set(data.map(item => item.room_name))];
        setExpandedRooms(new Set([rooms[0]]));
      }
    }
  };

  useEffect(() => {
    fetchItems();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`checklist-${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items', filter: `job_id=eq.${jobId}` },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, fetchItems]);

  // Calculate and report progress
  useEffect(() => {
    if (items.length > 0) {
      const completedCount = items.filter(item => 
        item.status === 'done' || item.status === 'na'
      ).length;
      const percentage = Math.round((completedCount / items.length) * 100);
      onProgressUpdate?.(percentage);
    }
  }, [items, onProgressUpdate]);

  const updateItemStatus = async (item: ChecklistItem, newStatus: 'done' | 'na' | 'pending') => {
    if (!isEditable) return;

    const { error } = await supabase
      .from("checklist_items")
      .update({ 
        status: newStatus,
        completed_at: newStatus !== 'pending' ? new Date().toISOString() : null
      })
      .eq("id", item.id);

    if (error) {
      toast.error("Error updating task");
    }
  };

  const handleIssueClick = (item: ChecklistItem) => {
    if (!isEditable) return;
    setSelectedItem(item);
    setIssueNote(item.issue_note || "");
    setIssuePhotoUrl(item.issue_photo_url);
    setIssueDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `issues/${jobId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('job-evidence')
      .upload(fileName, file, { cacheControl: '3600' });

    if (error) {
      toast.error("Error uploading photo");
      setIsUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('job-evidence')
      .getPublicUrl(data.path);

    setIssuePhotoUrl(urlData.publicUrl);
    setIsUploadingPhoto(false);
    e.target.value = '';
  };

  const saveIssue = async () => {
    if (!selectedItem) return;

    const { error } = await supabase
      .from("checklist_items")
      .update({
        status: 'issue',
        issue_note: issueNote || null,
        issue_photo_url: issuePhotoUrl,
        completed_at: new Date().toISOString()
      })
      .eq("id", selectedItem.id);

    if (error) {
      toast.error("Error saving issue");
    } else {
      toast.success("Issue reported");
      setIssueDialogOpen(false);
      setSelectedItem(null);
      setIssueNote("");
      setIssuePhotoUrl(null);
    }
  };

  const toggleRoom = (roomName: string) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomName)) {
        newSet.delete(roomName);
      } else {
        newSet.add(roomName);
      }
      return newSet;
    });
  };

  // Group items by room
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.room_name]) {
      acc[item.room_name] = [];
    }
    acc[item.room_name].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const getRoomProgress = (roomItems: ChecklistItem[]) => {
    const completed = roomItems.filter(i => i.status === 'done' || i.status === 'na').length;
    return Math.round((completed / roomItems.length) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <Check className="h-5 w-5 text-success" />;
      case 'na':
        return <X className="h-5 w-5 text-muted-foreground" />;
      case 'issue':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0 && legacyChecklist.length === 0) {
    return null;
  }

  const totalProgress = items.length > 0 
    ? Math.round((items.filter(i => i.status === 'done' || i.status === 'na').length / items.length) * 100)
    : 0;

  const issueCount = items.filter(i => i.status === 'issue').length;

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5 text-primary" />
              Checklist
            </CardTitle>
            <div className="flex items-center gap-2">
              {issueCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  {issueCount} issue{issueCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="text-sm font-medium text-foreground">
                {totalProgress}%
              </span>
            </div>
          </div>
          <Progress value={totalProgress} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {Object.entries(groupedItems).map(([roomName, roomItems]) => {
            const isExpanded = expandedRooms.has(roomName);
            const roomProgress = getRoomProgress(roomItems);
            const roomIssues = roomItems.filter(i => i.status === 'issue').length;

            return (
              <div key={roomName} className="border border-border rounded-lg overflow-hidden">
                {/* Room Header */}
                <button
                  onClick={() => toggleRoom(roomName)}
                  className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{roomName}</span>
                    {roomIssues > 0 && (
                      <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                        {roomIssues} issue{roomIssues > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {roomItems.filter(i => i.status === 'done' || i.status === 'na').length}/{roomItems.length}
                    </span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ width: `${roomProgress}%` }} 
                      />
                    </div>
                  </div>
                </button>

                {/* Room Tasks */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {roomItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-4 flex items-center justify-between gap-3",
                          item.status === 'done' && "bg-success/5",
                          item.status === 'issue' && "bg-destructive/5"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-6 h-6 flex items-center justify-center">
                            {getStatusIcon(item.status)}
                          </div>
                          <span className={cn(
                            "text-foreground",
                            item.status === 'done' && "line-through text-muted-foreground",
                            item.status === 'na' && "line-through text-muted-foreground"
                          )}>
                            {item.task_name}
                          </span>
                        </div>

                        {isEditable && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant={item.status === 'done' ? 'default' : 'outline'}
                              size="sm"
                              className="h-9 w-9 p-0"
                              onClick={() => updateItemStatus(item, item.status === 'done' ? 'pending' : 'done')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={item.status === 'na' ? 'secondary' : 'outline'}
                              size="sm"
                              className="h-9 px-2"
                              onClick={() => updateItemStatus(item, item.status === 'na' ? 'pending' : 'na')}
                            >
                              N/A
                            </Button>
                            <Button
                              variant={item.status === 'issue' ? 'destructive' : 'outline'}
                              size="sm"
                              className="h-9 w-9 p-0"
                              onClick={() => handleIssueClick(item)}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {!isEditable && item.status === 'issue' && item.issue_note && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIssueClick(item)}
                          >
                            View Issue
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Issue Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {isEditable ? "Report Issue" : "Issue Details"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedItem && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Task:</p>
                <p className="font-medium text-foreground">{selectedItem.task_name}</p>
              </div>
            )}

            {isEditable ? (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Describe the issue
                  </label>
                  <Textarea
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                    placeholder="What's the problem?"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Photo Evidence
                  </label>
                  {issuePhotoUrl ? (
                    <div className="relative">
                      <img 
                        src={issuePhotoUrl} 
                        alt="Issue" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setIssuePhotoUrl(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                      />
                      {isUploadingPhoto ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <>
                          <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Take or upload photo</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </>
            ) : (
              <>
                {selectedItem?.issue_note && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Description:</p>
                    <p className="text-muted-foreground">{selectedItem.issue_note}</p>
                  </div>
                )}
                {selectedItem?.issue_photo_url && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Photo:</p>
                    <img 
                      src={selectedItem.issue_photo_url} 
                      alt="Issue" 
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
              {isEditable ? "Cancel" : "Close"}
            </Button>
            {isEditable && (
              <Button variant="destructive" onClick={saveIssue}>
                Report Issue
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
