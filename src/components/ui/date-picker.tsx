import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toUTCDateString } from '@/utils/apiDate';

interface DatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onDateChange: (date: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DatePicker({
  value,
  onDateChange,
  disabled = false,
  placeholder = 'Sélectionner une date',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Convert ISO string to Date object for Calendar using parseISO to avoid timezone issues
  const selectedDate = value ? parseISO(value) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const isoString = toUTCDateString(date);
      onDateChange(isoString);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(parseISO(value), 'dd/MM/yyyy', { locale: fr }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
