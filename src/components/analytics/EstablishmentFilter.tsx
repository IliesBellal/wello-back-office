import { SelectableChip } from '@/components/ui/selectable-chip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { AccessibleMerchant, ComparisonMode } from '@/services/analyticsService';

interface EstablishmentFilterProps {
  merchants: AccessibleMerchant[];
  selected: string[];
  onChange: (selected: string[]) => void;
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
}

/**
 * Sélecteur global multi-établissements, à côté du filtre de période (PROMPT
 * 24 Phase 3) — portée commune à toute la page, comme la période. N'est
 * rendu par l'appelant que si l'utilisateur a accès à plus d'un
 * établissement (voir DashboardAnalysis.tsx) : en dessous de 2, il n'y a
 * rien à filtrer ni à comparer.
 *
 * Le sélecteur de mode (cumulé/comparé) n'a de sens qu'au-delà d'un
 * établissement sélectionné — désactivé plutôt que masqué quand un seul est
 * sélectionné, pour que sa présence reste prévisible (PROMPT 24 : "masque-le
 * ou désactive-le [...] plutôt que d'afficher un choix sans effet").
 */
export function EstablishmentFilter({
  merchants,
  selected,
  onChange,
  mode,
  onModeChange,
}: EstablishmentFilterProps) {
  const handleToggle = (merchantId: string) => {
    if (selected.includes(merchantId)) {
      onChange(selected.filter((id) => id !== merchantId));
    } else {
      onChange([...selected, merchantId]);
    }
  };

  const modeDisabled = selected.length <= 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {merchants.map((merchant) => (
          <SelectableChip
            key={merchant.merchant_id}
            selected={selected.includes(merchant.merchant_id)}
            onToggle={() => handleToggle(merchant.merchant_id)}
          >
            {merchant.name}
          </SelectableChip>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-sm ${modeDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
          Affichage
        </span>
        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(value) => value && onModeChange(value as ComparisonMode)}
          disabled={modeDisabled}
        >
          <ToggleGroupItem value="cumule" aria-label="Cumulé">Cumulé</ToggleGroupItem>
          <ToggleGroupItem value="compare" aria-label="Comparé">Comparé</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

export default EstablishmentFilter;
