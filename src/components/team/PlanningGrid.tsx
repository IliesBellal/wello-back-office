/**
 * PlanningGrid - Grille principale du planning
 * Affiche les employés en lignes et les jours en colonnes
 */

import React from 'react';
import { Employee, Shift } from '@/types/team';
import { DropZoneCell } from './DropZoneCell';
import { HourPerformanceIndicator } from './HourPerformanceIndicator';
import { formatDateShort, getWorkWeekDates, calculateEmployeeHours } from '@/utils/calendarUtils';

interface PlanningGridProps {
  employees: Employee[];
  shifts: Shift[];
  weekStartDate: Date;
  onShiftDrop?: (shift: Shift, targetDate: Date) => void;
  onRemoveShift?: (shiftId: string) => void;
  onAddShift?: (employeeId: string, date: Date) => void;
}

export const PlanningGrid: React.FC<PlanningGridProps> = ({
  employees,
  shifts,
  weekStartDate,
  onShiftDrop,
  onRemoveShift,
  onAddShift,
}) => {
  const weekDates = getWorkWeekDates(weekStartDate); // Lun-Sam

  return (
    <div className="space-y-4 overflow-x-auto">
      {/* En-têtes des jours */}
      <div className="sticky top-0 z-10 bg-white">
        <div className="grid grid-cols-[200px_repeat(6,_1fr)] gap-2 mb-4">
          <div className="font-semibold text-sm text-neutral-700 py-2">
            Employés
          </div>
          {weekDates.map((date) => (
            <div
              key={date.toISOString()}
              className="text-center font-semibold text-sm text-neutral-700 py-2 px-2 rounded-md bg-neutral-50 border border-neutral-200"
            >
              <div>{formatDateShort(date)}</div>
              <div className="text-xs text-neutral-500">
                {date.getDate()}/{String(date.getMonth() + 1).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rangées des employés */}
      <div className="space-y-3">
        {employees.map((employee) => {
          // Calcul des heures pour cette semaine
          const weekStart = new Date(weekStartDate);
          const weekEnd = new Date(weekStartDate);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekScheduledHours = calculateEmployeeHours(
            shifts,
            employee.id,
            weekStart,
            weekEnd
          );

          return (
            <div key={employee.id} className="space-y-2">
              {/* Rangée de l'employé */}
              <div className="grid grid-cols-[200px_repeat(6,_1fr)] gap-2">
                {/* Colonne employé */}
                <div className="font-semibold text-sm text-neutral-900 py-2 px-3 rounded-md bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                  <div>{employee.firstName} {employee.lastName}</div>
                  <div className="text-xs font-normal text-neutral-600 mt-1">
                    {employee.position} • {employee.contractType}
                  </div>
                </div>

                {/* Cellules de drop zones */}
                {weekDates.map((date) => {
                  const dayShifts = shifts.filter(
                    (s) =>
                      s.employeeId === employee.id &&
                      s.date.toISOString().split('T')[0] ===
                        date.toISOString().split('T')[0]
                  );

                  return (
                    <DropZoneCell
                      key={`${employee.id}-${date.toISOString()}`}
                      employee={employee}
                      date={date}
                      shifts={dayShifts}
                      onShiftDrop={onShiftDrop}
                      onRemoveShift={onRemoveShift}
                      onAddShift={onAddShift}
                    />
                  );
                })}
              </div>

              {/* Indicateur de performance */}
              <HourPerformanceIndicator
                scheduledHours={weekScheduledHours}
                contractHours={employee.weeklyHours * 60}
                className="ml-[200px]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanningGrid;
