/**
 * ShiftCard - Carte affichant un shift
 * Composant draggable pour le planning
 */

import React from 'react';
import { Shift, Employee } from '@/types/team';
import { formatTimeRange, formatDuration } from '@/utils/calendarUtils';
import { GripVertical, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ShiftCardProps {
  shift: Shift;
  employee: Employee;
  isDragging?: boolean;
  onRemove?: (shiftId: string) => void;
  isDragOverlay?: boolean;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({
  shift,
  employee,
  isDragging,
  onRemove,
  isDragOverlay,
}) => {
  const shiftTypeColors: Record<string, string> = {
    morning: 'bg-amber-100 border-amber-300 text-amber-900',
    afternoon: 'bg-blue-100 border-blue-300 text-blue-900',
    evening: 'bg-purple-100 border-purple-300 text-purple-900',
    full: 'bg-green-100 border-green-300 text-green-900',
    custom: 'bg-gray-100 border-gray-300 text-gray-900',
  };

  const color = shiftTypeColors[shift.shiftType || 'custom'];

  return (
    <Card
      className={`
        relative p-2 rounded-md text-xs cursor-grab active:cursor-grabbing
        border transition-all
        ${color}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOverlay ? 'shadow-lg scale-105' : ''}
        hover:shadow-md
      `}
      draggable
    >
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">
            {formatTimeRange(shift.startTime, shift.endTime)}
          </div>
          <div className="text-xs opacity-75">
            {formatDuration(shift.duration)}
          </div>
          {shift.notes && (
            <div className="text-xs opacity-60 truncate mt-1">{shift.notes}</div>
          )}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <GripVertical className="w-3 h-3 opacity-40" />
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(shift.id);
              }}
              className="hover:opacity-70 transition-opacity"
              title="Supprimer ce shift"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {shift.status === 'cancelled' && (
        <div className="absolute inset-0 rounded-md border-2 border-current opacity-30" />
      )}
    </Card>
  );
};

export default ShiftCard;
