/**
 * TimesheetsTab - Onglet des pointages
 * Utilise tableau extensible avec code couleur pour écarts horaires
 */

import React from 'react';
import { Employee, Timesheet } from '@/types/team';
import { ExpandableDataTable, ColumnConfig } from '@/components/shared/ExpandableDataTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface TimesheetsTabProps {
  employees: Employee[];
  timesheets: Timesheet[];
}

// Données agrégées pour le tableau principal (résumé par employé)
interface EmployeeSummary {
  id: string;
  employeeName: string;
  totalHours: number;
  daysWorked: number;
  averageHours: number;
  lastCheckIn?: string;
}

export const TimesheetsTab: React.FC<TimesheetsTabProps> = ({
  employees,
  timesheets,
}) => {
  // Agrégation des pointages par employé
  const employeeSummaries: EmployeeSummary[] = employees.map((emp) => {
    const empTimesheets = timesheets.filter((ts) => ts.employeeId === emp.id);
    const totalHours = empTimesheets.reduce((sum, ts) => sum + (ts.totalHours || 0), 0);
    const daysWorked = empTimesheets.length;
    const averageHours = daysWorked > 0 ? totalHours / daysWorked : 0;
    const lastCheckIn = empTimesheets.length > 0 ? empTimesheets[0].checkInTime : undefined;

    return {
      id: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      totalHours,
      daysWorked,
      averageHours,
      lastCheckIn,
    };
  });

  // Helper pour formater les heures/minutes
  const formatHoursMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h${mins}m`;
  };

  // Colonnes du tableau principal
  const summaryColumns: ColumnConfig<EmployeeSummary>[] = [
    {
      key: 'employeeName',
      label: 'Employé',
      sortable: true,
      align: 'left',
    },
    {
      key: 'daysWorked',
      label: 'Jours travaillés',
      sortable: true,
      align: 'center',
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
      key: 'totalHours',
      label: 'Total heures',
      sortable: true,
      align: 'right',
      render: (value) => <span className="font-semibold">{formatHoursMinutes(value)}</span>,
    },
    {
      key: 'averageHours',
      label: 'Moy./jour',
      sortable: true,
      align: 'right',
      render: (value) => <span>{formatHoursMinutes(value)}</span>,
    },
  ];

  // Rendu des rangées étendues (détail par jour)
  const renderExpandedRow = (summary: EmployeeSummary) => {
    const empTimesheets = timesheets
      .filter((ts) => ts.employeeId === summary.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (empTimesheets.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground text-sm">
          Aucun pointage pour cet employé
        </div>
      );
    }

    return (
      <div className="p-6 bg-neutral-50 space-y-3">
        <h4 className="font-semibold text-foreground text-sm">Historique de pointage</h4>
        <div className="space-y-2">
          {empTimesheets.map((ts) => {
            const hours = Math.floor((ts.totalHours || 0) / 60);
            const minutes = Math.round((ts.totalHours || 0) % 60);
            const hoursDuration = ((ts.totalHours || 0) / 60).toFixed(2);
            const contractHours = 8; // Référence (peut varier)
            const variance = parseFloat(hoursDuration) - contractHours;

            // Code couleur basé sur l'écart
            let statusColor = 'bg-green-50 border-green-200'; // OK
            let statusBadge = 'bg-green-100 text-green-900';
            if (Math.abs(variance) > 1) {
              if (variance < 0) {
                statusColor = 'bg-orange-50 border-orange-200';
                statusBadge = 'bg-orange-100 text-orange-900';
              } else {
                statusColor = 'bg-blue-50 border-blue-200';
                statusBadge = 'bg-blue-100 text-blue-900';
              }
            }
            if (variance < -2) {
              statusColor = 'bg-red-50 border-red-200';
              statusBadge = 'bg-red-100 text-red-900';
            }

            return (
              <div
                key={ts.id}
                className={`p-3 border rounded ${statusColor} flex items-center justify-between`}
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm text-foreground">
                    {new Date(ts.date).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {ts.checkInTime && ts.checkOutTime ? (
                      <>
                        {ts.checkInTime} → {ts.checkOutTime}
                      </>
                    ) : (
                      <span className="text-orange-600">
                        Pointage incomplet
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {hours}h{minutes}m
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {variance > 0 ? '+' : ''}{variance.toFixed(2)}h
                    </div>
                  </div>
                  <Badge className={statusBadge}>
                    {Math.abs(variance) <= 0.5
                      ? '✓ OK'
                      : variance < 0
                      ? '⚠ Moins'
                      : variance > 1
                      ? '↑ Plus'
                      : ''}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      ts.status === 'approved'
                        ? 'border-green-300 text-green-700'
                        : 'border-yellow-300 text-yellow-700'
                    }`}
                  >
                    {ts.status === 'approved' ? 'Validé' : 'En attente'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pointages</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Suivi des heures travaillées par employé
        </p>
      </div>

      <Card>
        {timesheets.length > 0 ? (
          <CardContent className="p-0">
            <ExpandableDataTable
              columns={summaryColumns}
              data={employeeSummaries}
              expandableRowKey="id"
              renderExpandedRow={renderExpandedRow}
              initialSortBy="employeeName"
              initialSortDir="asc"
              emptyMessage="Aucun pointage"
              emptyIcon={<Clock className="w-12 h-12 text-muted-foreground" />}
            />
          </CardContent>
        ) : (
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">Aucun pointage enregistré</p>
              <p className="text-sm text-muted-foreground mt-2">
                Les pointages apparaîtront ici une fois enregistrés
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Légende des couleurs */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-lg border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-muted-foreground">Conforme ±30min</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-400" />
          <span className="text-xs text-muted-foreground">Léger écart</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-xs text-muted-foreground">Grand écart</span>
        </div>
      </div>

      {/* Info box */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
        <strong>💡 Conseil :</strong> Cliquez sur une rangée pour voir l&apos;historique détaillé des pointages
      </div>
    </div>
  );
};
