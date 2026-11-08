import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { MenuSyncLog } from '@/components/integrations/MenuSyncLog';
import { DeliverooConnectPanel } from '@/components/integrations/DeliverooConnect';
import { integrationsService, type IntegrationStatus } from '@/services/integrationsService';

/**
 * Deliveroo : connexion par le Partner Hub (identifiant fourni par Wello
 * Resto, voir DeliverooConnectPanel), puis réglages, menu et journal.
 */
export default function DeliverooPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncCount, setSyncCount] = useState(0);

  const refresh = useCallback(async () => {
    const updated = await integrationsService.getDeliverooStatus();
    setStatus(updated);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handleUpdate = async (data: { commission_rate: number; auto_accept_orders: boolean; preparation_time_minutes?: number }) => {
    const updated = await integrationsService.updateDeliveroo(data);
    setStatus(updated);
  };

  const handleDisable = async () => {
    await integrationsService.disableDeliveroo();
    // L'API ne renvoie pas l'intégration après désactivation : on la relit.
    await refresh();
  };

  const handleSync = async () => {
    await integrationsService.syncDeliverooMenu();
    setSyncCount((n) => n + 1);
    await refresh();
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <h1 className="text-3xl font-bold text-foreground">Deliveroo</h1>
        }
        description="Gérez votre intégration Deliveroo, commandes et synchronisation du menu"
      >
        <IntegrationCard
          name="Deliveroo"
          status={status}
          loading={loading}
          onUpdate={handleUpdate}
          onDisable={handleDisable}
          onSync={handleSync}
          tutorial={null}
          inactiveContent={<DeliverooConnectPanel onConnected={refresh} />}
          disableDescription="Wello Resto cessera de gérer ce site Deliveroo. Pour ne plus du tout recevoir ses commandes dans Wello Resto, retirez aussi la liaison du site dans le Partner Hub Deliveroo (« Intégrations »)."
          enablePreparationTime={true}
        />
        {status?.active && <MenuSyncLog platform="deliveroo" refreshKey={syncCount} />}
      </PageContainer>
    </DashboardLayout>
  );
}
