import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, MessageSquareText } from "lucide-react";

import type { PlanningShift } from "@/types/planning";
import { cn } from "@/lib/utils";
import { DEFAULT_SHIFT_COLOR } from "@/lib/planningShiftColor";

interface ShiftCardProps {
  shift: PlanningShift;
  onClick: () => void;
  compact?: boolean;
  /**
   * Couleur (hex) du poste rattaché au shift, déjà résolue côté grille
   * via `resolveShiftColor` / `colorFromIndex`. Si omis, fallback neutre.
   */
  color?: string;
  /**
   * En mode "sélection multiple" (suppression de masse), désactive le DnD
   * et affiche un overlay de checkbox. Le clic toggle la sélection via `onClick`.
   */
  selectable?: boolean;
  /** Indique visuellement que la carte est sélectionnée (anneau + check). */
  selected?: boolean;
}

function fmtTime(t: string) {
  // accept "HH:mm" or "HH:mm:ss"
  return t.slice(0, 5);
}

/**
 * Ajoute un suffixe d'opacité à un hex `#rrggbb`.
 * `alphaHex` = 2 chars hex (ex `"1f"` ≈ 12%, `"66"` ≈ 40%).
 * Si la couleur n'est pas un hex 7 chars, retourne la couleur telle quelle
 * (laisse le navigateur résoudre).
 */
function withAlpha(hex: string, alphaHex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex;
}

export function ShiftCard({
  shift,
  onClick,
  compact = false,
  color,
  selectable = false,
  selected = false,
}: ShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    disabled: selectable,
  });

  const baseColor = color ?? DEFAULT_SHIFT_COLOR;

  // Style inline dérivée d'une SEULE couleur de poste :
  //   - fond     : ~12% d'opacité (lisible mais doux)
  //   - bordure  : ~40% d'opacité
  //   - pastille : 100% (la couleur "vraie" du poste)
  // Le texte reste sur la couleur foreground du thème pour la lisibilité dark/light.
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    backgroundColor: withAlpha(baseColor, "1f"),
    borderColor: withAlpha(baseColor, "66"),
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      onClick={onClick}
      {...(selectable ? {} : listeners)}
      {...(selectable ? {} : attributes)}
      className={cn(
        "group relative w-full min-w-0 text-left rounded-md border px-2 py-1.5 shadow-sm transition-shadow hover:shadow",
        selectable ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        "text-foreground",
        compact && "px-1 py-1",
        selected && "ring-2 ring-primary ring-offset-1",
      )}
    >
      {selectable && (
        <span
          className={cn(
            "absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-sm border bg-background",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
          )}
          aria-hidden
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
      )}
      {compact ? (
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <div className="flex w-full items-start justify-between gap-1">
            <span className="truncate text-[10px] font-semibold leading-none tabular-nums text-foreground/90">
              {fmtTime(shift.start_time)}
            </span>
            {shift.notes && (
              <MessageSquareText className="h-3 w-3 shrink-0 opacity-70" aria-label="Notes" />
            )}
          </div>
          <span className="truncate text-[10px] font-semibold leading-none tabular-nums text-foreground/90">
            {fmtTime(shift.end_time)}
          </span>
          <div className="w-full truncate text-[10px] leading-tight opacity-80">
            {shift.position || "Shift"}
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: baseColor }}
            />
            <span className="truncate text-xs font-medium">
              {fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
            </span>
          </div>
          {shift.notes && (
            <MessageSquareText className="h-3 w-3 shrink-0 opacity-70" aria-label="Notes" />
          )}
        </div>
      )}
      {!compact && (
        <div className="mt-0.5 truncate text-[11px] opacity-80">
          {shift.position || "Shift"}
        </div>
      )}
    </button>
  );
}
