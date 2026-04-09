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
  const [temp, setTemp] = useState<DateRange>(value);

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
        from: subDays(new Date(), 7),
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
        from: subDays(new Date(), 30),
        to: new Date(),
      }),
    },
  ];

  const handlePreset = (preset: Preset) => {
    const range = preset.value();
    setTemp(range);
    onChange(range);
    setOpen(false);
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range?.from) return;

    // Si seulement 'from' est défini, c'est le premier click
    if (!range?.to) {
      setTemp({
        from: range.from,
        to: range.from,
      });
    }
    // Si les deux sont définis, c'est le deuxième click (range complet)
    else {
      setTemp({
        from: range.from,
        to: range.to,
      });
    }
  };

  const handleApply = () => {
    onChange(temp);
    setOpen(false);
  };

  const handleClear = () => {
    const today = new Date();
    const newRange = { from: today, to: today };
    setTemp(newRange);
    onChange(newRange);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                  temp.from.toDateString() === preset.value().from.toDateString() &&
                  temp.to.toDateString() === preset.value().to.toDateString()
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
              <label className="text-xs font-semibold text-muted-foreground block">
                Sélectionnez une période
              </label>
              <Calendar
                mode="range"
                selected={{ from: temp.from, to: temp.to }}
                onSelect={handleDateRangeSelect}
                locale={fr}
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
                size="sm"
                onClick={handleApply}
                className="flex-1"
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
