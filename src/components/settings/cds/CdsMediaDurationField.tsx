import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CDS_MEDIA_DURATION_MAX, CDS_MEDIA_DURATION_MIN } from "@/types/cds";

interface CdsMediaDurationFieldProps {
  /** Durée propre du média, ou null s'il suit la durée par défaut. */
  value: number | null;
  /** Durée par défaut de l'écran, affichée en indication quand le champ est vide. */
  defaultValue: number;
  /** Appelé avec la nouvelle durée propre, ou null pour revenir à la durée par défaut. */
  onCommit: (seconds: number | null) => void;
  disabled?: boolean;
}

/**
 * Champ de durée d'un média, avec le comportement des logiciels d'affichage
 * dynamique : un champ vide signifie « durée par défaut », une valeur saisie
 * est une durée propre à ce média, et un bouton permet de revenir au défaut.
 *
 * La valeur est validée à la sortie du champ (blur) ou à Entrée, pas à chaque
 * frappe : taper « 15 » passe brièvement par « 1 », qui est hors bornes, et
 * refuser cet état intermédiaire rendrait la saisie impossible.
 */
export function CdsMediaDurationField({
  value,
  defaultValue,
  onCommit,
  disabled,
}: CdsMediaDurationFieldProps) {
  const [text, setText] = useState(value === null ? "" : String(value));

  // Resynchronise quand la valeur serveur change (réinitialisation globale,
  // rechargement de la liste) : sans cela, le champ afficherait une saisie
  // périmée après un « Appliquer à tous ».
  useEffect(() => {
    setText(value === null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const trimmed = text.trim();

    if (trimmed === "") {
      // Champ vidé : retour à la durée par défaut, seulement si ce n'était pas
      // déjà le cas (évite une requête pour rien à chaque blur).
      if (value !== null) onCommit(null);
      return;
    }

    const parsed = Math.round(Number(trimmed));
    if (!Number.isFinite(parsed)) {
      setText(value === null ? "" : String(value));
      return;
    }

    // Borné plutôt que refusé : saisir 500 donne 120, ce qui est presque
    // toujours l'intention, et évite une erreur pour une faute de frappe.
    const clamped = Math.min(
      CDS_MEDIA_DURATION_MAX,
      Math.max(CDS_MEDIA_DURATION_MIN, parsed),
    );
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  const isCustom = value !== null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          min={CDS_MEDIA_DURATION_MIN}
          max={CDS_MEDIA_DURATION_MAX}
          value={text}
          placeholder={String(defaultValue)}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className={`h-8 w-20 pr-6 text-right text-sm ${isCustom ? "" : "text-muted-foreground"}`}
          aria-label="Durée d'affichage en secondes"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          s
        </span>
      </div>

      {isCustom ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          disabled={disabled}
          onClick={() => onCommit(null)}
          title={`Revenir à la durée par défaut (${defaultValue} s)`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <span className="w-8 text-xs text-muted-foreground">défaut</span>
      )}
    </div>
  );
}
