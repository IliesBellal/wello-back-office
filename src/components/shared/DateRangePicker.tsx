import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

export function DateRangePicker({ value, onChange, disabled = false }: DateRangePickerProps) {
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const presets = [
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

  const handlePreset = (fn: () => DateRange) => {
    onChange(fn());
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={
              value.from === preset.value().from && value.to === preset.value().to
                ? 'default'
                : 'outline'
            }
            size="sm"
            onClick={() => handlePreset(preset.value)}
            disabled={disabled}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-sm text-muted-foreground">Personnalisé :</span>

        {/* From Date */}
        <Popover open={openFrom} onOpenChange={setOpenFrom}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn('justify-start text-left font-normal')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(value.from, 'dd/MM/yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.from}
              onSelect={(date) => {
                if (date) {
                  onChange({ ...value, from: date });
                  setOpenFrom(false);
                }
              }}
              disabled={{ after: value.to }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">à</span>

        {/* To Date */}
        <Popover open={openTo} onOpenChange={setOpenTo}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn('justify-start text-left font-normal')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(value.to, 'dd/MM/yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value.to}
              onSelect={(date) => {
                if (date) {
                  onChange({ ...value, to: date });
                  setOpenTo(false);
                }
              }}
              disabled={{ before: value.from }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
