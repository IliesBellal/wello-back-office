/**
 * Card d'un module à la carte (écran Abonnement & facturation) : nom, courte
 * description, prix, et mini-mockup à droite.
 *
 * Textes et prix publics : moduleOffers.ts ; mockups : ModuleMockup.tsx
 * (tous deux repris du site vitrine). Le prix public n'est affiché que pour
 * un module NON souscrit — un module actif affiche le prix réellement facturé
 * (breakdown de GET /subscriptions/current).
 */
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { ModuleMockup } from "./ModuleMockup";
import { MODULE_OFFERS } from "./moduleOffers";

interface ModuleOfferCardProps {
  code: string;
  fallbackLabel: string;
  /** Actuellement souscrit (état serveur). */
  active: boolean;
  /** Sélectionné dans le formulaire (état local, peut différer de `active`). */
  selected: boolean;
  /** Prix réellement facturé si le module est actif, déjà formaté. */
  billedPrice?: string;
  billingCycleSuffix: string;
  onToggle: (checked: boolean) => void;
}

export function ModuleOfferCard({
  code,
  fallbackLabel,
  active,
  selected,
  billedPrice,
  billingCycleSuffix,
  onToggle,
}: ModuleOfferCardProps) {
  const offer = MODULE_OFFERS[code];
  const pending = selected !== active;
  const showBilled = active && billedPrice !== undefined;

  return (
    <label
      className={cn(
        "flex cursor-pointer gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold leading-tight text-foreground">{offer?.name ?? fallbackLabel}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {active && !pending && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Actif
                </Badge>
              )}
              {pending && (
                <Badge variant="outline" className="border-primary/40 text-[10px] font-normal text-primary">
                  {selected ? "À ajouter" : "À retirer"}
                </Badge>
              )}
            </div>
          </div>
          <Switch checked={selected} onCheckedChange={onToggle} aria-label={offer?.name ?? fallbackLabel} />
        </div>

        {offer && <p className="mt-2 text-sm text-muted-foreground">{offer.description}</p>}

        <p className="mt-auto pt-3">
          <span className="text-lg font-bold text-foreground">{showBilled ? billedPrice : offer?.publicPrice}</span>{" "}
          <span className="text-xs text-muted-foreground">HT {showBilled ? billingCycleSuffix : "/ mois"}</span>
        </p>
      </div>

      {offer && (
        <div className="hidden w-36 shrink-0 sm:block">
          <ModuleMockup code={code} />
        </div>
      )}
    </label>
  );
}
