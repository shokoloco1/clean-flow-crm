import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import { type Client } from "@/lib/queries/clients";

interface ClientDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientToDelete: Client | null;
  clientJobCount: number;
  isCheckingJobs: boolean;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function ClientDeleteDialog({
  isOpen,
  onOpenChange,
  clientToDelete,
  clientJobCount,
  isCheckingJobs,
  onConfirm,
  isDeleting,
}: ClientDeleteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Client</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{clientToDelete?.name}&quot;? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        {isCheckingJobs ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking associated jobs...</span>
          </div>
        ) : clientJobCount > 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">Warning: Associated Jobs Found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This client has{" "}
                  <strong>
                    {clientJobCount} job{clientJobCount !== 1 ? "s" : ""}
                  </strong>{" "}
                  associated. Deleting will unlink these jobs from the client (jobs will be
                  preserved but marked as unassigned).
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting || isCheckingJobs}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : clientJobCount > 0 ? (
              "Delete Anyway"
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
