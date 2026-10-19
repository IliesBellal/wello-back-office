import { SelectableChip } from '@/components/ui/selectable-chip';
import type { ImportPreviewComponent } from '@/types/import';

interface ImportProductIngredientsProps {
  /** Ingrédients lus dans la description du produit. */
  ingredients: ImportPreviewComponent[];
  /** Identifiants gardés (sous-ensemble de `ingredients`). */
  kept: string[];
  disabled: boolean;
  onChange: (kept: string[]) => void;
}

/**
 * Composition lue dans la description d'un produit (porte photo, ingrédients
 * demandés). Chaque ingrédient se retire ou se remet d'un clic ; un ingrédient
 * qui existe déjà dans la caisse est réutilisé, pas recréé.
 */
export const ImportProductIngredients = ({ ingredients, kept, disabled, onChange }: ImportProductIngredientsProps) => {
  if (ingredients.length === 0) return null;
  const keptSet = new Set(kept);

  const toggle = (id: string) => {
    onChange(
      ingredients
        .map((ingredient) => ingredient.external_id)
        .filter((other) => (other === id ? !keptSet.has(id) : keptSet.has(other))),
    );
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span className="text-xs text-muted-foreground">Ingrédients :</span>
      {ingredients.map((ingredient) => (
        <SelectableChip
          key={ingredient.external_id}
          size="sm"
          selected={keptSet.has(ingredient.external_id)}
          disabled={disabled}
          onToggle={() => toggle(ingredient.external_id)}
        >
          {ingredient.name}
        </SelectableChip>
      ))}
    </div>
  );
};
