import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  normalizeCategoryName,
  type ImportCategoryOption,
  type ImportCategoryTarget,
} from '@/lib/importDecisions';

interface ImportCategorySelectProps {
  /** Catégorie retenue (identifiant de l'import), `null` = à choisir. */
  value: string | null;
  options: ImportCategoryOption[];
  /**
   * Noms des catégories déjà présentes dans la caisse, et possibilité d'en
   * créer une — porte photo uniquement : l'API refuse ailleurs les catégories
   * ajoutées en relecture.
   */
  merchantCategories?: string[];
  allowCreate?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
  onChange: (target: ImportCategoryTarget) => void;
}

/** Valeurs du select : Radix n'accepte que des chaînes. */
const ID_PREFIX = 'id:';
const NAME_PREFIX = 'name:';
const NEW_CATEGORY = '__new__';

/**
 * Choix de la catégorie d'un produit importé : une catégorie de l'import, une
 * catégorie de la caisse, ou une nouvelle catégorie saisie à la volée.
 */
export const ImportCategorySelect = ({
  value,
  options,
  merchantCategories = [],
  allowCreate = false,
  disabled,
  invalid,
  className,
  ariaLabel,
  onChange,
}: ImportCategorySelectProps) => {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  // Une catégorie de la caisse déjà proposée par l'import n'est pas répétée :
  // l'API s'y rattache de toute façon par son nom.
  const merchantOnly = useMemo(() => {
    const known = new Set(options.map((option) => normalizeCategoryName(option.name)));
    const seen = new Set<string>();
    return merchantCategories
      .filter((name) => {
        const key = normalizeCategoryName(name);
        if (!key || known.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }, [merchantCategories, options]);

  const handleChange = (selected: string) => {
    if (selected === NEW_CATEGORY) {
      setDraft('');
      setCreating(true);
    } else if (selected.startsWith(ID_PREFIX)) {
      onChange({ externalId: selected.slice(ID_PREFIX.length) });
    } else if (selected.startsWith(NAME_PREFIX)) {
      onChange({ name: selected.slice(NAME_PREFIX.length) });
    }
  };

  const submitDraft = () => {
    const name = draft.trim();
    if (!name) return;
    onChange({ name });
    setCreating(false);
  };

  const withMerchant = allowCreate && merchantOnly.length > 0;

  return (
    <>
      <Select
        value={value ? `${ID_PREFIX}${value}` : ''}
        disabled={disabled}
        onValueChange={handleChange}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className={`h-8 ${invalid ? 'border-destructive' : ''} ${className ?? ''}`}
        >
          <SelectValue placeholder="Catégorie à choisir" />
        </SelectTrigger>
        <SelectContent>
          {options.length > 0 && (
            <SelectGroup>
              {withMerchant && <SelectLabel>Dans cet import</SelectLabel>}
              {options.map((option) => (
                <SelectItem key={option.externalId} value={`${ID_PREFIX}${option.externalId}`}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {withMerchant && (
            <>
              {options.length > 0 && <SelectSeparator />}
              <SelectGroup>
                <SelectLabel>Déjà dans votre caisse</SelectLabel>
                {merchantOnly.map((name) => (
                  <SelectItem key={name} value={`${NAME_PREFIX}${name}`}>
                    {name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
          {allowCreate && (
            <>
              {(options.length > 0 || withMerchant) && <SelectSeparator />}
              <SelectItem value={NEW_CATEGORY}>
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle catégorie…
                </span>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {allowCreate && (
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nouvelle catégorie</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitDraft();
              }}
            >
              <Input
                autoFocus
                value={draft}
                placeholder="Ex. : Desserts"
                aria-label="Nom de la catégorie"
                onChange={(event) => setDraft(event.target.value)}
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={!draft.trim()}>
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
