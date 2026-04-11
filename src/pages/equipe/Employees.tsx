/**
 * Page Équipe - Employés
 * Liste des employés avec détails et gestion
 */

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EmployeesTab } from '@/components/team';
import { mockEmployees } from '@/services/team/mockData';

export default function EquipeEmployes() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Employés
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion de vos employés et leurs informations
          </p>
        </div>

        <EmployeesTab employees={mockEmployees} />
      </div>
    </DashboardLayout>
  );
}
