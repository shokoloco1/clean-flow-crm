import { useStaffAvailability } from '@/hooks/useStaffAvailability';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffAvailabilityCalendarProps {
  staffId?: string;
  compact?: boolean;
}

export function StaffAvailabilityCalendar({ staffId, compact = false }: StaffAvailabilityCalendarProps) {
  const { availability, loading, saving, toggleDay, updateHours, saveAvailability } = useStaffAvailability(staffId);
  const { t } = useLanguage();

  const DAYS = [
    { value: 0, label: t('sun'), fullLabel: t('sunday') },
    { value: 1, label: t('mon'), fullLabel: t('monday') },
    { value: 2, label: t('tue'), fullLabel: t('tuesday') },
    { value: 3, label: t('wed'), fullLabel: t('wednesday') },
    { value: 4, label: t('thu'), fullLabel: t('thursday') },
    { value: 5, label: t('fri'), fullLabel: t('friday') },
    { value: 6, label: t('sat'), fullLabel: t('saturday') },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const getAvailabilityForDay = (dayOfWeek: number) => {
    return availability.find(a => a.day_of_week === dayOfWeek);
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t('weekly_availability')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick day toggles */}
          <div className="flex gap-1 justify-between">
            {DAYS.map(day => {
              const avail = getAvailabilityForDay(day.value);
              const isAvailable = avail?.is_available ?? false;
              
              return (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors",
                    isAvailable
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          {/* Available days with hours */}
          <div className="space-y-2">
            {DAYS.filter(day => getAvailabilityForDay(day.value)?.is_available).map(day => {
              const avail = getAvailabilityForDay(day.value)!;
              return (
                <div key={day.value} className="flex items-center gap-2 text-sm">
                  <span className="w-12 font-medium">{day.label}</span>
                  <Input
                    type="time"
                    value={avail.start_time}
                    onChange={(e) => updateHours(day.value, e.target.value, avail.end_time)}
                    className="h-8 w-24 text-xs"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={avail.end_time}
                    onChange={(e) => updateHours(day.value, avail.start_time, e.target.value)}
                    className="h-8 w-24 text-xs"
                  />
                </div>
              );
            })}
          </div>

          <Button 
            onClick={saveAvailability} 
            disabled={saving}
            className="w-full"
            size="sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('save_availability')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {t('weekly_availability')}
        </CardTitle>
        <CardDescription>
          {t('set_availability')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {DAYS.map(day => {
            const avail = getAvailabilityForDay(day.value);
            const isAvailable = avail?.is_available ?? false;

            return (
              <div
                key={day.value}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                  isAvailable ? "border-primary/50 bg-primary/5" : "border-border"
                )}
              >
                <Switch
                  checked={isAvailable}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <span className="w-24 font-medium">{day.fullLabel}</span>
                
                {isAvailable && avail && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="time"
                      value={avail.start_time}
                      onChange={(e) => updateHours(day.value, e.target.value, avail.end_time)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">{t('to')}</span>
                    <Input
                      type="time"
                      value={avail.end_time}
                      onChange={(e) => updateHours(day.value, avail.start_time, e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}
                
                {!isAvailable && (
                  <span className="text-sm text-muted-foreground ml-auto">{t('not_available')}</span>
                )}
              </div>
            );
          })}
        </div>

        <Button 
          onClick={saveAvailability} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t('save_availability')}
        </Button>
      </CardContent>
    </Card>
  );
}
