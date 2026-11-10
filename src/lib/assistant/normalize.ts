/**
 * Normalisation du texte et similarité entre mots.
 *
 * La même fonction `normalize` est appliquée aux phrases tapées, aux termes du
 * modèle et (côté API, internal/modules/assistant/normalize.go) aux termes
 * appris : toute divergence casserait la correspondance. Règles :
 *   1. minuscules ;
 *   2. ligatures œ → oe, æ → ae, ß → ss ;
 *   3. accents retirés (décomposition NFD puis suppression des diacritiques) ;
 *   4. tout caractère hors [a-z0-9] devient une espace (apostrophes comprises :
 *      « aujourd'hui » → « aujourd hui ») ;
 *   5. espaces multiples réduites, bords supprimés.
 */

const LIGATURES: Record<string, string> = { 'œ': 'oe', 'æ': 'ae', 'ß': 'ss' };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[œæß]/g, (c) => LIGATURES[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(normalized: string): string[] {
  return normalized ? normalized.split(' ') : [];
}

/**
 * Racinisation légère du français : pluriel (s, x) puis e final.
 * « épuisées » → « epuise » → « epuis » ; « épuisé » → « epuis ».
 */
export function stem(token: string): string {
  let t = token;
  if (t.length > 3 && (t.endsWith('s') || t.endsWith('x'))) t = t.slice(0, -1);
  // Accord : « épuisée » et « épuisé » partagent la racine « epuis ».
  for (let k = 0; k < 2 && t.length > 4 && t.endsWith('e'); k++) t = t.slice(0, -1);
  return t;
}

/**
 * Distance de Damerau-Levenshtein restreinte (transpositions adjacentes),
 * bornée : renvoie `max + 1` dès que la distance dépasse `max`.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let prevPrev = new Array<number>(m + 1).fill(0);
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let cur = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prevPrev, prev, cur] = [prev, cur, prevPrev];
  }
  return prev[m];
}

/**
 * Similarité 0..1 entre deux mots normalisés.
 *  - identiques : 1 ;
 *  - même racine (pluriel, accord) : 0.95 ;
 *  - une faute (mots de 4 lettres et plus) : 0.85 ;
 *  - deux fautes (mots de 7 lettres et plus) : 0.75 ;
 *  - sinon 0. Les mots courts doivent être exacts (« ca » ≠ « la »).
 */
export function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (stem(a) === stem(b)) return 0.95;
  const min = Math.min(a.length, b.length);
  if (min < 4) return 0;
  // Les chiffres ne tolèrent aucune faute (« 12 » ≠ « 13 »).
  if (/\d/.test(a) || /\d/.test(b)) return 0;
  const maxD = min >= 7 ? 2 : 1;
  const d = editDistance(a, b, maxD);
  if (d > maxD) return 0;
  return d === 1 ? 0.85 : 0.75;
}

export const MIN_TOKEN_SIMILARITY = 0.75;

/** Masque e-mails et numéros de téléphone avant tout envoi au serveur. */
export function maskPersonalData(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/(?:\+?\d[\s.-]?){8,}\d/g, '[tel]');
}
