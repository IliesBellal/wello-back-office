import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Landmark } from 'lucide-react';
import { SettingsCard } from '@/components/settings';
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
 * Onglet « Virements » : historique des virements Stripe reçus, avec le relevé
 * de chacun (ce qu'il contient) et la facture de la commission Wello Resto. Les
 * mêmes documents sont envoyés par e-mail à chaque versement ; le téléchargement
 * passe par un lien signé d'une heure.
 */
export function PayoutDocumentsPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: payouts = [], isLoading, isError } = useQuery({
    queryKey: ['payout-documents'],
    queryFn: () => payoutDocumentsService.list(),
  });

  const handleDownload = async (payout: PayoutDocument, kind: PayoutDocumentKind) => {
    setDownloading(`${payout.payout_id}:${kind}`);
    try {
      const link = await payoutDocumentsService.getLink(payout, kind);
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
    <SettingsCard
      title="Justificatifs de vos virements"
      description="À chaque virement reçu de Stripe, vous recevez par e-mail un relevé qui détaille ce qu'il contient (commandes en ligne, borne, remboursements, commission, frais de paiement) et la facture de la commission Wello Resto. Retrouvez-les ici, pour votre comptable ou pour justifier un virement."
      icon={Landmark}
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">Impossible de charger vos virements.</p>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun justificatif pour le moment. Ils apparaissent ici après chaque virement.
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
                <TableCell>{payout.commission_ttc ? formatAmount(payout.commission_ttc, payout.currency) : '—'}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{payout.invoice_number ?? '—'}</TableCell>
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
    </SettingsCard>
  );
}
