/**
 * Contexte pour gérer le drag & drop des shifts
 * Utilise @dnd-kit pour une expérience DnD fluide et accessible
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Shift, Employee } from '@/types/team';

export interface DraggedShift extends Shift {
  sourceEmployeeId: string;
  sourceDate: Date;
}

export interface ShiftDropContext {
  // État
  draggedShift: DraggedShift | null;
  activeDropZone: string | null; // Format: "employee-${empId}-${dateISO}"

  // Actions
  startDragShift: (shift: Shift, employeeId: string) => void;
  setActiveDropZone: (zoneId: string | null) => void;
  
  // Callbacks pour les opérations
  onDropShift: (
    shift: Shift,
    targetEmployeeId: string,
    targetDate: Date
  ) => void;
  onCancelDrag: () => void;
}

const DragDropContext = createContext<ShiftDropContext | undefined>(undefined);

export const ShiftDragDropProvider: React.FC<{
  children: React.ReactNode;
  onShiftMoved?: (
    shiftId: string,
    fromEmployeeId: string,
    toEmployeeId: string,
    newDate: Date
  ) => void;
}> = ({ children, onShiftMoved }) => {
  const [draggedShift, setDraggedShift] = useState<DraggedShift | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const startDragShift = useCallback((shift: Shift, employeeId: string) => {
    setDraggedShift({
      ...shift,
      sourceEmployeeId: employeeId,
      sourceDate: new Date(shift.date),
    });
  }, []);

  const onDropShift = useCallback(
    (shift: Shift, targetEmployeeId: string, targetDate: Date) => {
      if (draggedShift) {
        onShiftMoved?.(
          draggedShift.id,
          draggedShift.sourceEmployeeId,
          targetEmployeeId,
          targetDate
        );
      }
      setDraggedShift(null);
      setActiveDropZone(null);
    },
    [draggedShift, onShiftMoved]
  );

  const onCancelDrag = useCallback(() => {
    setDraggedShift(null);
    setActiveDropZone(null);
  }, []);

  const value: ShiftDropContext = {
    draggedShift,
    activeDropZone,
    startDragShift,
    setActiveDropZone,
    onDropShift,
    onCancelDrag,
  };

  return (
    <DragDropContext.Provider value={value}>{children}</DragDropContext.Provider>
  );
};

export const useShiftDragDrop = (): ShiftDropContext => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error(
      'useShiftDragDrop must be used within ShiftDragDropProvider'
    );
  }
  return context;
};
