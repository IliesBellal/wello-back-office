import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  accountingErrorMessage,
  accountingSyncService,
  formatDifference,
  type AccountingItemStatus,
  type AccountingSyncItem,
} from '@/services/accountingSyncService';

const formatDay = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, 'EEE dd/MM/yyyy', { locale: fr });
};

const STATUS: Record<AccountingItemStatus, { label: string; variant: 'positive' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  sent: { label: 'Envoyée', variant: 'positive' },
  failed: { label: 'En échec, nouvel essai automatique', variant: 'warning' },
  uncertain: { label: 'À vérifier', variant: 'warning' },
  skipped: { label: 'Aucune vente', variant: 'secondary' },
  abandoned: { label: 'Abandonnée', variant: 'destructive' },
};

const RETRYABLE: AccountingItemStatus[] = ['failed', 'uncertain', 'abandoned'];

interface SyncJournalProps {
  items: AccountingSyncItem[] | undefined;
  loading: boolean;
  failedToLoad: boolean;
  providerName: string;
  /** Appelé après une relance : la page recharge le journal. */
  onChanged: () => void;
}

/**
 * Journal des jours envoyés au logiciel de comptabilité, du plus récent au
 * plus ancien, avec la relance d'un jour en échec. Un jour « à vérifier » est
 * un envoi dont on ne sait pas s'il a abouti : il n'est jamais renvoyé seul
 * (risque de doublon) ; l'utilisateur contrôle dans le logiciel puis relance.
 */
export const SyncJournal = ({ items, loading, failedToLoad, providerName, onChanged }: SyncJournalProps) => {
  const [retrying, setRetrying] = useState<string | null>(null);
  const [toConfirm, setToConfirm] = useState<AccountingSyncItem | null>(null);

  const retry = async (item: AccountingSyncItem) => {
    setRetrying(item.date);
    try {
      await accountingSyncService.retryItem(item.date);
      toast.success('Relance effectuée.');
      onChanged();
    } catch (e) {
      toast.error(accountingErrorMessage(e, 'Relance impossible.'));
    } finally {
      setRetrying(null);
    }
  };

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (failedToLoad) return <p className="text-sm text-destructive">Impossible de charger le journal des envois.</p>;
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun envoi pour le moment. La première journée sera envoyée demain matin, après sa clôture.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Journée</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Écart</TableHead>
            <TableHead>Détail</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = STATUS[item.status] ?? { label: item.status, variant: 'outline' as const };
            return (
              <TableRow key={item.date}>
                <TableCell className="font-medium capitalize">{formatDay(item.date)}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatDifference(item.difference)}</TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">
                  {item.status === 'sent' && item.external_id && <span>Écriture n° {item.external_id}</span>}
                  {item.status === 'uncertain' && (
                    <span>
                      L'envoi a peut-être abouti. Cherchez dans {providerName} une écriture portant la référence{' '}
                      <strong>{item.entry?.reference ?? item.date}</strong> avant de relancer.
                    </span>
                  )}
                  {item.status !== 'sent' && item.status !== 'uncertain' && item.last_error && <span>{item.last_error}</span>}
                </TableCell>
                <TableCell className="text-right">
                  {RETRYABLE.includes(item.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={retrying === item.date}
                      onClick={() => (item.status === 'uncertain' ? setToConfirm(item) : retry(item))}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Relancer
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!toConfirm}
        onOpenChange={(open) => !open && setToConfirm(null)}
        title="Relancer cet envoi ?"
        description={`Si l'écriture ${toConfirm?.entry?.reference ?? ''} existe déjà dans ${providerName}, la relancer créerait un doublon. Relancez uniquement si vous avez vérifié qu'elle n'y figure pas.`}
        confirmText="Je l'ai vérifié, relancer"
        cancelText="Annuler"
        isDangerous
        onConfirm={async () => {
          if (toConfirm) await retry(toConfirm);
        }}
      />
    </>
  );
};
