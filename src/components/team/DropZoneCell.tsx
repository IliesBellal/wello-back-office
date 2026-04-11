/**
 * DropZoneCell - Zone de drop pour placer un shift dans la grille
 * Utilise @dnd-kit pour gérer le drag & drop
 */

import React, { useRef, useState } from 'react';
import { Shift, Employee } from '@/types/team';
import { ShiftCard } from './ShiftCard';
import { Plus } from 'lucide-react';
import { useShiftDragDrop } from '@/contexts/ShiftDragDropContext';

interface DropZoneCellProps {
  employee: Employee;
  date: Date;
  shifts: Shift[];
  onShiftDrop?: (shift: Shift, targetDate: Date) => void;
  onRemoveShift?: (shiftId: string) => void;
  onAddShift?: (employeeId: string, date: Date) => void;
  isDragOver?: boolean;
}

export const DropZoneCell: React.FC<DropZoneCellProps> = ({
  employee,
  date,
  shifts,
  onShiftDrop,
  onRemoveShift,
  onAddShift,
  isDragOver,
}) => {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isHoveringAdd, setIsHoveringAdd] = useState(false);
  const { draggedShift, setActiveDropZone, onDropShift } = useShiftDragDrop();

  const dateKey = date.toISOString().split('T')[0];
  const zoneId = `employee-${employee.id}-${dateKey}`;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropZone(zoneId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setActiveDropZone(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropZone(null);

    if (draggedShift) {
      const movedShift: Shift = {
        ...draggedShift,
        date: new Date(date),
      };
      onShiftDrop?.(movedShift, date);
      onDropShift(movedShift, employee.id, date);
    }
  };

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative min-h-24 p-2 rounded-md border-2 border-dashed transition-all
        ${isDragOver || zoneId === draggedShift?.sourceEmployeeId
          ? 'border-blue-400 bg-blue-50'
          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100'
        }
      `}
    >
      {/* Liste des shifts */}
      <div className="space-y-1.5">
        {shifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            employee={employee}
            onRemove={onRemoveShift}
          />
        ))}
      </div>

      {/* Bouton d'ajout quand vide */}
      {shifts.length === 0 && (
        <button
          onClick={() => onAddShift?.(employee.id, date)}
          onMouseEnter={() => setIsHoveringAdd(true)}
          onMouseLeave={() => setIsHoveringAdd(false)}
          className="absolute inset-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary transition-colors opacity-0 hover:opacity-100"
          title="Ajouter un shift"
        >
          <Plus className={`w-5 h-5 ${isHoveringAdd ? 'text-primary' : ''}`} />
        </button>
      )}

      {/* Indicateur glisser-déposer */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-blue-100 opacity-50">
          <span className="text-xs font-semibold text-blue-900">
            Déposez ici
          </span>
        </div>
      )}
    </div>
  );
};

export default DropZoneCell;
