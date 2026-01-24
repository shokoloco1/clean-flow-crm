import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface UploadPriceListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
};

export function UploadPriceListDialog({
  isOpen,
  onOpenChange,
  onUploaded,
}: UploadPriceListDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const resetForm = () => {
    setFile(null);
    setName("");
    setDescription("");
    setProgress(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!Object.keys(ACCEPTED_TYPES).includes(selectedFile.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Solo se permiten archivos PDF, Excel (.xlsx, .xls) o CSV",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    // Auto-fill name from filename (without extension)
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setName(nameWithoutExt);
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona un archivo y proporciona un nombre",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const fileType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileType}`;

      setProgress(30);

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("price-lists")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(70);

      // Get the public URL (we'll use signed URLs for access)
      const { data: urlData } = supabase.storage
        .from("price-lists")
        .getPublicUrl(fileName);

      // Create database record
      const { error: dbError } = await supabase.from("price_lists").insert({
        name: name.trim(),
        description: description.trim() || null,
        file_url: urlData.publicUrl,
        file_type: fileType,
      });

      if (dbError) throw dbError;

      setProgress(100);

      toast({
        title: "Subido correctamente",
        description: "La lista de precios se ha guardado",
      });

      resetForm();
      onOpenChange(false);
      onUploaded();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error al subir",
        description: error.message || "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type === "application/pdf") {
      return <FileText className="h-8 w-8 text-destructive" />;
    }
    return <FileSpreadsheet className="h-8 w-8 text-primary" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir Lista de Precios</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div>
            <Label>Archivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Haz clic para seleccionar un archivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Excel (.xlsx, .xls) o CSV
                </p>
              </div>
            ) : (
              <div className="mt-2 border border-border rounded-lg p-4 flex items-center gap-3">
                {getFileIcon()}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Name Field */}
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Lista de precios 2024"
              className="mt-1"
              disabled={uploading}
            />
          </div>

          {/* Description Field */}
          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la lista de precios..."
              className="mt-1 resize-none"
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                Subiendo archivo...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
