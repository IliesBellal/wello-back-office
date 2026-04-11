/**
 * EmployeeDetailsSheet - Fiche employé détaillée s'ouvrant dans un Sheet
 */

import React from 'react';
import { Employee } from '@/types/team';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Calendar, FileText, Briefcase, Clock, Edit2 } from 'lucide-react';

interface EmployeeDetailsSheetProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (employee: Employee) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-900',
  on_leave: 'bg-yellow-100 text-yellow-900',
  inactive: 'bg-red-100 text-red-900',
};

const contractColors: Record<string, string> = {
  CDI: 'bg-blue-100 text-blue-900',
  CDD: 'bg-orange-100 text-orange-900',
  Alternant: 'bg-purple-100 text-purple-900',
  Stagiaire: 'bg-pink-100 text-pink-900',
};

export const EmployeeDetailsSheet: React.FC<EmployeeDetailsSheetProps> = ({
  employee,
  open,
  onOpenChange,
  onEdit,
}) => {
  if (!employee) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg max-h-screen overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-2xl">Fiche Employé</SheetTitle>
          <SheetDescription>
            Détails et informations professionnelles
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Avatar et Info Principale */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purp-400 flex items-center justify-center text-white text-2xl font-bold">
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Badge className={contractColors[employee.contractType]}>
                {employee.contractType}
              </Badge>
              <Badge className={statusColors[employee.status]}>
                {employee.status === 'active'
                  ? 'Actif'
                  : employee.status === 'on_leave'
                  ? 'En congé'
                  : 'Inactif'}
              </Badge>
            </div>
          </div>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm font-medium">{employee.email}</div>
                </div>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Téléphone</div>
                    <div className="text-sm font-medium">{employee.phone}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contrat & Horaires */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contrat & Horaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>Type de contrat</span>
                </div>
                <span className="font-semibold">{employee.contractType}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Heures/semaine</span>
                </div>
                <span className="font-semibold">{employee.weeklyHours}h</span>
              </div>
            </CardContent>
          </Card>

          {/* Informations Professionnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations Professionnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Date d'embauche</span>
                </div>
                <span className="text-sm font-medium">
                  {employee.startDate.toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-2">
                Employé depuis {Math.floor((Date.now() - employee.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365))}
                {' '}an(s)
              </div>
            </CardContent>
          </Card>

          {/* Documents (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 border border-dashed rounded-md">
                <FileText className="w-4 h-4" />
                <span>Aucun document fourni</span>
              </div>
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
            {onEdit && (
              <Button className="flex-1 bg-gradient-primary" onClick={() => onEdit(employee)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EmployeeDetailsSheet;
