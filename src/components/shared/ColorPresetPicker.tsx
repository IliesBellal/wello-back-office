import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Pastilles proposées par défaut (même palette que les catégories de la caisse). */
export const DEFAULT_COLOR_PRESETS = [
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

/** Pastilles pour une couleur de texte : neutres d'abord, lisibles sur fond clair ou foncé. */
export const TEXT_COLOR_PRESETS = [
  '#ffffff',
  '#f3f4f6',
  '#9ca3af',
  '#4b5563',
  '#1f2937',
  '#000000',
  ...DEFAULT_COLOR_PRESETS.slice(0, 6),
] as const;

interface ColorPresetPickerProps {
  /** Couleur courante (#RRGGBB). Vide ou invalide = aucune couleur. */
  value?: string | null;
  /**
   * Appelée avec la couleur choisie. Peut être asynchrone : un spinner
   * s'affiche pendant l'appel et, si la promesse est rejetée, l'affichage
   * revient à la valeur courante (le parent affiche l'erreur).
   */
  onChange: (hex: string) => void | Promise<void>;
  /**
   * Si fourni, affiche le bouton « Aucune » qui l'appelle (retour à la valeur
   * par défaut du champ). Sans lui, une couleur est toujours requise.
   */
  onClear?: () => void | Promise<void>;
  /** Pastilles proposées (par défaut : [DEFAULT_COLOR_PRESETS]). */
  presets?: readonly string[];
  disabled?: boolean;
  /** Nom du champ, pour l'accessibilité du bouton (« Couleur de … »). */
  label: string;
  /** Texte d'aide en tête du panneau. */
  description?: string;
  /** Texte affiché quand aucune couleur n'est choisie. */
  emptyLabel?: string;
  /** Bouton réduit à la pastille, quand le code couleur est déjà affiché à côté. */
  compact?: boolean;
  /** Couleur montrée quand `value` est vide (ex. valeur effective par défaut). */
  fallbackColor?: string;
  id?: string;
  className?: string;
}

/**
 * Sélecteur de couleur du back-office : pastilles prédéfinies + couleur
 * personnalisée.
 *
 * Un clic sur une pastille valide tout de suite. Pour une couleur libre, le
 * sélecteur natif met à jour un brouillon local et la valeur n'est envoyée
 * qu'à la fermeture du panneau — sinon chaque déplacement du curseur de
 * couleur déclencherait un appel (et, selon le parent, un enregistrement).
 */
export function ColorPresetPicker({
  value,
  onChange,
  onClear,
  presets = DEFAULT_COLOR_PRESETS,
  disabled,
  label,
  description,
  emptyLabel = 'Aucune',
  compact,
  fallbackColor = '#ffffff',
  id,
  className,
}: ColorPresetPickerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const current = value && HEX_COLOR.test(value) ? value.toLowerCase() : null;
  const shown = draft ?? current;
  const swatch = shown ?? fallbackColor;

  const run = async (action: () => void | Promise<void>) => {
    setSaving(true);
    try {
      await action();
    } catch {
      // Le parent affiche l'erreur ; on revient simplement à la valeur courante.
    } finally {
      setSaving(false);
    }
  };

  const commit = async (hex: string) => {
    setDraft(null);
    if (hex.toLowerCase() === current) return;
    await run(() => onChange(hex.toLowerCase()));
  };

  const clear = async () => {
    setDraft(null);
    if (!onClear || current === null) return;
    await run(onClear);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Fermeture avec un brouillon non validé (couleur libre) : on l'envoie.
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
          id={id}
          disabled={disabled || saving}
          aria-label={`Couleur de ${label}`}
          className={cn(
            'flex h-10 items-center gap-2 rounded-md border border-border px-2 text-sm transition-colors',
            'hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span
            className="relative flex h-6 w-6 items-center justify-center rounded border border-border"
            style={{ backgroundColor: swatch }}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </span>
          {!compact && (
            <span className="text-muted-foreground">{shown ? shown.toUpperCase() : emptyLabel}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className="grid grid-cols-6 gap-2">
          {presets.map((hex) => {
            const selected = shown === hex.toLowerCase();
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
              value={swatch}
              onChange={(e) => setDraft(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
              aria-label="Couleur personnalisée"
            />
            Personnalisée
          </label>
          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={current === null && draft === null}
              onClick={() => {
                setOpen(false);
                void clear();
              }}
            >
              Aucune
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
