/**
 * Utilitaires de calendrier pour le module Planning
 */

/**
 * Obtient le lundi d'une semaine donnée (ou ajuste si c'est déjà un lundi)
 */
export const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

/**
 * Retourne un tableau de 7 dates : lundi à dimanche
 */
export const getWeekDates = (weekStartDate: Date): Date[] => {
  const dates: Date[] = [];
  const startDate = new Date(weekStartDate);
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
};

/**
 * Formate une date au format "lun 15 avr"
 */
export const formatDateShort = (date: Date, locale = 'fr-FR'): string => {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Formate une date au format "Lundi 15 avril"
 */
export const formatDateFull = (date: Date, locale = 'fr-FR'): string => {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

/**
 * Retourne le numéro de semaine ISO
 */
export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/**
 * Vérifie si deux dates sont le même jour
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Formate une durée (heures:minutes) pour l'affichage
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

/**
 * Calcule la durée en minutes entre deux heures
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes - startMinutes;
};

/**
 * Préselectionne la semaine de travail (lundi à samedi)
 */
export const getWorkWeekDates = (weekStartDate: Date): Date[] => {
  const dates = getWeekDates(weekStartDate);
  return dates.slice(0, 6); // Lundi à samedi
};

/**
 * Obtient le jour de la semaine en français
 */
export const getDayNameFr = (date: Date): string => {
  const days = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
  ];
  return days[date.getDay()];
};

/**
 * Formate une durée en minutes en heures et minutes (ex: "4h", "4h30m")
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
};

/**
 * Formate une durée en heures décimales (ex: "4.50")
 */
export const formatHours = (minutes: number): string => {
  return (minutes / 60).toFixed(2);
};

/**
 * Calcule les heures totales planifiées pour un employé sur une plage de dates
 */
export const calculateEmployeeHours = (
  shifts: Array<{ employeeId: string; date: Date; duration: number }>,
  employeeId: string,
  startDate: Date,
  endDate: Date
): number => {
  return shifts
    .filter(
      (shift) =>
        shift.employeeId === employeeId &&
        shift.date >= startDate &&
        shift.date <= endDate
    )
    .reduce((total, shift) => total + shift.duration, 0);
};
