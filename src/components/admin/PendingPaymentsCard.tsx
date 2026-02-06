import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, AlertTriangle, Clock, ArrowRight, Loader2 } from "lucide-react";
import { formatAUD } from "@/lib/australian";
import { differenceInDays, parseISO } from "date-fns";
import { logger } from "@/lib/logger";

interface PaymentStats {
  totalPending: number;
  overdueCount: number;
  overdueAmount: number;
  sentCount: number;
  sentAmount: number;
}

export function PendingPaymentsCard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPaymentStats = async () => {
    // Fetch ALL unpaid invoices (not just sent/overdue, but also draft that might be pending)
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("status, total, due_date")
      .neq("status", "paid");  // All invoices that are NOT paid

    if (error) {
      logger.error("[PendingPayments] Error fetching", error);
      setLoading(false);
      return;
    }

    logger.debug('[PendingPayments] Found unpaid invoices:', { count: invoices?.length || 0 });

    const today = new Date();
    let overdueCount = 0;
    let overdueAmount = 0;
    let sentCount = 0;
    let sentAmount = 0;

    invoices?.forEach((inv) => {
      // Check if invoice is overdue based on due_date
      const isOverdue = inv.due_date && differenceInDays(today, parseISO(inv.due_date)) > 0;
      
      if (inv.status === "overdue" || (inv.status === "sent" && isOverdue)) {
        overdueCount++;
        overdueAmount += Number(inv.total) || 0;
      } else if (inv.status === "sent" || inv.status === "draft") {
        sentCount++;
        sentAmount += Number(inv.total) || 0;
      }
    });

    setStats({
      totalPending: overdueAmount + sentAmount,
      overdueCount,
      overdueAmount,
      sentCount,
      sentAmount,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchPaymentStats();
    
    // Refresh on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPaymentStats();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Pending Payments
        </CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => navigate("/admin/invoices")}
            >
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go to Invoices</TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Pending */}
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-foreground">
            {formatAUD(stats.totalPending)}
          </span>
          <span className="text-xs text-muted-foreground">
            Inc. GST
          </span>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 pt-2 border-t border-border">
          {/* Overdue */}
          {stats.overdueCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  Overdue ({stats.overdueCount})
                </span>
              </div>
              <Badge variant="destructive" className="text-xs">
                {formatAUD(stats.overdueAmount)}
              </Badge>
            </div>
          )}

          {/* Sent/Awaiting */}
          {stats.sentCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-warning" />
                <span className="text-sm text-muted-foreground">
                  Awaiting ({stats.sentCount})
                </span>
              </div>
              <span className="text-sm font-medium">
                {formatAUD(stats.sentAmount)}
              </span>
            </div>
          )}

          {/* No pending */}
          {stats.totalPending === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              ✓ All invoices paid
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
