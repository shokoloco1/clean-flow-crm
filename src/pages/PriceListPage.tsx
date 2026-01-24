import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, FileText, FileSpreadsheet, Download, Eye, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UploadPriceListDialog } from "@/components/price-lists/UploadPriceListDialog";
import { PriceListViewer } from "@/components/price-lists/PriceListViewer";
import { getSignedUrl } from "@/lib/signedUrls";

interface PriceList {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function PriceListPage() {
  const navigate = useNavigate();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingPriceList, setViewingPriceList] = useState<PriceList | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPriceLists = async () => {
    try {
      const { data, error } = await supabase
        .from("price_lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPriceLists(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las listas de precios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const handleToggleActive = async (id: string, currentState: boolean) => {
    setTogglingId(id);
    try {
      const { error } = await supabase
        .from("price_lists")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      setPriceLists(prev =>
        prev.map(pl => (pl.id === id ? { ...pl, is_active: !currentState } : pl))
      );

      toast({
        title: "Actualizado",
        description: `Lista de precios ${!currentState ? "activada" : "desactivada"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const priceList = priceLists.find(pl => pl.id === deletingId);
    if (!priceList) return;

    try {
      // Extract file path from URL
      const urlParts = priceList.file_url.split("/price-lists/");
      const filePath = urlParts[1]?.split("?")[0];

      if (filePath) {
        await supabase.storage.from("price-lists").remove([filePath]);
      }

      const { error } = await supabase
        .from("price_lists")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      setPriceLists(prev => prev.filter(pl => pl.id !== deletingId));
      toast({
        title: "Eliminado",
        description: "Lista de precios eliminada correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la lista de precios",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (priceList: PriceList) => {
    try {
      const urlParts = priceList.file_url.split("/price-lists/");
      const filePath = urlParts[1]?.split("?")[0];

      if (!filePath) throw new Error("Invalid file path");

      const signedUrl = await getSignedUrl("price-lists", filePath);
      if (!signedUrl) throw new Error("Could not get download URL");

      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = priceList.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === "pdf") {
      return <FileText className="h-5 w-5 text-destructive" />;
    }
    return <FileSpreadsheet className="h-5 w-5 text-primary" />;
  };

  const getFileTypeBadge = (fileType: string) => {
    const variants: Record<string, string> = {
      pdf: "bg-destructive/10 text-destructive",
      xlsx: "bg-primary/10 text-primary",
      xls: "bg-primary/10 text-primary",
      csv: "bg-secondary text-secondary-foreground",
    };
    return (
      <Badge variant="outline" className={variants[fileType] || ""}>
        {fileType.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Listas de Precios
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestiona los archivos de precios de tus servicios
              </p>
            </div>
          </div>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Subir Lista
          </Button>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Archivos de Precios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : priceLists.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No hay listas de precios
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sube tu primera lista de precios en PDF o Excel
                </p>
                <Button onClick={() => setIsUploadOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Subir Lista
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceLists.map((priceList) => (
                    <TableRow key={priceList.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(priceList.file_type)}
                          <span className="font-medium">{priceList.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {priceList.description || "—"}
                      </TableCell>
                      <TableCell>{getFileTypeBadge(priceList.file_type)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(priceList.created_at), "d MMM yyyy", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={priceList.is_active}
                          onCheckedChange={() =>
                            handleToggleActive(priceList.id, priceList.is_active)
                          }
                          disabled={togglingId === priceList.id}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingPriceList(priceList)}
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(priceList)}
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(priceList.id)}
                            title="Eliminar"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <UploadPriceListDialog
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploaded={fetchPriceLists}
      />

      {/* Viewer Dialog */}
      <PriceListViewer
        priceList={viewingPriceList}
        onClose={() => setViewingPriceList(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lista de precios?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
