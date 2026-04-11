/**
 * Page Équipe - Pointages
 * Vue des timesheets et pointages des employés
 */

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TimesheetsTab } from '@/components/team';
import { mockEmployees } from '@/services/team/mockData';
import { mockTimesheets } from '@/services/team/teamMockDataExtended';

export default function EquipePointages() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pointages
          </h1>
          <p className="text-sm text-muted-foreground">
            Consultez les pointages et les heures travaillées par employé
          </p>
        </div>

        <TimesheetsTab
          employees={mockEmployees}
          timesheets={mockTimesheets}
        />
      </div>
    </DashboardLayout>
  );
}
