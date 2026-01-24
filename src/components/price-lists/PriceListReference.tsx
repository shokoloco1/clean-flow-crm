import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, FileSpreadsheet, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/signedUrls";
import { toast } from "@/components/ui/use-toast";

interface PriceList {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
}

interface PriceListReferenceProps {
  trigger?: React.ReactNode;
}

export function PriceListReference({ trigger }: PriceListReferenceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<PriceList | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchActivePriceLists();
    }
  }, [isOpen]);

  const fetchActivePriceLists = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("price_lists")
        .select("id, name, description, file_url, file_type")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setPriceLists(data || []);

      // Auto-select first if only one
      if (data && data.length === 1) {
        handleSelectList(data[0]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las listas de precios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectList = async (list: PriceList) => {
    setSelectedList(list);
    setLoadingUrl(true);

    try {
      const urlParts = list.file_url.split("/price-lists/");
      const filePath = urlParts[1]?.split("?")[0];

      if (!filePath) throw new Error("Invalid file path");

      const url = await getSignedUrl("price-lists", filePath);
      setSignedUrl(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el archivo",
        variant: "destructive",
      });
    } finally {
      setLoadingUrl(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === "pdf") {
      return <FileText className="h-4 w-4 text-destructive" />;
    }
    return <FileSpreadsheet className="h-4 w-4 text-primary" />;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Ver Precios
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Lista de Precios</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : priceLists.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay listas de precios</h3>
            <p className="text-sm text-muted-foreground mt-2">
              El administrador debe subir una lista de precios primero.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* List selector if multiple */}
            {priceLists.length > 1 && (
              <div className="flex-shrink-0 mb-4 flex flex-wrap gap-2">
                {priceLists.map((list) => (
                  <Button
                    key={list.id}
                    variant={selectedList?.id === list.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectList(list)}
                    className="gap-2"
                  >
                    {getFileIcon(list.file_type)}
                    {list.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Selected list viewer */}
            {selectedList && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-shrink-0 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(selectedList.file_type)}
                    <span className="font-medium">{selectedList.name}</span>
                    <Badge variant="outline">
                      {selectedList.file_type.toUpperCase()}
                    </Badge>
                  </div>
                  {signedUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(signedUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Abrir
                    </Button>
                  )}
                </div>

                {loadingUrl ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : signedUrl && selectedList.file_type === "pdf" ? (
                  <iframe
                    src={signedUrl}
                    className="flex-1 w-full rounded-lg border border-border"
                    title={selectedList.name}
                  />
                ) : signedUrl ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-border rounded-lg">
                    {getFileIcon(selectedList.file_type)}
                    <h3 className="text-lg font-medium mt-4">
                      Vista previa no disponible
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Abre el archivo en una nueva pestaña para verlo.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => window.open(signedUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir archivo
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
