interface ScopeSummaryProps {
  /** merchant_ids tels que renvoyés par scope.merchant_ids — jamais ceux demandés. */
  merchantIds: string[];
  merchantsById: Record<string, string>;
}

/**
 * Rappelle les établissements réellement utilisés par la réponse (PROMPT 24
 * Phase 3 : "l'utilisateur ne doit jamais avoir à déduire de ce qu'il a
 * demandé ce qu'il est en train de regarder"). N'est affiché que lorsque le
 * compte a accès à plus d'un établissement — sinon ce serait rappeler une
 * évidence sur chaque onglet.
 */
export function ScopeSummary({ merchantIds, merchantsById }: ScopeSummaryProps) {
  if (merchantIds.length === 0) return null;
  const names = merchantIds.map((id) => merchantsById[id] ?? id);
  return (
    <p className="text-sm text-muted-foreground">
      Établissement{names.length > 1 ? 's' : ''} affiché{names.length > 1 ? 's' : ''} : {names.join(', ')}
    </p>
  );
}

/**
 * Message affiché sur un onglet non comparable (Produits, Options, Clients,
 * Remises, Vente additionnelle) quand le mode comparé est actif avec
 * plusieurs établissements sélectionnés — PROMPT 24 Phase 3 : "ne l'ignore
 * pas en silence : dis que cet onglet agrège les établissements
 * sélectionnés. Un mode qui semble actif mais ne s'applique pas est pire
 * qu'un mode absent."
 */
export function AggregationNotice() {
  return (
    <p className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
      Cet onglet ne se compare pas établissement par établissement : les données affichées agrègent les établissements sélectionnés.
    </p>
  );
}
