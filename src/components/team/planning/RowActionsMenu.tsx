import { MoreVertical, UserPlus, ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Menu "3 points" affiché au survol d'une ligne du planning.
 *
 * Pour l'instant, une seule action ("Assigner à…" / "Transférer vers…")
 * mais le `DropdownMenuContent` est prévu pour grandir : ajoute simplement
 * de nouveaux `<DropdownMenuItem>` ci-dessous (ex. "Appliquer une semaine
 * type à cette ligne", "Vider la ligne", etc.).
 *
 * Le libellé est **contextuel** : verbe différent selon `variant`,
 * même mécanique côté handler.
 */
export type RowActionsMenuVariant = "employee" | "unassigned";

interface RowActionsMenuProps {
  variant: RowActionsMenuVariant;
  /** Désactivé si la ligne ne contient aucun shift sur la semaine visible. */
  disabled?: boolean;
  onBulkAssign: () => void;
}

export function RowActionsMenu({ variant, disabled, onBulkAssign }: RowActionsMenuProps) {
  const isUnassignedRow = variant === "unassigned";
  const label = isUnassignedRow ? "Assigner à…" : "Transférer vers…";
  const Icon = isUnassignedRow ? UserPlus : ArrowRightLeft;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Actions sur la ligne"
          className={cn(
            "relative z-10 h-6 w-6 shrink-0 text-muted-foreground",
            // Masqué par défaut, révélé au survol de la ligne (group/row sur le parent).
            "opacity-0 transition-opacity group-hover/row:opacity-100",
            // Toujours visible quand le menu est ouvert (data-state="open" sur le trigger).
            "data-[state=open]:opacity-100",
          )}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-popover">
        <DropdownMenuItem
          onSelect={(e) => {
            // onSelect ferme déjà le menu Radix — pas besoin de preventDefault.
            e.preventDefault?.();
            if (!disabled) onBulkAssign();
          }}
          disabled={disabled}
        >
          <Icon className="mr-2 h-3.5 w-3.5" />
          {label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
