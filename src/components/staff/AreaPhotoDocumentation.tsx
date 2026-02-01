import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Trash2,
  MessageSquare
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";

interface AreaPhoto {
  id: string;
  job_id: string;
  area_name: string;
  service_type: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  notes: string | null;
  status: "pending" | "completed";
  uploaded_at: string;
}

interface RequiredArea {
  name: string;
  services: string[];
}

interface AreaPhotoDocumentationProps {
  jobId: string;
  jobStatus: string;
  requiredAreas?: RequiredArea[];
  onPhotosUpdated?: () => void;
  onAllAreasComplete?: (isComplete: boolean) => void;
}

// Compress image before upload (max 2MB)
async function compressImage(file: File, maxSizeMB = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate new dimensions (max 1920px on any side)
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Start with quality 0.9 and reduce if needed
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                  quality -= 0.1;
                  tryCompress();
                } else {
                  resolve(blob);
                }
              } else {
                reject(new Error("Failed to compress image"));
              }
            },
            "image/jpeg",
            quality
          );
        };
        tryCompress();
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

export function AreaPhotoDocumentation({
  jobId,
  jobStatus,
  requiredAreas = [],
  onPhotosUpdated,
  onAllAreasComplete
}: AreaPhotoDocumentationProps) {
  const [areaPhotos, setAreaPhotos] = useState<AreaPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [uploadingArea, setUploadingArea] = useState<{
    areaName: string;
    type: "before" | "after";
  } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInProgress = jobStatus === "in_progress";
  const isCompleted = jobStatus === "completed";

  // Fetch area photos
  useEffect(() => {
    fetchAreaPhotos();
  }, [jobId]);

  const fetchAreaPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from("job_area_photos")
        .select("*")
        .eq("job_id", jobId)
        .order("area_name");

      if (error) throw error;
      setAreaPhotos((data as AreaPhoto[]) || []);

      // Initialize areas if required_areas exist but no photos yet
      if (requiredAreas.length > 0 && (!data || data.length === 0)) {
        await initializeAreas();
      }
    } catch (error) {
      console.error("Error fetching area photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeAreas = async () => {
    try {
      const areasToCreate = requiredAreas.map((area) => ({
        job_id: jobId,
        area_name: area.name,
        service_type: area.services.join(", "),
        status: "pending"
      }));

      const { error } = await supabase
        .from("job_area_photos")
        .insert(areasToCreate);

      if (error) throw error;
      await fetchAreaPhotos();
    } catch (error) {
      console.error("Error initializing areas:", error);
    }
  };

  // Calculate completion stats
  const completedAreas = areaPhotos.filter(
    (a) => a.before_photo_url && a.after_photo_url
  ).length;
  const totalAreas = areaPhotos.length || requiredAreas.length;
  const completionPercent = totalAreas > 0 ? (completedAreas / totalAreas) * 100 : 0;
  const allComplete = completedAreas === totalAreas && totalAreas > 0;

  // Notify parent of completion status
  useEffect(() => {
    onAllAreasComplete?.(allComplete);
  }, [allComplete, onAllAreasComplete]);

  const handlePhotoCapture = (areaName: string, type: "before" | "after") => {
    setUploadingArea({ areaName, type });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingArea) return;

    const { areaName, type } = uploadingArea;

    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, {
        type: "image/jpeg"
      });

      // Upload to storage
      const fileName = `${jobId}/${areaName.replace(/\s+/g, "_")}-${type}-${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("job-evidence")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("job-evidence")
        .getPublicUrl(uploadData.path);

      // Update database
      const existingArea = areaPhotos.find((a) => a.area_name === areaName);

      if (existingArea) {
        const updateData: Record<string, string> = {
          [`${type}_photo_url`]: urlData.publicUrl,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || ""
        };

        // Check if both photos will be present after this update
        const otherType = type === "before" ? "after" : "before";
        const hasOtherPhoto = existingArea[`${otherType}_photo_url`];
        if (hasOtherPhoto) {
          updateData.status = "completed";
        }

        const { error: dbError } = await supabase
          .from("job_area_photos")
          .update(updateData)
          .eq("id", existingArea.id);

        if (dbError) throw dbError;
      } else {
        // Create new area photo record
        const { error: dbError } = await supabase.from("job_area_photos").insert({
          job_id: jobId,
          area_name: areaName,
          [`${type}_photo_url`]: urlData.publicUrl,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          status: "pending"
        });

        if (dbError) throw dbError;
      }

      toast.success(`📸 ${type === "before" ? "Before" : "After"} photo saved for ${areaName}!`);
      await fetchAreaPhotos();
      onPhotosUpdated?.();
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingArea(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveNotes = async (areaName: string) => {
    const area = areaPhotos.find((a) => a.area_name === areaName);
    if (!area) return;

    try {
      const { error } = await supabase
        .from("job_area_photos")
        .update({ notes: notesText })
        .eq("id", area.id);

      if (error) throw error;

      toast.success("Notes saved");
      await fetchAreaPhotos();
      setEditingNotes(null);
      setNotesText("");
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  const handleDeletePhoto = async (areaName: string, type: "before" | "after") => {
    const area = areaPhotos.find((a) => a.area_name === areaName);
    if (!area) return;

    try {
      const { error } = await supabase
        .from("job_area_photos")
        .update({
          [`${type}_photo_url`]: null,
          status: "pending"
        })
        .eq("id", area.id);

      if (error) throw error;

      toast.success(`${type === "before" ? "Before" : "After"} photo removed`);
      await fetchAreaPhotos();
      onPhotosUpdated?.();
    } catch (error) {
      toast.error("Failed to delete photo");
    }
  };

  // Render area list based on required areas or existing photos
  const areasToRender = areaPhotos.length > 0
    ? areaPhotos
    : requiredAreas.map((ra) => ({
        id: "",
        job_id: jobId,
        area_name: ra.name,
        service_type: ra.services.join(", "),
        before_photo_url: null,
        after_photo_url: null,
        notes: null,
        status: "pending" as const,
        uploaded_at: ""
      }));

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If no areas defined, show the simplified photo capture
  if (areasToRender.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="p-4 text-center text-muted-foreground">
          <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No areas defined for photo documentation.</p>
          <p className="text-sm">Photos will be captured as general before/after.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Photo Documentation
            </CardTitle>
            <Badge variant={allComplete ? "default" : "secondary"} className="gap-1">
              {allComplete ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {completedAreas}/{totalAreas} areas
            </Badge>
          </div>
          <Progress value={completionPercent} className="h-2 mt-2" />
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-2">
          {areasToRender.map((area) => {
            const hasBefore = !!area.before_photo_url;
            const hasAfter = !!area.after_photo_url;
            const isComplete = hasBefore && hasAfter;
            const isExpanded = expandedArea === area.area_name;

            return (
              <Collapsible
                key={area.area_name}
                open={isExpanded}
                onOpenChange={() =>
                  setExpandedArea(isExpanded ? null : area.area_name)
                }
              >
                <CollapsibleTrigger asChild>
                  <div
                    className={`
                      flex items-center justify-between p-3 rounded-lg cursor-pointer
                      transition-colors
                      ${isComplete
                        ? "bg-success/10 border border-success/30"
                        : "bg-muted/50 border border-border hover:bg-muted"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                          h-8 w-8 rounded-full flex items-center justify-center
                          ${isComplete ? "bg-success text-success-foreground" : "bg-muted-foreground/20"}
                        `}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{area.area_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {area.service_type || "Standard cleaning"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {hasBefore ? "✓" : "○"} Before{" "}
                        {hasAfter ? "✓" : "○"} After
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-2 gap-3 pl-11">
                    {/* Before Photo */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Before
                      </p>
                      {hasBefore ? (
                        <div className="relative">
                          <div
                            className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border-2 border-primary/30"
                            onClick={() => setSelectedPhoto(area.before_photo_url!)}
                          >
                            <img
                              src={area.before_photo_url!}
                              alt="Before"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {isInProgress && (
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(area.area_name, "before");
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : isInProgress ? (
                        <Button
                          variant="outline"
                          className="w-full aspect-square flex flex-col gap-1"
                          onClick={() => handlePhotoCapture(area.area_name, "before")}
                          disabled={
                            uploadingArea?.areaName === area.area_name &&
                            uploadingArea?.type === "before"
                          }
                        >
                          {uploadingArea?.areaName === area.area_name &&
                          uploadingArea?.type === "before" ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <>
                              <ImagePlus className="h-6 w-6" />
                              <span className="text-xs">Add Before</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            No photo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* After Photo */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        After
                      </p>
                      {hasAfter ? (
                        <div className="relative">
                          <div
                            className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border-2 border-success/30"
                            onClick={() => setSelectedPhoto(area.after_photo_url!)}
                          >
                            <img
                              src={area.after_photo_url!}
                              alt="After"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {isInProgress && (
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(area.area_name, "after");
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : isInProgress ? (
                        <Button
                          variant="outline"
                          className="w-full aspect-square flex flex-col gap-1 border-dashed"
                          onClick={() => handlePhotoCapture(area.area_name, "after")}
                          disabled={
                            uploadingArea?.areaName === area.area_name &&
                            uploadingArea?.type === "after"
                          }
                        >
                          {uploadingArea?.areaName === area.area_name &&
                          uploadingArea?.type === "after" ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <>
                              <ImagePlus className="h-6 w-6" />
                              <span className="text-xs">Add After</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            No photo
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="pl-11 mt-3">
                    {editingNotes === area.area_name ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add notes about this area..."
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(area.area_name)}
                          >
                            Save Notes
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingNotes(null);
                              setNotesText("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => {
                          setEditingNotes(area.area_name);
                          setNotesText(area.notes || "");
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {area.notes ? "Edit notes" : "Add notes"}
                      </Button>
                    )}
                    {area.notes && editingNotes !== area.area_name && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{area.notes}"
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Completion Warning */}
          {!allComplete && isInProgress && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs">
                Complete all area photos before marking job as done.
              </p>
            </div>
          )}

          {/* All Complete Message */}
          {allComplete && (
            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg text-success">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs font-medium">
                All areas documented! Ready to complete the job.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-foreground"
            onClick={() => setSelectedPhoto(null)}
          >
            <XCircle className="h-8 w-8" />
          </button>
          <img
            src={selectedPhoto}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
