/**
 * Données mock pour le module Équipe
 */
import { Employee, Shift } from '@/types/team';

export const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@wello.fr',
    phone: '06 12 34 56 78',
    contractType: 'CDI',
    weeklyHours: 35,
    startDate: new Date('2022-01-15'),
    status: 'active',
    position: 'Serveuse',
  },
  {
    id: 'emp-002',
    firstName: 'Jean',
    lastName: 'Martin',
    email: 'jean.martin@wello.fr',
    phone: '06 98 76 54 32',
    contractType: 'CDI',
    weeklyHours: 39,
    startDate: new Date('2021-06-20'),
    status: 'active',
    position: 'Chef de cuisine',
  },
  {
    id: 'emp-003',
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@wello.fr',
    phone: '06 45 67 89 01',
    contractType: 'CDD',
    weeklyHours: 30,
    startDate: new Date('2024-03-01'),
    status: 'active',
    position: 'Serveuse',
  },
  {
    id: 'emp-004',
    firstName: 'Luc',
    lastName: 'Rousseau',
    email: 'luc.rousseau@wello.fr',
    phone: '06 23 45 67 89',
    contractType: 'CDI',
    weeklyHours: 35,
    startDate: new Date('2023-11-01'),
    status: 'active',
    position: 'Cuisinier',
  },
  {
    id: 'emp-005',
    firstName: 'Nathalie',
    lastName: 'Leclerc',
    email: 'nathalie.leclerc@wello.fr',
    phone: '06 56 78 90 12',
    contractType: 'Alternant',
    weeklyHours: 20,
    startDate: new Date('2024-09-01'),
    status: 'active',
    position: 'Serveur',
  },
];

/**
 * Génère les shifts mock pour une semaine donnée
 * @param employees Liste des employés
 * @param weekStartDate Date de début de semaine (lundi)
 */
export const generateWeeklyShifts = (
  employees: Employee[],
  weekStartDate: Date
): Shift[] => {
  const shifts: Shift[] = [];
  const shiftTemplates = [
    { startTime: '11:00', endTime: '14:30', type: 'morning' as const },
    { startTime: '19:00', endTime: '23:00', type: 'evening' as const },
    { startTime: '11:00', endTime: '23:00', type: 'full' as const },
  ];

  employees.forEach((emp) => {
    // Génère 3-5 shifts par semaine selon le contrat
    const shiftsPerWeek = Math.ceil(emp.weeklyHours / 8);

    for (let i = 0; i < shiftsPerWeek; i++) {
      const dayOffset = Math.floor(Math.random() * 6); // Lundi à samedi
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + dayOffset);

      const template = shiftTemplates[i % shiftTemplates.length];
      const [startHour, startMin] = template.startTime.split(':');
      const [endHour, endMin] = template.endTime.split(':');
      const duration =
        (parseInt(endHour) - parseInt(startHour)) * 60 +
        (parseInt(endMin) - parseInt(startMin));

      shifts.push({
        id: `shift-${emp.id}-${i}`,
        employeeId: emp.id,
        date,
        startTime: template.startTime,
        endTime: template.endTime,
        duration,
        shiftType: template.type,
        status: 'scheduled',
      });
    }
  });

  return shifts;
};

/**
 * Générateurs de données uniquement - les utilitaires sont dans calendarUtils
 */
