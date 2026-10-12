import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Receipt } from 'lucide-react';
import { SettingsCard } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SubscriptionInvoice, subscriptionInvoicesService } from '@/services/subscriptionInvoicesService';

const formatDay = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

/** Montant en centimes → « 79,00 € ». */
const formatAmount = (cents: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (currency || 'eur').toUpperCase() }).format(cents / 100);

/**
 * Onglet « Factures » : historique des factures de l'abonnement Wello Resto,
 * envoyées par e-mail à chaque paiement. Le téléchargement passe par un lien
 * signé d'une heure.
 */
export function SubscriptionInvoicesPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: () => subscriptionInvoicesService.list(),
  });

  const handleDownload = async (invoice: SubscriptionInvoice) => {
    setDownloading(invoice.invoice_id);
    try {
      const link = await subscriptionInvoicesService.getLink(invoice.invoice_id);
      window.open(link.download_url, '_blank');
    } catch {
      // Message déjà affiché par apiClient.
    } finally {
      setDownloading(null);
    }
  };

  return (
    <SettingsCard
      title="Factures de l'abonnement"
      description="À chaque paiement de votre abonnement, la facture vous est envoyée par e-mail. Retrouvez-les ici, pour votre comptable."
      icon={Receipt}
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">Impossible de charger vos factures.</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune facture pour le moment. Elles apparaissent ici après chaque paiement de l'abonnement.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facture</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Payée le</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead className="text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.invoice_id}>
                <TableCell className="font-mono text-xs">{invoice.number || invoice.invoice_id}</TableCell>
                <TableCell>
                  {invoice.period_end > invoice.period_start
                    ? `${formatDay(invoice.period_start)} → ${formatDay(invoice.period_end)}`
                    : '—'}
                </TableCell>
                <TableCell>{formatDay(invoice.paid_at)}</TableCell>
                <TableCell className="font-medium">{formatAmount(invoice.amount_paid, invoice.currency)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleDownload(invoice)}
                    disabled={!invoice.has_pdf || downloading === invoice.invoice_id}
                    title={invoice.has_pdf ? undefined : 'Document non disponible'}
                  >
                    <Download className="h-4 w-4" />
                    {downloading === invoice.invoice_id ? '...' : 'Télécharger'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SettingsCard>
  );
}
