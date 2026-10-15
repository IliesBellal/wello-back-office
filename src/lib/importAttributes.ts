import type { ImportPreviewAttribute } from '@/types/import';

/** Règle de choix d'un groupe d'options, en une expression lisible. */
export const describeAttributeRule = (attribute: ImportPreviewAttribute): string => {
  const { min_options: min, max_options: max } = attribute;
  if (min === 1 && max === 1) return 'choix unique, obligatoire';
  if (min === 0 && max === 1) return 'un choix au plus';
  if (min > 0 && min === max) return `${min} choix obligatoires`;
  if (min > 0) return `${min} à ${max} choix, obligatoire`;
  return `jusqu’à ${max} choix, facultatif`;
};
