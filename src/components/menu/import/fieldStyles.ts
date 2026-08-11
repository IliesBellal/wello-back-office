/**
 * Style des champs de saisie posés directement sur le fond gris de la modale
 * d'import (hors tableau — `ImportProviderStep`).
 *
 * Les `Input` et `SelectTrigger` du design system sont en `bg-background`, qui
 * se confond avec ce fond. Dans les tableaux de l'import, les cellules sont
 * elles-mêmes passées en `bg-card` (comme la liste de produits) : le
 * `bg-background` par défaut des champs y suffit déjà comme contraste, ce
 * correctif ne s'applique donc plus qu'aux champs hors tableau.
 */
export const IMPORT_FIELD_CLASS = 'bg-white';
