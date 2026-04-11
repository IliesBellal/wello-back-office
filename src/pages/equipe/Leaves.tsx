/**
 * Page Équipe - Congés & Échanges
 * Gestion des demandes de congés et approvals
 */

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { LeaveTab } from '@/components/team';
import { mockEmployees } from '@/services/team/mockData';
import { mockLeaves } from '@/services/team/teamMockDataExtended';
import { LeaveDay } from '@/types/team';

export default function EquipeConges() {
  const [leaves, setLeaves] = useState<LeaveDay[]>(mockLeaves);

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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Congés & Échanges
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les demandes de congés et approuvez les demandes en attente
          </p>
        </div>

        <LeaveTab
          employees={mockEmployees}
          leaves={leaves}
          onApproveLeave={handleApproveLeave}
          onRejectLeave={handleRejectLeave}
        />
      </div>
    </DashboardLayout>
  );
}
