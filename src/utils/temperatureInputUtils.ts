/**
 * Helpers de saisie de temperature (module HACCP)
 * La saisie est conservee en texte pour autoriser un champ vide et les valeurs
 * negatives ; la conversion en nombre n'a lieu qu'a l'enregistrement.
 */

/**
 * Nettoie une saisie de temperature :
 * - autorise un champ totalement vide
 * - autorise les valeurs negatives (un seul "-", en tete)
 * - accepte "." ou "," et normalise l'affichage sur la virgule (format FR)
 * - une seule decimale
 */
export const sanitizeTemperatureInput = (raw: string): string => {
  const negative = raw.trim().startsWith('-');
  let digits = raw.replace(/[^\d.,]/g, '').replace(/\./g, ',');

  const parts = digits.split(',');
  if (parts.length > 2) {
    digits = `${parts[0]},${parts.slice(1).join('')}`;
  }

  return `${negative ? '-' : ''}${digits}`;
};

/** Inverse le signe de la saisie courante (clavier numerique sans touche "-") */
export const toggleTemperatureSign = (value: string): string =>
  value.startsWith('-') ? value.slice(1) : `-${value}`;

/**
 * Convertit la saisie en nombre.
 * @example "-18,5" -> -18.5
 * @example "" ou "-" -> null (champ vide / saisie incomplete)
 */
export const parseTemperatureInput = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized || normalized === '-' || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Convertit une temperature stockee en saisie affichable */
export const temperatureToInput = (value: number | null | undefined): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? ''
    : String(value).replace('.', ',');
