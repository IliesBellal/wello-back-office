import { Badge } from '@/components/ui/badge';

// Marque une ligne de commande ajoutée depuis une suggestion de vente
// additionnelle (orderitems.is_upsell). Même violet que l'onglet Vente
// additionnelle des analyses.
export const UpsellBadge = () => (
  <Badge
    variant="outline"
    title="Ajouté depuis une suggestion de vente additionnelle"
    className="text-xs font-medium border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
  >
    Upsell
  </Badge>
);
