import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { MenuSyncLog } from '@/components/integrations/MenuSyncLog';
import { UberEatsConnectPanel, UberEatsStoreSelectDialog } from '@/components/integrations/UberEatsConnect';
import { integrationsService, type IntegrationStatus } from '@/services/integrationsService';
import { marketplaceOnboardingService, onboardingErrorCode, UBER_RETURN_REASONS } from '@/services/marketplaceOnboardingService';

/**
 * Uber Eats : connexion par la page Uber (retour ici avec ?uber=…, voir
 * marketplaceOnboardingService), puis réglages, menu et journal.
 */
export default function UberEatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncCount, setSyncCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const updated = await integrationsService.getUberEatsStatus();
    setStatus(updated);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Retour de la page Uber Eats : ?uber=select&session=… | disconnected | error&reason=…
  useEffect(() => {
    const result = searchParams.get('uber');
    if (!result) return;
    if (result === 'select') {
      setSessionId(searchParams.get('session'));
    } else if (result === 'disconnected') {
      toast.success('Uber Eats est déconnecté : les commandes de ce restaurant ne seront plus reçues.');
      refresh();
    } else {
      toast.error(UBER_RETURN_REASONS[searchParams.get('reason') ?? ''] ?? UBER_RETURN_REASONS.failed);
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async (data: { commission_rate: number; auto_accept_orders: boolean; preparation_time_minutes?: number }) => {
    const updated = await integrationsService.updateUberEats(data);
    setStatus(updated);
  };

  // Uber exige une confirmation sur sa page pour retirer l'intégration : on y
  // redirige, le retour se fait avec ?uber=disconnected.
  const handleDisable = async () => {
    try {
      const url = await marketplaceOnboardingService.getUberDisconnectUrl(status?.store_id);
      window.location.assign(url);
    } catch (e) {
      toast.error(UBER_RETURN_REASONS[onboardingErrorCode(e) ?? ''] ?? 'La déconnexion a échoué. Réessayez dans un instant.');
    }
  };

  const handleSync = async () => {
    await integrationsService.syncUberEatsMenu();
    setSyncCount((n) => n + 1);
    await refresh();
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <h1 className="text-3xl font-bold text-foreground">Uber Eats</h1>
        }
        description="Gérez votre intégration Uber Eats, commandes et synchronisation du menu"
      >
        <IntegrationCard
          name="Uber Eats"
          status={status}
          loading={loading}
          onUpdate={handleUpdate}
          onDisable={handleDisable}
          onSync={handleSync}
          tutorial={null}
          inactiveContent={<UberEatsConnectPanel />}
          disableDescription="Vous allez être redirigé vers Uber Eats pour confirmer la déconnexion. Les commandes de ce restaurant ne seront plus reçues dans Wello Resto."
          enablePreparationTime={true}
        />
        {status?.active && <MenuSyncLog platform="uber_eats" refreshKey={syncCount} />}
        <UberEatsStoreSelectDialog
          sessionId={sessionId}
          onClose={() => setSessionId(null)}
          onConnected={() => {
            refresh();
          }}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
