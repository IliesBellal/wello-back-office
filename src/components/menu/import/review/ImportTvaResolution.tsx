import { Info } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TvaRateGroup } from '@/types/menu';
import { tvaChannelLabel, tvaMappingKey, type ImportPreviewResult } from '@/types/import';

interface ImportTvaResolutionProps {
  preview: ImportPreviewResult;
  tvaMapping: Record<string, number>;
  /** Référentiel du marchand (`GET /pos/tva_rates`). */
  tvaGroups: TvaRateGroup[];
  loadingRates: boolean;
  blockersByRef: Map<string, string[]>;
  disabled: boolean;
  onChange: (rate: number, channel: number, tvaId: number) => void;
}

/**
 * Correspondance entre les taux du fichier et ceux configurés chez le marchand.
 *
 * La prévisualisation résout ce qu'elle peut ; il ne reste ici que les taux
 * absents du référentiel, pour lesquels il faut désigner une ligne de TVA — et
 * c'est bien par canal, un même taux ne portant pas le même identifiant sur
 * place et en livraison.
 */
export const ImportTvaResolution = ({
  preview,
  tvaMapping,
  tvaGroups,
  loadingRates,
  blockersByRef,
  disabled,
  onChange,
}: ImportTvaResolutionProps) => {
  if (preview.tva_rates.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun taux de TVA dans ce fichier.</p>;
  }

  // delivery_type vaut '0' (sur place), '3' (emporté) ou '1' (livraison).
  const ratesForChannel = (channel: number) =>
    tvaGroups.find((group) => String(group.delivery_type) === String(channel))?.rates ?? [];

  return (
    <div className="space-y-3">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Un taux à <span className="font-medium">0 %</span> signifie que le produit n’est pas vendu
          sur ce canal : le canal sera désactivé, et reprendra le taux le plus élevé du produit pour
          rester cohérent si vous le réactivez plus tard.
        </AlertDescription>
      </Alert>

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-32">Taux</TableHead>
              <TableHead className="w-40">Canal</TableHead>
              <TableHead className="w-28 text-right">Produits</TableHead>
              <TableHead className="min-w-[260px]">TVA correspondante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.tva_rates.map((entry) => {
              const key = tvaMappingKey(entry.rate, entry.channel);
              const resolvedId = tvaMapping[key];
              const errors = blockersByRef.get(key);
              const options = ratesForChannel(entry.channel);

              return (
                <TableRow key={key} className={errors || !resolvedId ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium tabular-nums">
                    {entry.rate} %
                    {entry.rate === 0 && (
                      <Badge variant="outline" className="ml-2 text-xs font-normal">
                        canal désactivé
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {tvaChannelLabel(entry.channel)}
                    {entry.needed_for_backfill && (
                      <p className="text-xs text-muted-foreground">taux de repli</p>
                    )}
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {entry.product_count}
                  </TableCell>

                  <TableCell>
                    {resolvedId ? (
                      <span className="text-sm text-muted-foreground">
                        {options.find((rate) => Number(rate.id) === resolvedId)?.label ??
                          `TVA n° ${resolvedId}`}
                      </span>
                    ) : (
                      <Select
                        value=""
                        disabled={disabled || loadingRates}
                        onValueChange={(value) => onChange(entry.rate, entry.channel, Number(value))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue
                            placeholder={loadingRates ? 'Chargement…' : 'Choisir une TVA'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((rate) => (
                            <SelectItem key={rate.id} value={String(rate.id)}>
                              {rate.label} — {rate.value} %
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {errors?.map((message, index) => (
                      <p key={index} className="mt-0.5 text-xs text-destructive">
                        {message}
                      </p>
                    ))}
                    {!resolvedId && !errors && options.length === 0 && !loadingRates && (
                      <p className="mt-0.5 text-xs text-destructive">
                        Aucune TVA configurée pour ce canal — créez-la dans les réglages de caisse.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
