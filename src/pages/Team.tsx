/**
 * Page Team - Module Équipe
 * Affiche l'interface complète avec onglets Planning, Employés, Pointages, Congés
 */

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TabSystem } from '@/components/shared/TabSystem';
import {
  PlanningTab,
  EmployeesTab,
  TimesheetsTab,
  LeaveTab,
} from '@/components/team';
import { mockEmployees, generateWeeklyShifts } from '@/services/team/mockData';
import { mockTimesheets, mockLeaves } from '@/services/team/teamMockDataExtended';
import { getWeekStartDate } from '@/utils/calendarUtils';
import { Shift, LeaveDay } from '@/types/team';

export default function Team() {
  const [activeTab, setActiveTab] = useState('planning');
  const [shifts, setShifts] = useState<Shift[]>(() =>
    generateWeeklyShifts(mockEmployees, getWeekStartDate(new Date()))
  );
  const [leaves, setLeaves] = useState<LeaveDay[]>(mockLeaves);

  const tabs = [
    { id: 'planning', label: '📅 Planning' },
    { id: 'employees', label: '👥 Employés' },
    { id: 'timesheets', label: '⏱️ Pointages' },
    { id: 'leaves', label: '🌴 Congés' },
  ];

  const handleShiftsUpdate = (updatedShifts: Shift[]) => {
    setShifts(updatedShifts);
    console.log('Shifts updated:', updatedShifts);
  };

  const handleApproveLeave = (leaveId: string) => {
    setLeaves((prev) =>
      prev.map((leave) =>
        leave.id === leaveId
          ? {
              ...leave,
              status: 'approved' as const,
              approvedAt: new Date(),
              approvedBy: 'Vous',
            }
          : leave
      )
    );
    console.log('Leave approved:', leaveId);
  };

  const handleRejectLeave = (leaveId: string) => {
    setLeaves((prev) =>
      prev.map((leave) =>
        leave.id === leaveId
          ? { ...leave, status: 'rejected' as const }
          : leave
      )
    );
    console.log('Leave rejected:', leaveId);
  };

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'planning':
        return (
          <PlanningTab
            employees={mockEmployees}
            initialShifts={shifts}
            onShiftsUpdate={handleShiftsUpdate}
          />
        );
      case 'employees':
        return <EmployeesTab employees={mockEmployees} />;
      case 'timesheets':
        return (
          <TimesheetsTab
            employees={mockEmployees}
            timesheets={mockTimesheets}
          />
        );
      case 'leaves':
        return (
          <LeaveTab
            employees={mockEmployees}
            leaves={leaves}
            onApproveLeave={handleApproveLeave}
            onRejectLeave={handleRejectLeave}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
            👔 Équipe
          </h1>
          <p className="text-neutral-600 mt-2">
            Gestion complète de votre équipe : planning, employés, pointages et congés
          </p>
        </div>

        {/* Onglets */}
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          renderContent={renderTabContent}
          className="mt-6"
        />
      </div>
    </DashboardLayout>
  );
}
