// Source ajoutée au lien ScanNOrder (`?src=`). ScanNOrder n'accepte que
// ^[a-z0-9_-]{1,32}$ (wello-resto-scannorder, lib/tracking/visit.ts) : toute
// autre valeur est ignorée, d'où la normalisation de la saisie libre.

export const SOURCE_NONE = 'none';
export const SOURCE_OTHER = 'other';

export const SOURCE_PRESETS: { id: string; label: string }[] = [
  { id: SOURCE_NONE, label: 'Sans' },
  { id: 'google_maps', label: 'Fiche Google' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'flyer', label: 'Flyer' },
  { id: 'site', label: 'Site web' },
  { id: SOURCE_OTHER, label: 'Autre' },
];

/** Minuscules, sans accents, espaces → `_`, 32 caractères au plus ; '' si rien d'exploitable. */
export function normalizeSource(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
    .replace(/_+$/g, '');
}

/** Lien avec `src` (remplace un `src` existant) ; lien inchangé si la source est vide. */
export function withSource(url: string, source: string): string {
  if (!source) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('src', source);
    return u.toString();
  } catch {
    return url;
  }
}
