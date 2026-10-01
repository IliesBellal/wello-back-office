import { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { effectiveParent, effectivePrice, effectiveTvaId, groupVariants } from '@/lib/importDecisions';
import { parseDecimalInput, priceToDisplayValue } from '@/utils/priceInputUtils';
import {
  IMPORT_CHANNELS,
  type ImportChannel,
  type ImportDecisions,
  type ImportPhotoDraft,
  type ImportPreviewProduct,
  type ImportPreviewResult,
} from '@/types/import';
import type { TvaRate, TvaRateGroup } from '@/types/menu';

interface ImportPhotoProductsProps {
  preview: ImportPreviewResult;
  decisions: ImportDecisions;
  photoDraft: ImportPhotoDraft | null;
  tvaGroups: TvaRateGroup[];
  loadingRates: boolean;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onExclude: (productExternalId: string, excluded: boolean) => void;
  onGroup: (productExternalId: string, groupExternalId: string) => void;
  onPrice: (product: ImportPreviewProduct, channel: ImportChannel, cents: number) => void;
  onTva: (productExternalId: string, channel: ImportChannel, tvaId: number) => void;
}

/** Valeur du select de groupe pour « aucun groupe » : Radix refuse la chaîne vide. */
const NO_GROUP = '__none__';

/** Borne d'un prix saisi, comme l'API (10 000 €). */
const MAX_PRICE_CENTS = 1_000_000;

/**
 * Prix d'un canal, en euros. La saisie reste libre pendant la frappe et n'est
 * appliquée qu'à la sortie du champ ; une valeur illisible ou hors bornes
 * rend le prix précédent.
 */
const PriceInput = ({
  cents,
  label,
  disabled,
  onCommit,
}: {
  cents: number;
  label: string;
  disabled: boolean;
  onCommit: (cents: number) => void;
}) => {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const euros = parseDecimalInput(draft);
    setDraft(null);
    if (euros === undefined) return;
    const next = Math.round(euros * 100);
    if (next >= 0 && next <= MAX_PRICE_CENTS && next !== cents) onCommit(next);
  };

  return (
    <div className="relative">
      <Input
        value={draft ?? priceToDisplayValue(cents)}
        inputMode="decimal"
        aria-label={label}
        disabled={disabled}
        className="h-8 pr-6 text-right tabular-nums"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        €
      </span>
    </div>
  );
};

/**
 * Relecture propre à la porte photo : ce que l'IA a lu, ligne par ligne.
 *
 * - inclure ou écarter une ligne mal lue (`excluded_products`) ;
 * - groupe de déclinaisons (`group_per_product`) : un groupe n'est créé que
 *   s'il garde au moins deux déclinaisons — la règle de l'API ;
 * - prix (`price_per_product`) et TVA (`tva_per_product`) de chaque canal. La
 *   TVA est pré-remplie d'après la nature lue par l'IA ; une nature
 *   indéterminée laisse la TVA à choisir.
 *
 * La confirmation de la TVA (`tva_confirmed`) est en fin de page
 * (`ImportTvaConfirmation`). Les lignes à faible confiance ou signalées par
 * la lecture sont mises en avant, avec le numéro et le lien de la photo où
 * les relire.
 */
export const ImportPhotoProducts = ({
  preview,
  decisions,
  photoDraft,
  tvaGroups,
  loadingRates,
  blockersByRef,
  disabled,
  onExclude,
  onGroup,
  onPrice,
  onTva,
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
  // Taux configurés dans la caisse, par canal : seuls choix possibles.
  const ratesByChannel = useMemo(() => {
    const rates = {} as Record<ImportChannel, TvaRate[]>;
    for (const { key, deliveryType } of IMPORT_CHANNELS) {
      rates[key] = tvaGroups.find((group) => group.delivery_type === deliveryType)?.rates ?? [];
    }
    return rates;
  }, [tvaGroups]);
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
                className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 hover:bg-muted"
              >
                Photo {photo.photo}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span key={photo.photo} className="rounded-md border bg-card px-2 py-1 text-muted-foreground">
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

      <div className="max-h-[32rem] overflow-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10" />
              <TableHead className="w-14">Photo</TableHead>
              <TableHead className="min-w-[200px]">Produit</TableHead>
              {groups.length > 0 && <TableHead className="min-w-[150px]">Groupe</TableHead>}
              {IMPORT_CHANNELS.map((channel) => (
                <TableHead key={channel.key} className="min-w-[150px]">
                  {channel.label}
                  <span className="block text-xs font-normal">Prix · TVA</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const excluded = Boolean(decisions.excluded_products[product.external_id]);
              const parent = effectiveParent(product, decisions);
              const blockers = blockersByRef.get(product.external_id);
              const flagged = product.confidence === 'low' || (product.issues?.length ?? 0) > 0;
              const url = photoUrl(product.source_photo);
              const noPrice = IMPORT_CHANNELS.every(({ key }) => effectivePrice(product, key, decisions) === 0);

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
                    {noPrice && !excluded && (
                      <p className="text-xs text-muted-foreground">Sans prix : sera retiré de la carte</p>
                    )}
                    {(product.issues?.length ?? 0) > 0 && (
                      <p className="text-xs text-amber-700">{product.issues?.join(' · ')}</p>
                    )}
                    {blockers?.map((message) => (
                      <p key={message} className="text-xs text-destructive">
                        {message}
                      </p>
                    ))}
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
                  {IMPORT_CHANNELS.map((channel) => {
                    const tvaId = effectiveTvaId(product, channel.key, decisions);
                    const missing = tvaId === undefined && !excluded;
                    return (
                      <TableCell key={channel.key} className="space-y-1">
                        <PriceInput
                          cents={effectivePrice(product, channel.key, decisions)}
                          label={`Prix ${channel.label.toLowerCase()} de ${product.name}`}
                          disabled={disabled || excluded}
                          onCommit={(cents) => onPrice(product, channel.key, cents)}
                        />
                        <Select
                          value={tvaId !== undefined ? String(tvaId) : ''}
                          disabled={disabled || excluded || loadingRates}
                          onValueChange={(value) => onTva(product.external_id, channel.key, Number(value))}
                        >
                          <SelectTrigger
                            aria-label={`TVA ${channel.label.toLowerCase()} de ${product.name}`}
                            className={`h-8 ${missing ? 'border-destructive' : ''}`}
                          >
                            <SelectValue placeholder={loadingRates ? 'Chargement…' : 'TVA à choisir'} />
                          </SelectTrigger>
                          <SelectContent>
                            {ratesByChannel[channel.key].map((rate, _, rates) => (
                              <SelectItem key={rate.id} value={String(rate.id)}>
                                {rate.value.toLocaleString('fr-FR')} %
                                {/* Deux TVA au même taux : le libellé les distingue. */}
                                {rates.filter((other) => other.value === rate.value).length > 1 && ` — ${rate.label}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
