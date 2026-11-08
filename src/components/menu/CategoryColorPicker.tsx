import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Valeur stockée par défaut en base : la caisse la traite comme « pas de couleur ». */
const CATEGORY_DEFAULT_COLOR = '#ffffff';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const CATEGORY_COLOR_PRESETS = [
  '#ef4444', // rouge
  '#f97316', // orange
  '#f59e0b', // ambre
  '#eab308', // jaune
  '#84cc16', // citron vert
  '#10b981', // émeraude
  '#06b6d4', // cyan
  '#3b82f6', // bleu
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // rose
  '#64748b', // ardoise
] as const;

/** Vrai si la catégorie a une vraie couleur (ni vide, ni le blanc par défaut). */
const hasCategoryColor = (value?: string | null): boolean =>
  !!value && value.toLowerCase() !== CATEGORY_DEFAULT_COLOR;

interface CategoryColorPickerProps {
  /** Couleur courante (#RRGGBB). Vide ou blanc = aucune couleur. */
  value?: string | null;
  /** Appelée avec la couleur choisie ; rejeter la promesse annule l'affichage du choix. */
  onChange: (hex: string) => Promise<void>;
  disabled?: boolean;
  /** Nom de la catégorie, pour l'accessibilité du bouton. */
  categoryName: string;
}

/**
 * Sélecteur de couleur de fond d'une catégorie caisse.
 *
 * Un clic sur une pastille enregistre immédiatement. Pour une couleur libre,
 * le sélecteur natif met à jour un brouillon local et la valeur n'est envoyée
 * qu'à la fermeture du popover — sinon chaque déplacement du curseur de
 * couleur déclencherait un appel API.
 */
export function CategoryColorPicker({
  value,
  onChange,
  disabled,
  categoryName,
}: CategoryColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const current = value && HEX_COLOR.test(value) ? value.toLowerCase() : CATEGORY_DEFAULT_COLOR;
  const shown = draft ?? current;
  const colored = hasCategoryColor(shown);

  const commit = async (hex: string) => {
    setDraft(null);
    if (hex.toLowerCase() === current) return;
    setSaving(true);
    try {
      await onChange(hex.toLowerCase());
    } catch {
      // Le parent affiche l'erreur ; on revient simplement à la valeur enregistrée.
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Fermeture avec un brouillon non enregistré (couleur libre) : on l'envoie.
    if (!next && draft !== null) {
      void commit(draft);
    }
  };

  const pick = (hex: string) => {
    setOpen(false);
    void commit(hex);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || saving}
          aria-label={`Couleur de la catégorie ${categoryName}`}
          className={cn(
            'flex h-10 items-center gap-2 rounded-md border border-border px-2 text-sm transition-colors',
            'hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span
            className="relative flex h-6 w-6 items-center justify-center rounded border border-border"
            style={{ backgroundColor: shown }}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </span>
          <span className="text-muted-foreground">{colored ? shown.toUpperCase() : 'Aucune'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <p className="text-sm text-muted-foreground">
          Couleur affichée sur la caisse pour cette catégorie.
        </p>
        <div className="grid grid-cols-6 gap-2">
          {CATEGORY_COLOR_PRESETS.map((hex) => {
            const selected = current === hex;
            return (
              <button
                key={hex}
                type="button"
                onClick={() => pick(hex)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border transition-transform hover:scale-110',
                  selected ? 'border-foreground ring-2 ring-offset-1' : 'border-border',
                )}
                style={{ backgroundColor: hex }}
                aria-label={`Couleur ${hex}`}
                aria-pressed={selected}
              >
                {selected && <Check className="h-4 w-4 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="color"
              value={shown}
              onChange={(e) => setDraft(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
              aria-label="Couleur personnalisée"
            />
            Personnalisée
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!colored && draft === null}
            onClick={() => pick(CATEGORY_DEFAULT_COLOR)}
          >
            Aucune
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
