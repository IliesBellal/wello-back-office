import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MultiSelectDropdownOption {
  id: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectDropdownOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  /**
   * Nom du champ rappelé dans le bouton dès qu'une valeur est cochée
   * (« Statut : Disponible »). Utile dans une barre de filtres, où rien d'autre
   * n'indique à quoi se rapporte la sélection.
   */
  triggerPrefix?: string;
  /**
   * Masque le libellé affiché au-dessus du bouton (il reste l'intitulé du
   * panneau). Pour une barre de filtres, où les autres champs n'ont pas de
   * libellé et où il décalerait le bouton vers le bas.
   */
  hideLabel?: boolean;
  /** Entrée d'action en pied de panneau (ex. « Nouvelle catégorie »), distincte des valeurs cochables. */
  footerAction?: { label: string; icon?: ReactNode; onClick: () => void };
}

const getTriggerLabel = (
  options: MultiSelectDropdownOption[],
  selectedIds: string[],
  placeholder: string,
  prefix?: string
): string => {
  if (selectedIds.length === 0) {
    return placeholder;
  }

  const selectedLabels = options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label);

  const summary =
    selectedLabels.length <= 2 ? selectedLabels.join(', ') : `${selectedLabels.length} sélectionnés`;

  return prefix ? `${prefix} : ${summary}` : summary;
};

export const MultiSelectDropdown = ({
  options,
  selectedIds = [],
  onChange,
  label,
  placeholder = 'Tout sélectionner',
  className,
  triggerClassName,
  triggerPrefix,
  hideLabel = false,
  footerAction,
}: MultiSelectDropdownProps) => {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(
    () => getTriggerLabel(options, selectedIds, placeholder, triggerPrefix),
    [options, placeholder, selectedIds, triggerPrefix]
  );

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }

    onChange([...selectedIds, id]);
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && !hideLabel && <label className="text-xs font-medium text-muted-foreground block">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              // Même gabarit et même fond blanc que Input / SelectTrigger.
              'h-10 w-full justify-between border-input bg-card px-3 py-2 text-left text-sm font-normal hover:bg-card',
              triggerClassName
            )}
          >
            <span className="truncate text-sm">{selectedLabel}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{label || 'Options'}</span>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Effacer
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {options.map((option) => {
              const checked = selectedIds.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleToggle(option.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted"
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <span className="flex-1">{option.label}</span>
                  {checked && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
          {footerAction && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  footerAction.onClick();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-primary transition hover:bg-muted"
              >
                {footerAction.icon}
                {footerAction.label}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
