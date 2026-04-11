/**
 * Page Équipe - Planning
 * Vue hebdomadaire du planning avec drag & drop
 */

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlanningTab } from '@/components/team';
import { mockEmployees, generateWeeklyShifts } from '@/services/team/mockData';
import { getWeekStartDate } from '@/utils/calendarUtils';
import { Shift } from '@/types/team';

export default function EquipePlanning() {
  const [shifts, setShifts] = useState<Shift[]>(() =>
    generateWeeklyShifts(mockEmployees, getWeekStartDate(new Date()))
  );

  const handleShiftsUpdate = (updatedShifts: Shift[]) => {
    setShifts(updatedShifts);
    console.log('Shifts updated:', updatedShifts);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Planning
          </h1>
          <p className="text-sm text-muted-foreground">
            Organisez les shifts de votre équipe pour la semaine
          </p>
        </div>

        <PlanningTab
          employees={mockEmployees}
          initialShifts={shifts}
          onShiftsUpdate={handleShiftsUpdate}
        />
      </div>
    </DashboardLayout>
  );
}
