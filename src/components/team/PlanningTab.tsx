/**
 * PlanningTab - Composant principale du Planning
 * Gère la vue semaine avec drag & drop et indicateurs de performance
 */

import React, { useState, useCallback } from 'react';
import { Employee, Shift } from '@/types/team';
import { WeekNavigation } from './WeekNavigation';
import { PlanningGrid } from './PlanningGrid';
import { ShiftDragDropProvider } from '@/contexts/ShiftDragDropContext';
import { getWeekStartDate } from '@/utils/calendarUtils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PlanningTabProps {
  employees: Employee[];
  initialShifts: Shift[];
  onShiftsUpdate?: (shifts: Shift[]) => void;
}

export const PlanningTab: React.FC<PlanningTabProps> = ({
  employees,
  initialShifts,
  onShiftsUpdate,
}) => {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [currentWeekDate, setCurrentWeekDate] = useState(() => {
    return getWeekStartDate(new Date());
  });

  // Navigation de semaine
  const handlePreviousWeek = useCallback(() => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekDate(newDate);
  }, [currentWeekDate]);

  const handleNextWeek = useCallback(() => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekDate(newDate);
  }, [currentWeekDate]);

  const handleToday = useCallback(() => {
    setCurrentWeekDate(getWeekStartDate(new Date()));
  }, []);

  // Gestion des shifts
  const handleShiftDrop = useCallback(
    (shift: Shift, targetDate: Date) => {
      setShifts((prevShifts) => {
        // Trouver et mettre à jour le shift
        const updatedShifts = prevShifts.map((s) =>
          s.id === shift.id
            ? {
                ...s,
                date: targetDate,
              }
            : s
        );
        onShiftsUpdate?.(updatedShifts);
        return updatedShifts;
      });
    },
    [onShiftsUpdate]
  );

  const handleRemoveShift = useCallback((shiftId: string) => {
    setShifts((prevShifts) => {
      const updated = prevShifts.filter((s) => s.id !== shiftId);
      onShiftsUpdate?.(updated);
      return updated;
    });
  }, [onShiftsUpdate]);

  const handleAddShift = useCallback((employeeId: string, date: Date) => {
    // Génère un nouveau shift avec des valeurs par défaut
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      employeeId,
      date,
      startTime: '11:00',
      endTime: '15:00',
      duration: 240, // 4 heures
      shiftType: 'custom',
      status: 'scheduled',
    };

    setShifts((prevShifts) => {
      const updated = [...prevShifts, newShift];
      onShiftsUpdate?.(updated);
      return updated;
    });

    // Optionnel: Ouvrir un dialog pour éditer le shift
    console.log('Nouveau shift à créer:', newShift);
  }, [onShiftsUpdate]);

  return (
    <ShiftDragDropProvider
      onShiftMoved={(shiftId, fromEmployeeId, toEmployeeId, newDate) => {
        console.log(`Shift ${shiftId} moved from ${fromEmployeeId} to ${toEmployeeId}`, newDate);
      }}
    >
      <div className="space-y-6">
        {/* En-tête avec actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planning</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Glissez-déposez les shifts pour les réassigner
            </p>
          </div>
          <Button className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau shift
          </Button>
        </div>

        {/* Navigation de semaine */}
        <WeekNavigation
          currentDate={currentWeekDate}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
        />

        {/* Grille de planning */}
        {employees.length > 0 ? (
          <PlanningGrid
            employees={employees}
            shifts={shifts}
            weekStartDate={currentWeekDate}
            onShiftDrop={handleShiftDrop}
            onRemoveShift={handleRemoveShift}
            onAddShift={handleAddShift}
          />
        ) : (
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg border-2 border-dashed border-border">
            <p className="text-muted-foreground">Aucun employé disponible</p>
          </div>
        )}

        {/* Info box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <strong>💼 Conseil :</strong> Vous pouvez glisser-déposer les shifts entre employés et jours.
          L&apos;indicateur de performance montre les heures planifiées vs contractuelles.
        </div>
      </div>
    </ShiftDragDropProvider>
  );
};

export default PlanningTab;
