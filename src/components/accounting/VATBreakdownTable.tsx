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

export const VATBreakdownTable = ({ data, loading = false }: VATBreakdownTableProps) => {
  // Calculate totals
  const totals = {
    revenue_ht: 0,
    vat_10: 0,
    vat_5_5: 0,
    vat_20: 0,
    vat_2_1: 0,
    vat_total: 0,
    revenue_ttc: 0,
  };

  data.forEach((row) => {
    totals.revenue_ht += row.revenue_ht;
    totals.vat_10 += row.vat_10 || 0;
    totals.vat_5_5 += row.vat_5_5 || 0;
    totals.vat_20 += row.vat_20 || 0;
    totals.vat_2_1 += row.vat_2_1 || 0;
    totals.vat_total += row.vat_total;
    totals.revenue_ttc += row.revenue_ttc;
  });

  // Determine which VAT columns to show
  const vatRates = [
    {
      key: 'vat_10',
      label: 'TVA 10%',
      value: (row: MonthlyBreakdown) => row.vat_10 || 0,
    },
    {
      key: 'vat_5_5',
      label: 'TVA 5.5%',
      value: (row: MonthlyBreakdown) => row.vat_5_5 || 0,
    },
    {
      key: 'vat_20',
      label: 'TVA 20%',
      value: (row: MonthlyBreakdown) => row.vat_20 || 0,
    },
    {
      key: 'vat_2_1',
      label: 'TVA 2.1%',
      value: (row: MonthlyBreakdown) => row.vat_2_1 || 0,
    },
  ];

  const activeRates = vatRates.filter(
    (rate) => data.some((row) => rate.value(row) > 0) || totals[rate.key as keyof typeof totals] > 0
  );

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
            {activeRates.map((rate) => (
              <TableHead key={rate.key} className="text-right">
                {rate.label}
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
                {getMonthLabel(row.month)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(row.revenue_ht)}
              </TableCell>
              {activeRates.map((rate) => (
                <TableCell key={rate.key} className="text-right font-mono text-sm">
                  {formatCurrency(rate.value(row))}
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
          {activeRates.map((rate) => (
            <div key={rate.key}>
              <p className="text-xs text-muted-foreground mb-1">{rate.label}</p>
              <p className="text-lg font-bold font-mono">
                {formatCurrency(totals[rate.key as keyof typeof totals] as number)}
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
