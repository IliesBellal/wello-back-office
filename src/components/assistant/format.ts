const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EUR2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat('fr-FR');

export const formatEuros = (cents: number, precise = false) => (precise ? EUR2 : EUR).format(cents / 100);
export const formatNumber = (n: number) => NUM.format(n);

/** Variation en %, null si la période de comparaison est vide. */
export function deltaPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function hhmm(time: string): string {
  // « 18:00:00 » → « 18:00 » ; ISO → heure locale
  if (/^\d{2}:\d{2}/.test(time)) return time.slice(0, 5);
  const d = new Date(time);
  return Number.isNaN(d.getTime()) ? time : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
