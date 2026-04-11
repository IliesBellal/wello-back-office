/**
 * LeaveTab - Onglet des congés et absences
 * Affiche demandes de congés avec actions d'approbation
 */

import React, { useState } from 'react';
import { Employee, LeaveDay } from '@/types/team';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X } from 'lucide-react';

interface LeaveTabProps {
  employees: Employee[];
  leaves: LeaveDay[];
  onApproveLeave?: (leaveId: string) => void;
  onRejectLeave?: (leaveId: string) => void;
}

const leaveTypeLabels: Record<string, string> = {
  vacation: 'Vacances',
  sick: 'Maladie',
  personal: 'Personnel',
  unpaid: 'Non payé',
};

const leaveTypeColors: Record<string, string> = {
  vacation: 'bg-blue-100 text-blue-900',
  sick: 'bg-red-100 text-red-900',
  personal: 'bg-purple-100 text-purple-900',
  unpaid: 'bg-gray-100 text-gray-900',
};

const statusColors: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-red-100 text-red-900',
  cancelled: 'bg-gray-100 text-gray-900',
};

export const LeaveTab: React.FC<LeaveTabProps> = ({
  employees,
  leaves,
  onApproveLeave,
  onRejectLeave,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Obtenir le nom de l'employé
  const getEmployeeName = (employeeId: string): string => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Employé inconnu';
  };

  // Formater une plage de dates
  const formatDateRange = (start: Date, end: Date): string => {
    const startStr = start.toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
    });
    const endStr = end.toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (startStr === endStr) {
      return startStr;
    }
    return `${startStr} - ${endStr}`;
  };

  // Calculer le nombre de jours
  const getDayCount = (start: Date, end: Date): number => {
    const one_day = 1000 * 60 * 60 * 24;
    return Math.ceil((end.getTime() - start.getTime()) / one_day) + 1;
  };

  const handleApprove = (leaveId: string) => {
    setProcessingId(leaveId);
    setTimeout(() => {
      onApproveLeave?.(leaveId);
      setProcessingId(null);
    }, 300);
  };

  const handleReject = (leaveId: string) => {
    setProcessingId(leaveId);
    setTimeout(() => {
      onRejectLeave?.(leaveId);
      setProcessingId(null);
    }, 300);
  };

  const requestedLeaves = leaves.filter((l) => l.status === 'requested');
  const approvedLeaves = leaves.filter((l) => l.status === 'approved');
  const rejectedLeaves = leaves.filter((l) => l.status === 'rejected');

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Congés & Absences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion des demandes de congés et des absences
        </p>
      </div>

      {/* Demandes en attente */}
      {requestedLeaves.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
            En attente d'approbation ({requestedLeaves.length})
          </h3>

          <Card className="bg-card border border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow className="hover:bg-muted">
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead align="center">Jours</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestedLeaves.map((leave) => (
                  <TableRow key={leave.id} className="hover:bg-neutral-50">
                    <TableCell className="font-semibold">
                      {getEmployeeName(leave.employeeId)}
                    </TableCell>
                    <TableCell>
                      <Badge className={leaveTypeColors[leave.type]}>
                        {leaveTypeLabels[leave.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateRange(leave.startDate, leave.endDate)}
                    </TableCell>
                    <TableCell align="center" className="font-semibold">
                      {getDayCount(leave.startDate, leave.endDate)}j
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {leave.reason || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-900 hover:bg-green-50 border-green-200"
                          onClick={() => handleApprove(leave.id)}
                          disabled={processingId === leave.id}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 border-red-200"
                          onClick={() => handleReject(leave.id)}
                          disabled={processingId === leave.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Congés approuvés */}
      {approvedLeaves.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Approuvés ({approvedLeaves.length})
          </h3>

          <Card className="bg-card border border-border">
            <CardHeader className="bg-green-50 border-b border-green-100 pb-3">
              <CardTitle className="text-sm font-semibold text-green-900">
                Congés approuvés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-green-50">
                    <TableRow className="hover:bg-green-50 border-b border-green-100">
                      <TableHead>Employé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead align="center">Jours</TableHead>
                      <TableHead>Raison</TableHead>
                      <TableHead className="text-right">Approuvé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedLeaves.map((leave) => (
                      <TableRow key={leave.id} className="border-b border-border hover:bg-green-50 transition-colors">
                        <TableCell className="font-semibold">
                          {getEmployeeName(leave.employeeId)}
                        </TableCell>
                        <TableCell>
                          <Badge className={leaveTypeColors[leave.type]}>
                            {leaveTypeLabels[leave.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateRange(leave.startDate, leave.endDate)}
                        </TableCell>
                        <TableCell align="center" className="font-semibold">
                          {getDayCount(leave.startDate, leave.endDate)}j
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {leave.reason || '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {leave.approvedAt
                            ? new Date(leave.approvedAt).toLocaleDateString('fr-FR')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Congés rejetés */}
      {rejectedLeaves.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
            Rejetés ({rejectedLeaves.length})
          </h3>

          <Card className="bg-card border border-border opacity-60">
            <CardHeader className="bg-red-50 border-b border-red-100 pb-3">
              <CardTitle className="text-sm font-semibold text-red-900">
                Congés rejetés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-red-50">
                    <TableRow className="hover:bg-red-50 border-b border-red-100">
                      <TableHead>Employé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead align="center">Jours</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedLeaves.map((leave) => (
                      <TableRow key={leave.id} className="border-b border-border hover:bg-red-50 transition-colors">
                        <TableCell className="font-semibold line-through">
                          {getEmployeeName(leave.employeeId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {leaveTypeLabels[leave.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateRange(leave.startDate, leave.endDate)}
                        </TableCell>
                        <TableCell align="center" className="text-muted-foreground">
                          {getDayCount(leave.startDate, leave.endDate)}j
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={statusColors[leave.status]}>
                            Rejeté
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* État vide */}
      {leaves.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Aucune demande de congé</p>
            <p className="text-sm text-muted-foreground mt-2">
              Les demandes de congés apparaîtront ici
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="pt-3 pb-3 text-xs text-blue-900">
          <strong>💼 Workflow :</strong> Les demandes en attente peuvent être approuvées ou refusées. Une fois confirmées, elles apparaissent dans la section approuvée.
        </CardContent>
      </Card>
    </div>
  );
};
