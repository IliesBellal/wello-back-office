/**
 * Mock data pour pointages et congés
 */

import { Timesheet, LeaveDay } from '@/types/team';

export const mockTimesheets: Timesheet[] = [
  {
    id: 'ts-001',
    employeeId: 'emp-001',
    date: new Date('2024-04-08'),
    checkInTime: '11:05',
    checkOutTime: '15:10',
    totalHours: 245, // 4h05m
    status: 'approved',
  },
  {
    id: 'ts-002',
    employeeId: 'emp-001',
    date: new Date('2024-04-09'),
    checkInTime: '11:00',
    checkOutTime: '14:55',
    totalHours: 235, // 3h55m
    status: 'approved',
  },
  {
    id: 'ts-003',
    employeeId: 'emp-001',
    date: new Date('2024-04-10'),
    checkInTime: '10:55',
    checkOutTime: '15:05',
    totalHours: 250, // 4h10m
    status: 'pending',
  },
  {
    id: 'ts-004',
    employeeId: 'emp-002',
    date: new Date('2024-04-08'),
    checkInTime: '19:00',
    checkOutTime: '23:15',
    totalHours: 255, // 4h15m
    status: 'approved',
  },
];

export const mockLeaves: LeaveDay[] = [
  {
    id: 'leave-001',
    employeeId: 'emp-001',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-07'),
    type: 'vacation',
    status: 'approved',
    reason: 'Vacances d\'été',
    requestedAt: new Date('2024-04-10'),
    approvedBy: 'Manager',
    approvedAt: new Date('2024-04-10'),
  },
  {
    id: 'leave-002',
    employeeId: 'emp-003',
    startDate: new Date('2024-04-15'),
    endDate: new Date('2024-04-15'),
    type: 'sick',
    status: 'approved',
    reason: 'Maladie',
    requestedAt: new Date('2024-04-15'),
    approvedBy: 'Système automatique',
    approvedAt: new Date('2024-04-15'),
  },
  {
    id: 'leave-003',
    employeeId: 'emp-002',
    startDate: new Date('2024-04-20'),
    endDate: new Date('2024-04-21'),
    type: 'vacation',
    status: 'requested',
    reason: 'Week-end prolongé',
    requestedAt: new Date('2024-04-10'),
  },
  {
    id: 'leave-004',
    employeeId: 'emp-004',
    startDate: new Date('2024-04-25'),
    endDate: new Date('2024-04-25'),
    type: 'personal',
    status: 'requested',
    reason: 'Rendez-vous important',
    requestedAt: new Date('2024-04-09'),
  },
];
