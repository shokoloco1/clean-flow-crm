import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  CheckCircle2,
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
import { supabase } from "@/integrations/supabase/client";

interface AreaPhoto {
  id: string;
  job_id: string;
  area_name: string;
  service_type: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  before_photo_id: string | null;
  after_photo_id: string | null;
  notes: string | null;
  status: "pending" | "completed";
  uploaded_at: string;
}

interface JobPhotoRecord {
  id: string;
  job_id: string;
  photo_type: string;
  photo_url: string;
  created_at: string;
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
  // Area photos are stored in job_photos table with photo_type format: "area_before:AreaName" or "area_after:AreaName"
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

  // Load area photos from database and merge with required areas
  useEffect(() => {
    const loadAreaPhotos = async () => {
      setLoading(true);

      try {
        // Fetch existing area photos from job_photos table
        // Area photos are stored with photo_type format: "area_before:AreaName" or "area_after:AreaName"
        const { data: existingPhotos, error } = await supabase
          .from("job_photos")
          .select("*")
          .eq("job_id", jobId)
          .like("photo_type", "area_%");

        if (error) {
          console.error("Error loading area photos:", error);
        }

        // Build a map of area -> photos
        const photoMap: Record<string, { before?: JobPhotoRecord; after?: JobPhotoRecord }> = {};

        if (existingPhotos) {
          for (const photo of existingPhotos as JobPhotoRecord[]) {
            const match = photo.photo_type.match(/^area_(before|after):(.+)$/);
            if (match) {
              const [, type, areaName] = match;
              if (!photoMap[areaName]) {
                photoMap[areaName] = {};
              }
              photoMap[areaName][type as "before" | "after"] = photo;
            }
          }
        }

        // Merge required areas with existing photos
        const initialAreas: AreaPhoto[] = requiredAreas.map((ra, idx) => {
          const existing = photoMap[ra.name];
          const hasBefore = !!existing?.before;
          const hasAfter = !!existing?.after;

          return {
            id: `area-${idx}`,
            job_id: jobId,
            area_name: ra.name,
            service_type: ra.services.join(", "),
            before_photo_url: existing?.before?.photo_url || null,
            after_photo_url: existing?.after?.photo_url || null,
            before_photo_id: existing?.before?.id || null,
            after_photo_id: existing?.after?.id || null,
            notes: null, // Notes could be stored separately if needed
            status: hasBefore && hasAfter ? "completed" : "pending",
            uploaded_at: existing?.before?.created_at || existing?.after?.created_at || ""
          };
        });

        setAreaPhotos(initialAreas);
      } catch (err) {
        console.error("Error in loadAreaPhotos:", err);
      } finally {
        setLoading(false);
      }
    };

    if (requiredAreas.length > 0) {
      loadAreaPhotos();
    } else {
      setLoading(false);
    }
  }, [jobId, requiredAreas]);

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

      // Save to database with area-prefixed photo_type
      const photoType = `area_${type}:${areaName}`;
      const { data: insertedPhoto, error: insertError } = await supabase
        .from("job_photos")
        .insert({
          job_id: jobId,
          photo_url: urlData.publicUrl,
          photo_type: photoType
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error saving photo to database:", insertError);
        toast.error("Photo uploaded but failed to save record");
        return;
      }

      // Update local state with the persisted data
      setAreaPhotos((prev) =>
        prev.map((area) => {
          if (area.area_name === areaName) {
            const updatedArea = {
              ...area,
              [`${type}_photo_url`]: urlData.publicUrl,
              [`${type}_photo_id`]: insertedPhoto.id
            };
            // Check if both photos are now present
            const hasOtherType = type === "before" ? area.after_photo_url : area.before_photo_url;
            if (hasOtherType || urlData.publicUrl) {
              const hasBoth = type === "before"
                ? (urlData.publicUrl && area.after_photo_url)
                : (area.before_photo_url && urlData.publicUrl);
              if (hasBoth) {
                updatedArea.status = "completed";
              }
            }
            return updatedArea as AreaPhoto;
          }
          return area;
        })
      );

      toast.success(`📸 ${type === "before" ? "Before" : "After"} photo saved for ${areaName}!`);
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
    // Update local state
    setAreaPhotos((prev) =>
      prev.map((area) =>
        area.area_name === areaName ? { ...area, notes: notesText } : area
      )
    );
    toast.success("Notes saved");
    setEditingNotes(null);
    setNotesText("");
  };

  const handleDeletePhoto = async (areaName: string, type: "before" | "after") => {
    // Find the photo ID to delete
    const area = areaPhotos.find((a) => a.area_name === areaName);
    const photoId = type === "before" ? area?.before_photo_id : area?.after_photo_id;

    if (photoId) {
      // Delete from database
      const { error } = await supabase
        .from("job_photos")
        .delete()
        .eq("id", photoId);

      if (error) {
        console.error("Error deleting photo:", error);
        toast.error("Failed to delete photo");
        return;
      }
    }

    // Update local state
    setAreaPhotos((prev) =>
      prev.map((area) =>
        area.area_name === areaName
          ? {
              ...area,
              [`${type}_photo_url`]: null,
              [`${type}_photo_id`]: null,
              status: "pending" as const
            }
          : area
      )
    );
    toast.success(`${type === "before" ? "Before" : "After"} photo removed`);
    onPhotosUpdated?.();
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
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
                        : "bg-muted/50 border border-border hover:bg-muted"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                          h-8 w-8 rounded-full flex items-center justify-center
                          ${isComplete ? "bg-emerald-500 text-white" : "bg-muted-foreground/20"}
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
                            className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border-2 border-primary/30"
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
                          className="w-full aspect-square flex flex-col gap-1"
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

                  {/* Notes section */}
                  <div className="mt-3 pl-11">
                    {editingNotes === area.area_name ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add notes about this area..."
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          className="min-h-[60px] text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(area.area_name)}
                          >
                            Save
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
                      <div className="flex items-start gap-2">
                        {area.notes ? (
                          <p className="text-sm text-muted-foreground flex-1">
                            {area.notes}
                          </p>
                        ) : null}
                        {isInProgress && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => {
                              setEditingNotes(area.area_name);
                              setNotesText(area.notes || "");
                            }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {area.notes ? "Edit" : "Add"} Notes
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Photo preview modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Photo preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
