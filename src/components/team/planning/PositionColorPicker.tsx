import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { POSITION_COLOR_PRESETS } from "@/lib/planningShiftColor";

interface PositionColorPickerProps {
  /** Hex courant (`""` si non choisi à la création). */
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  /** id du custom input pour le `<Label htmlFor>`. */
  id?: string;
}

/**
 * Color picker compact pour les **postes** (et utilisable ailleurs si besoin).
 *
 * Pattern hybride :
 *   - une grille de presets (`POSITION_COLOR_PRESETS`) pour cliquer vite,
 *   - un `<input type="color">` natif (même pattern que `TagsTable.tsx`)
 *     pour une couleur libre.
 *
 * Le composant n'enforce PAS l'obligation de sélection (`value` peut être
 * `""`) — c'est au formulaire parent d'utiliser cette info pour désactiver
 * son submit.
 */
export function PositionColorPicker({
  value,
  onChange,
  disabled,
  id,
}: PositionColorPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {POSITION_COLOR_PRESETS.map((c) => {
        const selected = value.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border transition-transform",
              "hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50",
              selected ? "border-foreground ring-2 ring-offset-1" : "border-border",
            )}
            style={{ backgroundColor: c }}
            aria-label={`Couleur ${c}`}
            aria-pressed={selected}
          >
            {selected && <Check className="h-3 w-3 text-white drop-shadow" />}
          </button>
        );
      })}
      <label
        className={cn(
          "ml-1 flex h-6 cursor-pointer items-center gap-1 rounded-md border border-dashed px-1.5 text-[11px] text-muted-foreground",
          disabled && "cursor-not-allowed opacity-50",
        )}
        title="Couleur personnalisée"
      >
        <span
          className="h-3.5 w-3.5 rounded-full border"
          style={{ backgroundColor: value || "transparent" }}
        />
        <input
          id={id}
          type="color"
          // `value` doit être un hex valide ou le navigateur ré-écrit en #000000
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#cccccc"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="sr-only"
        />
        Perso
      </label>
    </div>
  );
}
