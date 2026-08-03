import { useEffect, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PlanningDayComment } from "@/types/planning";

/** Doit rester synchro avec `daycomments.MaxCommentLength` côté API. */
const MAX_COMMENT_LENGTH = 400;

interface DayCommentCellProps {
  dateIso: string;
  comment: PlanningDayComment | null;
  onSave: (dateIso: string, comment: string) => Promise<void>;
  onDelete: (dateIso: string) => Promise<void>;
}

/**
 * Cellule de la ligne "Commentaire" toujours visible dans la grille
 * planning (entre l'en-tête et la première ligne employé). Un seul bouton
 * "Enregistrer" apparaît quand le texte diffère de la valeur sauvegardée ;
 * vider le champ puis enregistrer supprime le commentaire (pas de bouton
 * "Supprimer" séparé).
 */
export function DayCommentCell({ dateIso, comment, onSave, onDelete }: DayCommentCellProps) {
  const original = comment?.comment ?? "";
  const [draft, setDraft] = useState(original);
  const [submitting, setSubmitting] = useState(false);

  // Resynchronise le brouillon local quand la valeur serveur change
  // (invalidation après sauvegarde ailleurs, changement de plage affichée…).
  useEffect(() => {
    setDraft(original);
  }, [original]);

  const trimmed = draft.trim();
  const isDirty = trimmed !== original;

  const handleSave = async () => {
    if (submitting || !isDirty) return;
    setSubmitting(true);
    try {
      if (trimmed === "") {
        await onDelete(dateIso);
      } else {
        await onSave(dateIso, trimmed);
      }
    } catch {
      // Le toast d'erreur est géré par la mutation appelante.
    } finally {
      setSubmitting(false);
    }
  };

  // Entrée valide le commentaire (comme un envoi de message) ; Maj+Entrée
  // insère un retour à la ligne normalement.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
  };

  return (
    <div className="flex flex-col gap-1 border-b border-r bg-muted/30 p-1">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
        onKeyDown={handleKeyDown}
        placeholder="—"
        maxLength={MAX_COMMENT_LENGTH}
        rows={2}
        disabled={submitting}
        className={cn(
          "min-h-[44px] resize-none border-none bg-transparent p-1 text-[11px] leading-tight shadow-none",
          "focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
        )}
      />
      {isDirty && (
        <Button
          type="button"
          size="sm"
          className="h-6 self-end px-2 text-[11px]"
          disabled={submitting}
          onClick={handleSave}
        >
          Enregistrer
        </Button>
      )}
    </div>
  );
}
