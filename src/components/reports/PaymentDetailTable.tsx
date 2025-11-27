import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentDayData } from '@/services/financialReportsService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentDetailTableProps {
  data: PaymentDayData[];
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(cents / 100);
};

export const PaymentDetailTable = ({ data }: PaymentDetailTableProps) => {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Moyen de Paiement</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((day) => (
            <>
              {day.payments.map((payment, index) => (
                <TableRow key={`${day.date}-${payment.mop}`}>
                  {index === 0 && (
                    <TableCell rowSpan={day.payments.length}>
                      {format(new Date(day.date), 'dd MMMM yyyy', { locale: fr })}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{payment.label}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2} className="text-right">
                  Total du {format(new Date(day.date), 'dd MMM', { locale: fr })}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(day.payments.reduce((sum, p) => sum + p.amount, 0))}
                </TableCell>
              </TableRow>
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
