// Formats partagés des vues de canal et d'audience : onglets ScanNOrder et
// Borne de la page Analyse, Franchise → Statistiques.

export const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/** Part de part dans total, « — » si total est nul. */
export const pct = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1)} %` : '—');

/** YYYY-MM-DD → JJ/MM (axe des graphiques). */
export const dayLabel = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

export const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

/** Durée en secondes → « 1 min 58 s », « 45 s ». */
export const durationLabel = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined) return '—';
  const total = Math.round(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return min > 0 ? `${min} min ${String(sec).padStart(2, '0')} s` : `${sec} s`;
};

// Provenance d'une visite (normalizeSource côté API) ; toute autre valeur est
// un lien marqué (utm_source / src).
const SOURCE_LABELS: Record<string, string> = {
  qr_table: 'QR de table',
  direct: 'Direct ou QR principal',
  hub: 'Hub de franchise',
  search: 'Moteur de recherche',
  social: 'Réseaux sociaux',
  referral: 'Autre site',
  unknown: 'Origine inconnue',
};

export const sourceLabel = (source: string, overrides: Record<string, string> = {}) =>
  overrides[source] ?? SOURCE_LABELS[source] ?? `Lien « ${source} »`;
