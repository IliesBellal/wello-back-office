import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MappingForm } from '@/components/accounting-sync/MappingForm';
import { ProviderConnectCard } from '@/components/accounting-sync/ProviderConnectCard';
import { SyncJournal } from '@/components/accounting-sync/SyncJournal';
import { accountingErrorMessage, accountingSyncService, describeSyncNow } from '@/services/accountingSyncService';

const QUERY_KEY = ['accounting-sync'] as const;

const formatDay = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd/MM/yyyy', { locale: fr });
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
};

/** Motifs de retour d'une autorisation OAuth refusée ou échouée (paramètre `reason` posé par l'API). */
const OAUTH_REASONS: Record<string, string> = {
  denied: "L'autorisation a été refusée dans le logiciel de comptabilité.",
  invalid_state: "La demande de connexion a expiré. Recommencez.",
  already_connected: 'Un logiciel est déjà relié à votre établissement.',
  failed: 'La connexion a échoué. Recommencez dans un instant.',
};

/**
 * Synchronisation comptable : relier le logiciel de comptabilité de
 * l'établissement (Pennylane pour l'instant), confirmer la correspondance de
 * comptes, puis suivre les jours envoyés (docs/accounting-sync.md côté API).
 * Une seule connexion par établissement.
 */
const AccountingSync = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingMapping, setEditingMapping] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => accountingSyncService.get(),
  });
  const connection = data?.connection ?? null;
  const provider = data?.providers.find((p) => p.key === connection?.provider);

  const itemsQuery = useQuery({
    queryKey: [...QUERY_KEY, 'items'],
    queryFn: () => accountingSyncService.listItems(),
    enabled: connection?.status === 'active',
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  // Retour de l'autorisation OAuth : l'API redirige ici avec ?accounting=ok|error&reason=...
  useEffect(() => {
    const result = searchParams.get('accounting');
    if (!result) return;
    if (result === 'ok') {
      toast.success('Connexion établie. Il reste à confirmer vos comptes comptables.');
    } else {
      toast.error(OAUTH_REASONS[searchParams.get('reason') ?? ''] ?? OAUTH_REASONS.failed);
    }
    setSearchParams({}, { replace: true });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnect = async () => {
    try {
      await accountingSyncService.disconnect();
      toast.success('Logiciel déconnecté. Le journal des jours déjà envoyés est conservé.');
      setEditingMapping(false);
      await refresh();
    } catch (e) {
      toast.error(accountingErrorMessage(e, 'Déconnexion impossible.'));
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await accountingSyncService.syncNow();
      const message = describeSyncNow(result);
      if (result.failed > 0 || result.uncertain > 0 || result.busy) toast.warning(message);
      else toast.success(message);
      await refresh();
    } catch (e) {
      toast.error(accountingErrorMessage(e, 'Synchronisation impossible.'));
    } finally {
      setSyncing(false);
    }
  };

  const providerName = connection?.provider_name ?? provider?.name ?? 'le logiciel';

  return (
    <DashboardLayout>
      <PageContainer header={<h1 className="text-3xl font-bold text-foreground">Comptabilité</h1>}>
        <div className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : isError || !data ? (
            <Alert variant="destructive">
              <AlertDescription>Impossible de charger la configuration comptable. Réessayez dans un instant.</AlertDescription>
            </Alert>
          ) : !connection ? (
            <ProviderConnectCard providers={data.providers} onConnected={refresh} />
          ) : (
            <>
              <Card className="shadow-card rounded-xl">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        {providerName}
                        {connection.status === 'active' && (
                          <Badge variant="positive" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Synchronisation active
                          </Badge>
                        )}
                        {connection.status === 'setup' && <Badge variant="warning">Configuration à terminer</Badge>}
                        {connection.status === 'error' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Connexion refusée
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {connection.account_label ? `Société : ${connection.account_label}. ` : ''}
                        Connecté le {formatDateTime(connection.connected_at)}.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {connection.status === 'active' && (
                        <Button variant="outline" className="gap-2" onClick={handleSyncNow} disabled={syncing}>
                          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                          {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                        </Button>
                      )}
                      <Button variant="outline" className="gap-2" onClick={() => setConfirmDisconnect(true)}>
                        <Unplug className="h-4 w-4" />
                        Déconnecter
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {connection.status === 'active' && (
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {connection.sync_from && <p>Premier jour envoyé : {formatDay(connection.sync_from)}.</p>}
                    <p>
                      {connection.last_sync_at
                        ? `Dernière vérification : ${formatDateTime(connection.last_sync_at)}.`
                        : 'Aucun envoi encore : la première journée partira demain matin.'}
                    </p>
                    {connection.last_error && <p className="text-destructive">{connection.last_error}</p>}
                  </CardContent>
                )}
              </Card>

              {connection.status === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{providerName} refuse la connexion</AlertTitle>
                  <AlertDescription className="space-y-1">
                    <p>
                      Le jeton a expiré, a été révoqué ou n'a plus les droits nécessaires. La synchronisation est
                      arrêtée ; aucun jour n'est perdu, ils partiront à la reconnexion.
                    </p>
                    <p>
                      Cliquez sur <strong>Déconnecter</strong>, puis reconnectez-vous avec un nouveau jeton. Votre
                      correspondance de comptes sera à confirmer à nouveau.
                    </p>
                    {connection.last_error && <p className="text-xs">{connection.last_error}</p>}
                  </AlertDescription>
                </Alert>
              )}

              {connection.status === 'setup' && (
                <Card className="shadow-card rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-foreground">Correspondance de comptes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MappingForm connection={connection} provider={provider} onSaved={refresh} />
                  </CardContent>
                </Card>
              )}

              {connection.status === 'active' && (
                <>
                  <Card className="shadow-card rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-foreground">Correspondance de comptes</CardTitle>
                      {!editingMapping && (
                        <CardDescription>
                          Journal {connection.mapping.journal_code} · ventes {connection.mapping.sales_accounts?.default} ·
                          TVA {connection.mapping.vat_accounts?.default} · encaissements{' '}
                          {connection.mapping.payment_accounts?.default} · écart {connection.mapping.difference_account}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingMapping ? (
                        <MappingForm
                          connection={connection}
                          provider={provider}
                          onCancel={() => setEditingMapping(false)}
                          onSaved={() => {
                            setEditingMapping(false);
                            refresh();
                          }}
                        />
                      ) : (
                        <Button variant="outline" onClick={() => setEditingMapping(true)}>
                          Modifier la correspondance
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-card rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-foreground">Journées envoyées</CardTitle>
                      <CardDescription>
                        Chaque journée clôturée est envoyée automatiquement. Un écart signifie que les encaissements du
                        jour diffèrent des ventes ; il est imputé au compte d'écart.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SyncJournal
                        items={itemsQuery.data}
                        loading={itemsQuery.isLoading}
                        failedToLoad={itemsQuery.isError}
                        providerName={providerName}
                        onChanged={refresh}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>

        <ConfirmDialog
          open={confirmDisconnect}
          onOpenChange={setConfirmDisconnect}
          title={`Déconnecter ${providerName} ?`}
          description="Les prochaines journées ne seront plus envoyées. Les écritures déjà créées dans le logiciel restent en place, et le journal des envois est conservé : en vous reconnectant, les jours déjà envoyés ne seront pas renvoyés."
          confirmText="Déconnecter"
          cancelText="Annuler"
          isDangerous
          onConfirm={handleDisconnect}
        />
      </PageContainer>
    </DashboardLayout>
  );
};

export default AccountingSync;
