import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { integrationsService, type MenuSync, type MenuSyncStatus } from '@/services/integrationsService';

// Journal des publications du menu vers Deliveroo : le restaurateur y voit si
// sa dernière synchro est en ligne, en cours ou refusée, et pourquoi.

const STATUS_LABEL: Record<MenuSyncStatus, string> = {
  sending: 'Envoi en cours',
  processing: 'En cours de traitement',
  success: 'En ligne',
  failed: 'Échec',
  unchanged: 'Déjà à jour',
  unconfirmed: 'Envoyé, en attente de confirmation',
};

const STATUS_VARIANT: Record<MenuSyncStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  sending: 'secondary',
  processing: 'secondary',
  success: 'default',
  failed: 'destructive',
  unchanged: 'outline',
  unconfirmed: 'secondary',
};

const ORIGIN_LABEL: Record<string, string> = {
  manual: 'Manuelle',
  auto: 'Automatique',
  scenario_13: 'Test Deliveroo',
  scenario_15: 'Test Deliveroo',
};

const isPending = (s: MenuSync) => s.status === 'sending' || s.status === 'processing';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

interface DeliverooSyncLogProps {
  /** Change à chaque synchronisation manuelle pour recharger le journal. */
  refreshKey?: number;
}

export const DeliverooSyncLog = ({ refreshKey = 0 }: DeliverooSyncLogProps) => {
  const [syncs, setSyncs] = useState<MenuSync[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSyncs(await integrationsService.getDeliverooSyncs(10));
    } catch {
      // apiClient a déjà informé l'utilisateur ; on garde l'affichage précédent.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Tant qu'une publication attend son résultat, on rafraîchit sans intervention.
  const hasPending = syncs?.some(isPending) ?? false;
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [hasPending, load]);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Synchronisation du menu</CardTitle>
          <CardDescription>
            Les dernières mises à jour de votre menu sur Deliveroo. Les modifications de votre carte sont envoyées automatiquement.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent>
        {syncs === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : syncs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune synchronisation pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border">
            {syncs.map((sync) => {
              const refusedImages = sync.upload_errors?.images?.length ?? 0;
              const hasDetails = Boolean(sync.error || refusedImages > 0 || sync.availability_error || sync.warnings?.length);
              const open = openId === sync.id;
              return (
                <li key={sync.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="w-28 text-sm text-muted-foreground">{formatDate(sync.created_at)}</span>
                    <Badge variant={STATUS_VARIANT[sync.status]}>{STATUS_LABEL[sync.status]}</Badge>
                    <span className="text-sm">{ORIGIN_LABEL[sync.origin] ?? sync.origin}</span>
                    {sync.status !== 'unchanged' && (
                      <span className="text-sm text-muted-foreground">{sync.item_count} articles</span>
                    )}
                    {refusedImages > 0 && (
                      <span className="text-sm text-amber-600">{refusedImages} image(s) refusée(s)</span>
                    )}
                    {sync.availability_status === 'failed' && (
                      <span className="text-sm text-amber-600">Disponibilités non mises à jour</span>
                    )}
                    {hasDetails && (
                      <button
                        type="button"
                        className="ml-auto flex items-center text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setOpenId(open ? null : sync.id)}
                        aria-expanded={open}
                      >
                        {open ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                        Détails
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                      {sync.error && <p>{sync.error}</p>}
                      {sync.availability_error && <p>Disponibilités : {sync.availability_error}</p>}
                      {sync.upload_errors?.images?.map((img) => (
                        <p key={img.url}>Image refusée ({img.message}) : {img.url}</p>
                      ))}
                      {sync.warnings?.map((w) => <p key={w}>{w}</p>)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
