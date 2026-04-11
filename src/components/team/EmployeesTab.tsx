/**
 * EmployeesTab - Onglet de gestion des employés
 * Affiche une table triable avec les employés et détails dans un Sheet
 */

import React, { useState } from 'react';
import { Employee } from '@/types/team';
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
import { Plus, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { EmployeeDetailsSheet } from './EmployeeDetailsSheet';

type SortKey = 'firstName' | 'lastName' | 'contractType' | 'weeklyHours' | 'position';
type SortDir = 'asc' | 'desc';

interface EmployeesTabProps {
  employees: Employee[];
  onAddEmployee?: () => void;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  onAddEmployee,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('firstName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Tri des données
  const sortedEmployees = [...employees].sort((a, b) => {
    let aVal: any = a[sortKey];
    let bVal: any = b[sortKey];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string).toLowerCase();
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (column !== sortKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  const handleRowClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSheetOpen(true);
  };

  const contractColors: Record<string, string> = {
    CDI: 'bg-blue-100 text-blue-900',
    CDD: 'bg-orange-100 text-orange-900',
    Alternant: 'bg-purple-100 text-purple-900',
    Stagiaire: 'bg-pink-100 text-pink-900',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-900',
    on_leave: 'bg-yellow-100 text-yellow-900',
    inactive: 'bg-red-100 text-red-900',
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Employés</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {employees.length} employé{employees.length !== 1 ? 's' : ''} dans votre équipe
          </p>
        </div>
        <Button className="bg-gradient-primary" onClick={onAddEmployee}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter employé
        </Button>
      </div>

      {/* Table */}
      {employees.length > 0 ? (
        <Card className="bg-card border border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-muted">
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('firstName')}>
                      <div className="flex items-center gap-2">
                        Nom <SortIcon column="firstName" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('position')}>
                      <div className="flex items-center gap-2">
                        Poste <SortIcon column="position" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('contractType')}>
                      <div className="flex items-center gap-2">
                        Contrat <SortIcon column="contractType" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('weeklyHours')}>
                      <div className="flex items-center justify-end gap-2">
                        Heures <SortIcon column="weeklyHours" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {sortedEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  onClick={() => handleRowClick(employee)}
                  className="cursor-pointer hover:bg-muted transition-colors"
                >
                  <TableCell className="font-semibold">
                    {employee.firstName} {employee.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {employee.position || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={contractColors[employee.contractType]}>
                      {employee.contractType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {employee.weeklyHours}h
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={statusColors[employee.status]}>
                      {employee.status === 'active'
                        ? 'Actif'
                        : employee.status === 'on_leave'
                        ? 'Congé'
                        : 'Inactif'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground font-medium">Aucun employé</p>
            <p className="text-sm text-muted-foreground mt-1">
              Commencez par ajouter un premier employé à votre équipe
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
        <strong>💡 Conseil :</strong> Cliquez sur une rangée pour voir les détails et modifier l&apos;employé
      </div>

      {/* Sheet détails employé */}
      <EmployeeDetailsSheet
        employee={selectedEmployee}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};
