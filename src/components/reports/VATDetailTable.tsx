import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VATDayData } from '@/services/financialReportsService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VATDetailTableProps {
  data: VATDayData[];
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(cents / 100);
};

export const VATDetailTable = ({ data }: VATDetailTableProps) => {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type de TVA</TableHead>
            <TableHead>Service</TableHead>
            <TableHead className="text-right">TTC</TableHead>
            <TableHead className="text-right">HT</TableHead>
            <TableHead className="text-right">TVA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((day) => (
            <>
              {day.VAT_data
                .filter(vat => vat.ttc > 0 || vat.ht > 0 || vat.tva > 0)
                .map((vat, index) => (
                  <TableRow key={`${day.date}-${index}`}>
                    {index === 0 && (
                      <TableCell rowSpan={day.VAT_data.filter(v => v.ttc > 0 || v.ht > 0 || v.tva > 0).length}>
                        {format(new Date(day.date), 'dd MMMM yyyy', { locale: fr })}
                      </TableCell>
                    )}
                    <TableCell>{vat.tva_title || 'Autre'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {vat.tva_delivery_type_label || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(vat.ttc)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(vat.ht)}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      {formatCurrency(vat.tva)}
                    </TableCell>
                  </TableRow>
                ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-right">Total du {format(new Date(day.date), 'dd MMM', { locale: fr })}</TableCell>
                <TableCell className="text-right">{formatCurrency(day.TTC_sum)}</TableCell>
                <TableCell className="text-right">{formatCurrency(day.HT_sum)}</TableCell>
                <TableCell className="text-right text-primary">{formatCurrency(day.TVA_sum)}</TableCell>
              </TableRow>
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
