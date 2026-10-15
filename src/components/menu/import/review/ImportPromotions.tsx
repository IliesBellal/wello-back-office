import { useMemo } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  ImportPhotoDraft,
  ImportPreviewProduct,
  ImportPreviewPromotion,
  ImportPreviewWarning,
} from '@/types/import';

/** Code d'avertissement d'une promotion vue sur la carte mais non créée. */
export const PROMOTION_NOT_CREATED = 'ai_promotion_not_created';

interface ImportPromotionsProps {
  promotions: ImportPreviewPromotion[];
  /** Promotions vues sur la carte que l'import ne sait pas créer, avec la raison. */
  notCreated: ImportPreviewWarning[];
  products: ImportPreviewProduct[];
  excluded: Record<string, boolean>;
  photoDraft: ImportPhotoDraft | null;
  disabled: boolean;
  onExclude: (promotionExternalId: string, excluded: boolean) => void;
}

/**
 * Promotions lues sur la carte, une ligne chacune : la promotion telle qu'elle
 * sera créée (pas la phrase de la carte), le texte d'origine pour comparer, et
 * les limites à connaître. Tout est créé désactivé : cocher ne fait rien
 * appliquer, cela autorise seulement la création.
 */
export const ImportPromotions = ({
  promotions,
  notCreated,
  products,
  excluded,
  photoDraft,
  disabled,
  onExclude,
}: ImportPromotionsProps) => {
  const productNames = useMemo(
    () => new Map(products.map((product) => [product.external_id, product.name])),
    [products],
  );
  const photoUrl = (photo?: number) =>
    photoDraft?.photos.find((entry) => entry.photo === photo)?.url;

  return (
    <div className="space-y-3">
      {notCreated.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {notCreated.map((warning, index) => (
            <li key={`${warning.ref}-${index}`} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {warning.message}
            </li>
          ))}
        </ul>
      )}
      <ul className="space-y-3">
        {promotions.map((promotion) => {
          const exists = promotion.action === 'already_exists';
          const isExcluded = exists || Boolean(excluded[promotion.external_id]);
          const url = photoUrl(promotion.source_photo);
          const targets = (promotion.product_external_ids ?? [])
            .map((id) => productNames.get(id))
            .filter((name): name is string => Boolean(name));

          return (
            <li
              key={promotion.external_id}
              className={`flex gap-3 rounded-lg border bg-card p-3 ${isExcluded ? 'opacity-60' : ''}`}
            >
              <Checkbox
                checked={!isExcluded}
                disabled={disabled || exists}
                aria-label={`Créer la promotion ${promotion.name}`}
                onCheckedChange={(checked) => onExclude(promotion.external_id, checked !== true)}
                className="mt-1"
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{promotion.name}</span>
                  {exists && <Badge variant="outline">Existe déjà</Badge>}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Photo {promotion.source_photo}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-sm">{promotion.summary}</p>
                {!promotion.all_products && targets.length > 0 && (
                  <p className="text-xs text-muted-foreground">Produits : {targets.join(', ')}</p>
                )}
                {promotion.source_text && (
                  <p className="text-xs italic text-muted-foreground">
                    Sur la carte : « {promotion.source_text} »
                  </p>
                )}
                {promotion.notes?.map((note) => (
                  <p key={note} className="flex items-start gap-1 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {note}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
