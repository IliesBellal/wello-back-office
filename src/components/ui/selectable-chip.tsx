import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Les couleurs de tags sont saisies librement côté back-office : on ne teinte
// le chip que si la valeur est un hex 6 chiffres exploitable, sinon on retombe
// sur la couleur primaire du thème (qui reste lisible en clair comme en sombre).
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const withAlpha = (color: string | undefined, alpha: string) =>
  color && HEX_COLOR.test(color) ? `${color}${alpha}` : undefined;

export interface SelectableChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onToggle" | "color"> {
  selected: boolean;
  onToggle: () => void;
  /** Couleur d'accent (hex 6 chiffres), affichée en pastille et en teinte de fond. */
  color?: string;
  /** Contenu affiché avant le libellé (émoji d'allergène par exemple). */
  icon?: React.ReactNode;
  size?: "sm" | "default";
}

/**
 * Case à cocher présentée sous forme de pastille cliquable. Utilisée pour les
 * sélections multiples compactes (tags, allergènes) où une liste verticale de
 * checkboxes prendrait trop de hauteur.
 */
const SelectableChip = React.forwardRef<HTMLButtonElement, SelectableChipProps>(
  ({ selected, onToggle, color, icon, size = "default", className, children, disabled, ...props }, ref) => {
    const accent = withAlpha(color, "FF");

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={selected}
        disabled={disabled}
        onClick={onToggle}
        style={
          selected && accent
            ? { borderColor: accent, backgroundColor: withAlpha(color, "1F") }
            : undefined
        }
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
          selected
            ? accent
              ? "text-foreground"
              : "border-primary bg-primary/10 text-foreground"
            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:bg-muted/60 hover:text-foreground",
          className,
        )}
        {...props}
      >
        {selected ? (
          <Check className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        ) : (
          color && (
            <span
              className={cn(
                "inline-block shrink-0 rounded-full border border-border/40",
                size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
              )}
              style={{ backgroundColor: color }}
            />
          )
        )}
        {icon}
        {children}
      </button>
    );
  },
);
SelectableChip.displayName = "SelectableChip";

export { SelectableChip };
