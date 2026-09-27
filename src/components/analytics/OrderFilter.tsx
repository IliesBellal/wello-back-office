import { SelectableChip } from '@/components/ui/selectable-chip';
import {
  ORDER_SOURCE_OPTIONS,
  ORDER_TYPE_OPTIONS,
  DEFAULT_ORDER_FILTER,
  isOrderFilterActive,
  type OrderFilterSelection,
} from '@/utils/orderFilters';

interface OrderFilterProps {
  value: OrderFilterSelection;
  onChange: (value: OrderFilterSelection) => void;
}

/**
 * Filtre canal de commande × type de commande, commun aux onglets CA,
 * Commandes, Produits, Options, Annulations et Vente additionnelle (voir
 * DashboardAnalysis.tsx) — portée de page comme la période et les
 * établissements.
 *
 * Tout coché = aucun filtre (y compris les quelques commandes historiques
 * sans canal/type renseigné, que le serveur ne peut rattacher à aucune
 * case). Chaque groupe garde au moins une case cochée : "rien" n'aurait pas
 * de sens et serait ambigu avec "tout".
 */
export function OrderFilter({ value, onChange }: OrderFilterProps) {
  const toggle = (selected: string[], id: string) => {
    if (!selected.includes(id)) return [...selected, id];
    return selected.length > 1 ? selected.filter((s) => s !== id) : selected;
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Canal de commande</span>
        <div className="flex flex-wrap gap-2">
          {ORDER_SOURCE_OPTIONS.map((option) => (
            <SelectableChip
              key={option.id}
              selected={value.sources.includes(option.id)}
              onToggle={() => onChange({ ...value, sources: toggle(value.sources, option.id) })}
            >
              {option.label}
            </SelectableChip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Type de commande</span>
        <div className="flex flex-wrap gap-2">
          {ORDER_TYPE_OPTIONS.map((option) => (
            <SelectableChip
              key={option.id}
              selected={value.orderTypes.includes(option.id)}
              onToggle={() => onChange({ ...value, orderTypes: toggle(value.orderTypes, option.id) })}
            >
              {option.label}
            </SelectableChip>
          ))}
        </div>
      </div>

      {isOrderFilterActive(value) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ORDER_FILTER)}
          className="text-sm text-primary hover:underline"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

export default OrderFilter;
