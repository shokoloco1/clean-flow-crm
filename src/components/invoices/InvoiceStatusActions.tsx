import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { 
  ChevronDown, 
  FileEdit, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { useInvoiceEmail } from "@/hooks/useInvoiceEmail";

interface InvoiceStatusActionsProps {
  invoiceId: string;
  currentStatus: string;
  clientEmail?: string | null;
  onStatusChange: () => void;
}

const statusConfig = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
    icon: FileEdit,
  },
  sent: {
    label: "Sent",
    className: "bg-primary/10 text-primary border-primary/30",
    icon: Send,
  },
  paid: {
    label: "Paid",
    className: "bg-success/10 text-success border-success/30",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
};

export function InvoiceStatusActions({
  invoiceId,
  currentStatus,
  clientEmail,
  onStatusChange,
}: InvoiceStatusActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const { sendInvoiceEmail, isSending } = useInvoiceEmail();

  const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = config.icon;

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    
    const { error } = await supabase
      .from("invoices")
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Invoice marked as ${newStatus}`);
      onStatusChange();
    }
    
    setIsUpdating(false);
  };

  const handleMarkAsPaid = () => {
    setConfirmPaid(true);
  };

  const confirmMarkAsPaid = async () => {
    setConfirmPaid(false);
    await updateStatus("paid");
  };

  const handleSendReminder = async () => {
    if (!clientEmail) {
      toast.error("Client has no email address");
      return;
    }
    
    const success = await sendInvoiceEmail(invoiceId);
    if (success) {
      // Update status to sent if it was draft
      if (currentStatus === "draft") {
        await updateStatus("sent");
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={isUpdating || isSending}
          >
            {(isUpdating || isSending) ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <StatusIcon className="h-3.5 w-3.5" />
            )}
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {currentStatus === "draft" && (
            <>
              <DropdownMenuItem onClick={() => updateStatus("sent")}>
                <Send className="h-4 w-4 mr-2 text-primary" />
                Mark as Sent
              </DropdownMenuItem>
              {clientEmail && (
                <DropdownMenuItem onClick={handleSendReminder}>
                  <Mail className="h-4 w-4 mr-2 text-primary" />
                  Send to Client
                </DropdownMenuItem>
              )}
            </>
          )}
          
          {currentStatus === "sent" && (
            <>
              <DropdownMenuItem onClick={handleMarkAsPaid}>
                <CheckCircle className="h-4 w-4 mr-2 text-success" />
                Mark as Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus("overdue")}>
                <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                Mark as Overdue
              </DropdownMenuItem>
              {clientEmail && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSendReminder}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
          
          {currentStatus === "overdue" && (
            <>
              <DropdownMenuItem onClick={handleMarkAsPaid}>
                <CheckCircle className="h-4 w-4 mr-2 text-success" />
                Mark as Paid
              </DropdownMenuItem>
              {clientEmail && (
                <DropdownMenuItem onClick={handleSendReminder}>
                  <Mail className="h-4 w-4 mr-2 text-destructive" />
                  Send Urgent Reminder
                </DropdownMenuItem>
              )}
            </>
          )}
          
          {currentStatus === "paid" && (
            <DropdownMenuItem onClick={() => updateStatus("sent")} className="text-muted-foreground">
              <Send className="h-4 w-4 mr-2" />
              Revert to Sent
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirm Paid Dialog */}
      <AlertDialog open={confirmPaid} onOpenChange={setConfirmPaid}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will record that payment has been received for this invoice. 
              Make sure you've confirmed the payment in your bank account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAsPaid} className="bg-success hover:bg-success/90">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
