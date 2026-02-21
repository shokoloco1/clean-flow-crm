import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { usePayRates } from "@/hooks/usePayRates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Pencil, Loader2 } from "lucide-react";

export default function PayRatesPage() {
  const { tAdmin } = useLanguage();
  const { staffWithRates, isLoading, setRate } = usePayRates();

  const [editingStaff, setEditingStaff] = useState<{
    userId: string;
    name: string;
    currentRate: number;
  } | null>(null);
  const [newRate, setNewRate] = useState("");
  const [newOvertimeRate, setNewOvertimeRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editingStaff || !newRate) return;
    setIsSaving(true);
    try {
      await setRate(
        editingStaff.userId,
        parseFloat(newRate),
        newOvertimeRate ? parseFloat(newOvertimeRate) : undefined,
      );
      setEditingStaff(null);
    } finally {
      setIsSaving(false);
    }
  };

  const activeStaff = staffWithRates.filter((s) => s.is_active !== false);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{tAdmin("pay_rates")}</h1>
          <p className="text-sm text-muted-foreground">Set hourly rates for each staff member</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" />
              {tAdmin("hourly_rate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tAdmin("staff_member")}</TableHead>
                    <TableHead className="text-right">{tAdmin("hourly_rate")}</TableHead>
                    <TableHead className="text-right">{tAdmin("effective_from")}</TableHead>
                    <TableHead className="text-right">{tAdmin("edit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeStaff.map((staff) => (
                    <TableRow key={staff.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{staff.full_name}</p>
                          <p className="text-xs text-muted-foreground">{staff.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-lg font-semibold">
                          ${staff.effectiveRate.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">{tAdmin("per_hour")}</span>
                        {!staff.pay_rate && staff.hourly_rate != null && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            profile default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {staff.pay_rate?.effective_from ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingStaff({
                              userId: staff.user_id,
                              name: staff.full_name,
                              currentRate: staff.effectiveRate,
                            });
                            setNewRate(String(staff.effectiveRate));
                            setNewOvertimeRate(
                              staff.pay_rate?.overtime_rate
                                ? String(staff.pay_rate.overtime_rate)
                                : "",
                            );
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit rate dialog */}
      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tAdmin("set_rate")} — {editingStaff?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {tAdmin("hourly_rate")} (AUD)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="30.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Overtime Rate (AUD, optional)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={newOvertimeRate}
                onChange={(e) => setNewOvertimeRate(e.target.value)}
                placeholder="45.00"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Applied after 38h/week. Leave empty for 1.5x standard rate.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStaff(null)}>
              {tAdmin("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !newRate}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tAdmin("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
