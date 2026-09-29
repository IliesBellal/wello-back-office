import { useMemo } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { effectiveKind, effectiveParent, groupVariants } from '@/lib/importDecisions';
import {
  PRODUCT_KINDS,
  productKindOption,
  type ImportDecisions,
  type ImportPhotoDraft,
  type ImportPreviewResult,
  type ImportProductKind,
} from '@/types/import';

interface ImportPhotoProductsProps {
  preview: ImportPreviewResult;
  decisions: ImportDecisions;
  photoDraft: ImportPhotoDraft | null;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onExclude: (productExternalId: string, excluded: boolean) => void;
  onKind: (productExternalId: string, kind: ImportProductKind) => void;
  onGroup: (productExternalId: string, groupExternalId: string) => void;
  onTvaConfirmed: (confirmed: boolean) => void;
}

/** Valeur du select de groupe pour « aucun groupe » : Radix refuse la chaîne vide. */
const NO_GROUP = '__none__';

const euros = (cents: number): string =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const formatRate = (rate: number): string => `${rate.toLocaleString('fr-FR')} %`;

/**
 * Relecture propre à la porte photo : ce que l'IA a lu, ligne par ligne.
 *
 * - inclure ou écarter une ligne mal lue (`excluded_products`) ;
 * - groupe de déclinaisons (`group_per_product`) : un groupe n'est créé que
 *   s'il garde au moins deux déclinaisons — la règle de l'API ;
 * - nature (`kind_per_product`), qui fixe la TVA proposée affichée à côté ;
 * - confirmation de la TVA (`tva_confirmed`), exigée au commit.
 *
 * Les lignes à faible confiance ou signalées par la lecture sont mises en
 * avant, avec le numéro et le lien de la photo où les relire.
 */
export const ImportPhotoProducts = ({
  preview,
  decisions,
  photoDraft,
  blockersByRef,
  disabled,
  onExclude,
  onKind,
  onGroup,
  onTvaConfirmed,
}: ImportPhotoProductsProps) => {
  const groups = useMemo(() => preview.products.filter((product) => product.is_group), [preview.products]);
  const variants = useMemo(() => groupVariants(preview, decisions), [preview, decisions]);
  const products = useMemo(
    () =>
      preview.products
        .filter((product) => !product.is_group)
        .map((product, index) => ({ product, index }))
        // Ordre de lecture : photo, puis ordre sur la photo.
        .sort((a, b) => (a.product.source_photo ?? 0) - (b.product.source_photo ?? 0) || a.index - b.index)
        .map(({ product }) => product),
    [preview.products],
  );
  const photoUrl = (photo?: number) => photoDraft?.photos.find((entry) => entry.photo === photo)?.url;
  const toCheck = products.filter((product) => product.confidence === 'low' || (product.issues?.length ?? 0) > 0);

  return (
    <div className="space-y-4">
      {photoDraft && photoDraft.photos.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {photoDraft.photos.map((photo) =>
            photo.url ? (
              <a
                key={photo.photo}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted"
              >
                Photo {photo.photo}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span key={photo.photo} className="rounded-md border px-2 py-1 text-muted-foreground">
                Photo {photo.photo} ({photo.status === 'failed' ? 'non lue' : 'indisponible'})
              </span>
            ),
          )}
        </div>
      )}

      {toCheck.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          {toCheck.length} ligne(s) à relire de près : la lecture n’en est pas sûre.
        </p>
      )}

      {groups.length > 0 && (
        <ul className="space-y-1 text-sm">
          {groups.map((group) => {
            const count = variants.get(group.external_id)?.length ?? 0;
            return (
              <li key={group.external_id} className={count < 2 ? 'text-muted-foreground' : ''}>
                Groupe <span className="font-medium">{group.name}</span> : {count} déclinaison(s)
                {count < 2 && ' — ne sera pas créé (il en faut au moins deux)'}
              </li>
            );
          })}
        </ul>
      )}

      <div className="max-h-[28rem] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10" />
              <TableHead className="w-16">Photo</TableHead>
              <TableHead className="min-w-[220px]">Produit</TableHead>
              <TableHead className="w-24 text-right">Prix</TableHead>
              {groups.length > 0 && <TableHead className="min-w-[160px]">Groupe</TableHead>}
              <TableHead className="min-w-[220px]">Nature</TableHead>
              <TableHead className="min-w-[150px]">TVA proposée</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const excluded = Boolean(decisions.excluded_products[product.external_id]);
              const kind = effectiveKind(product, decisions);
              const option = productKindOption(kind);
              const parent = effectiveParent(product, decisions);
              const blockers = blockersByRef.get(product.external_id);
              const flagged = product.confidence === 'low' || (product.issues?.length ?? 0) > 0;
              const url = photoUrl(product.source_photo);
              const noPrice = product.status === 'removed_from_menu';

              return (
                <TableRow
                  key={product.external_id}
                  className={[excluded ? 'opacity-50' : '', blockers ? 'bg-destructive/5' : ''].join(' ')}
                >
                  <TableCell>
                    <Checkbox
                      checked={!excluded}
                      disabled={disabled}
                      aria-label={`Importer ${product.name}`}
                      onCheckedChange={(checked) => onExclude(product.external_id, checked !== true)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                        {product.source_photo}
                      </a>
                    ) : (
                      product.source_photo ?? '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>
                      {flagged && (
                        <Badge variant="outline" className="border-amber-500 text-amber-700">
                          À vérifier
                        </Badge>
                      )}
                    </div>
                    {(product.issues?.length ?? 0) > 0 && (
                      <p className="text-xs text-amber-700">{product.issues?.join(' · ')}</p>
                    )}
                    {blockers?.map((message) => (
                      <p key={message} className="text-xs text-destructive">
                        {message}
                      </p>
                    ))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {noPrice ? (
                      <span className="text-xs text-muted-foreground">Sans prix</span>
                    ) : (
                      euros(product.channels.in.price)
                    )}
                  </TableCell>
                  {groups.length > 0 && (
                    <TableCell>
                      <Select
                        value={parent || NO_GROUP}
                        disabled={disabled || excluded}
                        onValueChange={(value) => onGroup(product.external_id, value === NO_GROUP ? '' : value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_GROUP}>Aucun</SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group.external_id} value={group.external_id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell>
                    <Select
                      value={kind ?? 'other'}
                      disabled={disabled || excluded}
                      onValueChange={(value) => onKind(product.external_id, value as ImportProductKind)}
                    >
                      <SelectTrigger className={`h-8 ${!option?.rates && !excluded ? 'border-destructive' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_KINDS.map((entry) => (
                          <SelectItem key={entry.value} value={entry.value}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {option?.rates ? (
                      <span title="Sur place · À emporter · En livraison">
                        {formatRate(option.rates.in)} · {formatRate(option.rates.take_away)} ·{' '}
                        {formatRate(option.rates.delivery)}
                      </span>
                    ) : (
                      <span className="text-destructive">Nature à préciser</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
        <Checkbox
          checked={Boolean(decisions.tva_confirmed)}
          disabled={disabled}
          onCheckedChange={(checked) => onTvaConfirmed(checked === true)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">J’ai vérifié la nature de chaque produit et les taux de TVA proposés.</span>
          <span className="block text-muted-foreground">
            Une carte n’indique jamais la TVA : les taux sont déduits de la nature du produit (sur
            place · à emporter · en livraison). 10 % pour ce qui se consomme tout de suite ; 5,5 % à
            emporter et en livraison pour les boissons fermées et les produits emballés ; 20 % pour
            l’alcool.
          </span>
        </span>
      </label>
    </div>
  );
};
