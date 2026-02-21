import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Play, Square, Clock, AlertTriangle, Loader2 } from "lucide-react";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface ClockInOutCardProps {
  jobId: string;
}

export function ClockInOutCard({ jobId }: ClockInOutCardProps) {
  const { t } = useLanguage();
  const {
    activeEntry,
    isClockedIn,
    isClockedInToThisJob,
    isClockedInToOtherJob,
    isStaleEntry,
    elapsedSeconds,
    clockIn,
    clockOut,
    isClockingIn,
    isClockingOut,
    isLoading,
  } = useTimeTracking(jobId);

  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [breakMins, setBreakMins] = useState("");
  const [notes, setNotes] = useState("");
  const [showBreak, setShowBreak] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);

  const handleClockOut = async () => {
    await clockOut(breakMins ? parseInt(breakMins, 10) : undefined, notes || undefined);
    setShowClockOutDialog(false);
    setBreakMins("");
    setNotes("");
    setShowBreak(false);
    setShowNotes(false);
  };

  // Clocked in to a different job
  if (isClockedInToOtherJob) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>{t("already_clocked_in")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Clocked in to this job — show timer + clock out
  if (isClockedInToThisJob && activeEntry) {
    return (
      <>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-4 py-4">
            {/* Stale warning */}
            {isStaleEntry && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{t("stale_timer_warning")}</p>
              </div>
            )}

            {/* Timer display */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{t("timer")}</span>
              </div>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-foreground">
                {formatElapsed(elapsedSeconds)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("started")}:{" "}
                {new Date(activeEntry.clock_in).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Optional fields */}
            <div className="space-y-2">
              {!showBreak && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowBreak(true)}
                >
                  {t("add_break")}
                </Button>
              )}
              {showBreak && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {t("break_minutes")}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={480}
                    placeholder="0"
                    value={breakMins}
                    onChange={(e) => setBreakMins(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}

              {!showNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowNotes(true)}
                >
                  {t("add_note")}
                </Button>
              )}
              {showNotes && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {t("staff_notes_label")}
                  </label>
                  <Textarea
                    placeholder={t("notes")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Clock out button */}
            <Button
              size="lg"
              className="h-14 w-full gap-3 bg-destructive text-lg font-bold hover:bg-destructive/90"
              onClick={() => setShowClockOutDialog(true)}
              disabled={isClockingOut}
            >
              {isClockingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              {t("clock_out")}
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation dialog */}
        <AlertDialog open={showClockOutDialog} onOpenChange={setShowClockOutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("clock_out")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("clock_out_confirm")
                  .replace("{{hours}}", String(hours))
                  .replace("{{minutes}}", String(minutes))}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleClockOut}>{t("clock_out")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Not clocked in — show clock in button
  return (
    <Card>
      <CardContent className="py-4">
        <Button
          size="lg"
          className="h-16 w-full gap-3 bg-success text-xl font-bold hover:bg-success/90"
          onClick={() => clockIn()}
          disabled={isClockingIn || isClockedIn}
        >
          {isClockingIn ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Play className="h-6 w-6" />
          )}
          {t("clock_in")}
        </Button>
      </CardContent>
    </Card>
  );
}
