import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Landmark } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  PayoutDocument,
  PayoutDocumentKind,
  payoutDocumentsService,
} from '@/services/payoutDocumentsService';

const formatDay = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

/** Montant en centimes → « 1 234,56 € ». */
const formatAmount = (cents: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (currency || 'eur').toUpperCase() }).format(cents / 100);

/**
 * Justificatifs de versement : historique des virements Stripe reçus, avec le
 * relevé de chacun (ce qu'il contient) et la facture de la commission Wello
 * Resto. Les mêmes documents sont envoyés par e-mail à chaque versement ;
 * le téléchargement passe par un lien signé d'une heure.
 */
const PayoutDocuments = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: payouts = [], isLoading, isError } = useQuery({
    queryKey: ['payout-documents'],
    queryFn: () => payoutDocumentsService.list(),
  });

  const handleDownload = async (payout: PayoutDocument, kind: PayoutDocumentKind) => {
    const key = `${payout.payout_id}:${kind}`;
    setDownloading(key);
    try {
      const link = await payoutDocumentsService.getLink(payout.payout_id, kind);
      window.open(link.download_url, '_blank');
    } catch {
      // Message déjà affiché par apiClient.
    } finally {
      setDownloading(null);
    }
  };

  const renderButton = (payout: PayoutDocument, kind: PayoutDocumentKind, label: string, available: boolean) => {
    const key = `${payout.payout_id}:${kind}`;
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => handleDownload(payout, kind)}
        disabled={!available || downloading === key}
        title={available ? undefined : 'Document non disponible'}
      >
        <Download className="h-4 w-4" />
        {downloading === key ? '...' : label}
      </Button>
    );
  };

  return (
    <DashboardLayout>
      <PageContainer header={<h1 className="text-3xl font-bold text-foreground">Versements</h1>}>
        <div className="space-y-6">
          <Card className="shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Landmark className="h-5 w-5" />
                Justificatifs de vos versements
              </CardTitle>
              <CardDescription>
                À chaque virement reçu de Stripe, vous recevez par e-mail un relevé qui détaille ce qu'il contient
                (commandes en ligne, borne, remboursements, commission, frais de paiement) et la facture de la
                commission Wello Resto. Retrouvez-les ici, pour votre comptable ou pour justifier un virement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : isError ? (
                <p className="text-sm text-destructive">Impossible de charger vos versements.</p>
              ) : payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun justificatif pour le moment. Ils apparaissent ici après chaque versement.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arrivée sur le compte</TableHead>
                      <TableHead>Montant versé</TableHead>
                      <TableHead>Commission TTC</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead className="text-right">Documents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.payout_id}>
                        <TableCell className="font-medium">{formatDay(payout.arrival_date)}</TableCell>
                        <TableCell>{formatAmount(payout.amount, payout.currency)}</TableCell>
                        <TableCell>
                          {payout.commission_ttc ? formatAmount(payout.commission_ttc, payout.currency) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {payout.invoice_number ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {renderButton(payout, 'statement', 'Relevé', payout.has_statement)}
                            {payout.invoice_number && renderButton(payout, 'invoice', 'Facture', payout.has_invoice)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default PayoutDocuments;
