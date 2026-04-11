/**
 * Types pour le module Équipe
 */

export type ContractType = 'CDI' | 'CDD' | 'Alternant' | 'Stagiaire';
export type ShiftStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
export type LeaveDayType = 'vacation' | 'sick' | 'personal' | 'unpaid';

/**
 * Employé
 */
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  contractType: ContractType;
  weeklyHours: number; // Heures contractuelles par semaine
  startDate: Date;
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  position?: string;
}

/**
 * Shift (horaire de travail)
 */
export interface Shift {
  id: string;
  employeeId: string;
  date: Date; // Date du shift
  startTime: string; // Format HH:mm
  endTime: string; // Format HH:mm
  duration: number; // Durée en minutes
  shiftType?: 'morning' | 'afternoon' | 'evening' | 'full' | 'custom'; // Type de shift
  status: ShiftStatus;
  notes?: string;
}

/**
 * Congé
 */
export interface LeaveDay {
  id: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  type: LeaveDayType;
  status: 'requested' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

/**
 * Pointage
 */
export interface Timesheet {
  id: string;
  employeeId: string;
  date: Date;
  checkInTime?: string; // Format HH:mm
  checkOutTime?: string; // Format HH:mm
  totalHours?: number; // Durée réelle en minutes
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Données agrégées pour le week planning
 */
export interface WeekPlanningData {
  week: number;
  year: number;
  startDate: Date;
  employees: Employee[];
  shifts: Shift[];
  leaves: LeaveDay[];
}

/**
 * Tableau de performance
 */
export interface EmployeeSchedulePerformance {
  employeeId: string;
  dayOfWeek: number; // 0-6 (dimanche-samedi)
  scheduledHours: number;
  contractHours: number;
  hoursVariance: number; // programmées - contrat (peut être négatif)
  status: 'under' | 'match' | 'over'; // under: moins que le contrat, match: égal, over: plus
}
