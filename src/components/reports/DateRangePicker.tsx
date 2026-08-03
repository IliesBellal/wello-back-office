import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export const DateRangePicker = ({ dateRange, onDateRangeChange }: DateRangePickerProps) => {
  // On track manuellement le 1er clic : react-day-picker (mode="range" + onSelect)
  // ne fait qu'étendre le "from"/"to" existant au lieu de repartir d'une nouvelle
  // sélection, ce qui empêchait de choisir une période complètement différente.
  const [firstClick, setFirstClick] = useState<Date | null>(null);

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;

    if (firstClick === null) {
      setFirstClick(day);
      onDateRangeChange({ from: day, to: day });
      return;
    }

    const start = firstClick < day ? firstClick : day;
    const end = firstClick < day ? day : firstClick;
    onDateRangeChange({ from: start, to: end });
    setFirstClick(null);
  };

  return (
    <Popover onOpenChange={() => setFirstClick(null)}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(dateRange.from, 'dd MMM yyyy', { locale: fr })} - {format(dateRange.to, 'dd MMM yyyy', { locale: fr })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={{ from: dateRange.from, to: dateRange.to }}
          onDayClick={handleDayClick}
          numberOfMonths={2}
          locale={fr}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};
