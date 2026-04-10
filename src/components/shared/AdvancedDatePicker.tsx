import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface AdvancedDatePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

interface Preset {
  label: string;
  value: () => DateRange;
}

export function AdvancedDatePicker({ value, onChange, disabled = false }: AdvancedDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [firstClick, setFirstClick] = useState<Date | null>(null);
  const [tempRange, setTempRange] = useState<{ from: Date; to: Date } | null>(null);

  const presets: Preset[] = [
    {
      label: "Aujourd'hui",
      value: () => {
        const today = new Date();
        return { from: today, to: today };
      },
    },
    {
      label: '7 derniers jours',
      value: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },
    {
      label: 'Cette semaine',
      value: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Ce mois',
      value: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: '30 derniers jours',
      value: () => ({
        from: subDays(new Date(), 29),
        to: new Date(),
      }),
    },
  ];

  const handlePreset = (preset: Preset) => {
    const range = preset.value();
    setFirstClick(null);
    setTempRange(null);
    onChange(range);
    setOpen(false);
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;

    // Premier clic : on stocke la date
    if (firstClick === null) {
      setFirstClick(date);
      setTempRange({ from: date, to: date });
      return;
    }

    // Deuxième clic : on crée la range
    const start = firstClick < date ? firstClick : date;
    const end = firstClick < date ? date : firstClick;

    setTempRange({ from: start, to: end });
    setFirstClick(null); // Reset pour prochain cycle
  };

  const handleApply = () => {
    if (tempRange) {
      onChange(tempRange);
      setOpen(false);
      setFirstClick(null);
      setTempRange(null);
    }
  };

  const handleCancel = () => {
    setFirstClick(null);
    setTempRange(null);
    setOpen(false);
  };

  const handleClear = () => {
    const today = new Date();
    const newRange = { from: today, to: today };
    setFirstClick(null);
    setTempRange(null);
    onChange(newRange);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset au moment de l'ouverture
      setFirstClick(null);
      setTempRange(null);
    }
  };

  // Détecte si un preset est actif
  const isPresetActive = (preset: Preset) => {
    if (!tempRange) return false;
    const presetRange = preset.value();
    return (
      tempRange.from.toDateString() === presetRange.from.toDateString() &&
      tempRange.to.toDateString() === presetRange.to.toDateString()
    );
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(value.from, 'dd MMM yyyy', { locale: fr })} -{' '}
          {format(value.to, 'dd MMM yyyy', { locale: fr })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 mr-8" align="start">
        <div className="flex">
          {/* Sidebar with Presets */}
          <div className="border-r border-border bg-muted/30 w-40 p-4 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              RACCOURCIS
            </div>
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                  isPresetActive(preset)
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar Section */}
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">
                  Sélectionnez une période
                </label>
                {firstClick && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Cliquez la fin
                  </span>
                )}
              </div>
              
              {/* Affichage de la plage sélectionnée */}
              {tempRange && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  {format(tempRange.from, 'dd MMM yyyy', { locale: fr })}
                  {tempRange.to.getTime() !== tempRange.from.getTime() && 
                    ` → ${format(tempRange.to, 'dd MMM yyyy', { locale: fr })}`
                  }
                </div>
              )}

              <Calendar
                mode="range"
                selected={tempRange ? { from: tempRange.from, to: tempRange.to } : undefined}
                onDayClick={handleDateClick}
                locale={fr}
                numberOfMonths={1}
                className="rounded-md border border-border"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex-1"
              >
                Réinitialiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="flex-1"
                disabled={!tempRange || firstClick !== null}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}