import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, ExternalLink, FileText, FileSpreadsheet } from "lucide-react";
import { getSignedUrl } from "@/lib/signedUrls";
import { toast } from "@/components/ui/use-toast";

interface PriceList {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  is_active: boolean;
  created_at: string;
}

interface PriceListViewerProps {
  priceList: PriceList | null;
  onClose: () => void;
}

export function PriceListViewer({ priceList, onClose }: PriceListViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (priceList) {
      loadSignedUrl();
    } else {
      setSignedUrl(null);
    }
  }, [priceList]);

  const loadSignedUrl = async () => {
    if (!priceList) return;

    setLoading(true);
    try {
      const urlParts = priceList.file_url.split("/price-lists/");
      const filePath = urlParts[1]?.split("?")[0];

      if (!filePath) throw new Error("Invalid file path");

      const url = await getSignedUrl("price-lists", filePath);
      setSignedUrl(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  const handleDownload = () => {
    if (signedUrl && priceList) {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = priceList.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getFileIcon = () => {
    if (!priceList) return null;
    if (priceList.file_type === "pdf") {
      return <FileText className="h-5 w-5 text-destructive" />;
    }
    return <FileSpreadsheet className="h-5 w-5 text-primary" />;
  };

  return (
    <Sheet open={!!priceList} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {getFileIcon()}
            {priceList?.name}
          </SheetTitle>
          {priceList?.description && (
            <p className="text-sm text-muted-foreground">
              {priceList.description}
            </p>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">
              {priceList?.file_type.toUpperCase()}
            </Badge>
            <Badge variant={priceList?.is_active ? "default" : "secondary"}>
              {priceList?.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 mt-4 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : signedUrl && priceList?.file_type === "pdf" ? (
            <iframe
              src={signedUrl}
              className="w-full h-full rounded-lg border border-border"
              title={priceList.name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              {getFileIcon()}
              <h3 className="text-lg font-medium mt-4">
                Preview not available
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Excel and CSV files cannot be previewed. 
                Download the file to view its contents.
              </p>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>

        {signedUrl && priceList?.file_type === "pdf" && (
          <div className="flex-shrink-0 pt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in new tab
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
