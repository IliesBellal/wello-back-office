import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyBreakdown } from '@/services/vatService';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VATBreakdownTableProps {
  data: MonthlyBreakdown[];
  loading?: boolean;
}

const formatCurrency = (centimes: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centimes / 100);
};

const getMonthLabel = (monthStr: string): string => {
  try {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return format(date, 'MMMM yyyy', { locale: fr });
  } catch {
    return monthStr;
  }
};

// Libellé d'un taux renvoyé par l'API (« 10.0 », « 5.5 », « 20 »).
const formatRateLabel = (rateKey: string): string => {
  const rate = Number.parseFloat(rateKey);
  if (!Number.isFinite(rate)) return `TVA ${rateKey}%`;
  return `TVA ${rate.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`;
};

export const VATBreakdownTable = ({ data, loading = false }: VATBreakdownTableProps) => {
  // Colonnes de TVA par taux : celles présentes dans les données (vat_by_rate),
  // triées par taux. Jusqu'au 2026-10-05 le tableau lisait des champs vat_10 /
  // vat_5_5… que l'API ne renvoie pas : ces colonnes restaient à 0.
  const rateKeys = Array.from(
    new Set(data.flatMap((row) => Object.keys(row.vat_by_rate ?? {})))
  ).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b));

  const rateValue = (row: MonthlyBreakdown, rateKey: string) => row.vat_by_rate?.[rateKey] ?? 0;

  const totals = {
    revenue_ht: 0,
    vat_total: 0,
    revenue_ttc: 0,
    byRate: {} as Record<string, number>,
  };
  data.forEach((row) => {
    totals.revenue_ht += row.revenue_ht;
    totals.vat_total += row.vat_total;
    totals.revenue_ttc += row.revenue_ttc;
    rateKeys.forEach((rateKey) => {
      totals.byRate[rateKey] = (totals.byRate[rateKey] ?? 0) + rateValue(row, rateKey);
    });
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Aucune donnée pour la période et les canaux sélectionnés</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold min-w-40">Période</TableHead>
            <TableHead className="text-right">CA HT</TableHead>
            {rateKeys.map((rateKey) => (
              <TableHead key={rateKey} className="text-right">
                {formatRateLabel(rateKey)}
              </TableHead>
            ))}
            <TableHead className="text-right font-semibold">TVA Totale</TableHead>
            <TableHead className="text-right">CA TTC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                <p>{getMonthLabel(row.month)}</p>
                {row.closing_mode && (
                  <p className="text-xs font-normal text-muted-foreground">
                    {row.closing_mode === 'AUTO' ? 'Clôture automatique' : 'Clôture manuelle'}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(row.revenue_ht)}
              </TableCell>
              {rateKeys.map((rateKey) => (
                <TableCell key={rateKey} className="text-right font-mono text-sm">
                  {formatCurrency(rateValue(row, rateKey))}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold font-mono text-primary">
                {formatCurrency(row.vat_total)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(row.revenue_ttc)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Totals Footer */}
      <div className="border-t bg-muted/30 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
          <div>
            <p className="text-xs text-muted-foreground mb-1">CA HT TOTAL</p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(totals.revenue_ht)}
            </p>
          </div>
          {rateKeys.map((rateKey) => (
            <div key={rateKey}>
              <p className="text-xs text-muted-foreground mb-1">{formatRateLabel(rateKey)}</p>
              <p className="text-lg font-bold font-mono">
                {formatCurrency(totals.byRate[rateKey] ?? 0)}
              </p>
            </div>
          ))}
          <div>
            <p className="text-xs text-muted-foreground mb-1">TVA TOTALE</p>
            <p className="text-lg font-bold font-mono text-primary">
              {formatCurrency(totals.vat_total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">CA TTC TOTAL</p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(totals.revenue_ttc)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
