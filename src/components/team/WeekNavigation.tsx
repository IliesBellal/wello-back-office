/**
 * WeekNavigation - Navigation de semaines
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeekNumber, formatDateFull } from '@/utils/calendarUtils';

interface WeekNavigationProps {
  currentDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export const WeekNavigation: React.FC<WeekNavigationProps> = ({
  currentDate,
  onPreviousWeek,
  onNextWeek,
  onToday,
}) => {
  const weekNumber = getWeekNumber(currentDate);
  const year = currentDate.getFullYear();

  // Début et fin de la semaine
  const weekStart = new Date(currentDate);
  const dayOfWeek = weekStart.getDay();
  const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStart.setDate(diff);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); // Samedi (travail jusqu'au samedi)

  return (
    <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-lg border border-neutral-200">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousWeek}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="text-xs"
        >
          <Calendar className="w-3 h-3 mr-2" />
          Aujourd&apos;hui
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextWeek}
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-sm font-semibold text-neutral-700">
        <div>Semaine {weekNumber} • {year}</div>
        <div className="text-xs text-neutral-500">
          {formatDateFull(weekStart)} - {formatDateFull(weekEnd)}
        </div>
      </div>

      <div className="w-20" /> {/* Spacer pour l'alignement */}
    </div>
  );
};

export default WeekNavigation;
