/**
 * Style des champs de saisie du parcours d'import.
 *
 * Les `Input` et `SelectTrigger` du design system sont en `bg-background`, qui
 * se confond avec les surfaces du parcours — cartes, lignes de tableau,
 * bandeaux. Sur une grille de saisie dense, on ne distingue plus ce qui est
 * remplissable de ce qui ne l'est pas.
 *
 * Le fond blanc est posé ici plutôt que dans les composants du design system :
 * il ne concerne que ce parcours pour l'instant, et le changer ailleurs
 * toucherait toute l'application.
 */
export const IMPORT_FIELD_CLASS = 'bg-white';
