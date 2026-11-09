import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { integrationsService } from '@/services/integrationsService';

export type CommissionRateSource = 'integration' | 'session';

export interface MarketplaceCommissionRate {
  /** Taux de commission en %, tel que réglé dans Intégrations. */
  rate: number;
  /**
   * `integration` : lu sur GET /integrations/{plateforme} (valeur à jour).
   * `session` : repli sur le taux figé dans la session à la connexion
   * (chargement en cours ou appel en échec).
   */
  source: CommissionRateSource;
}

const toRate = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

/**
 * Taux de commission Uber Eats / Deliveroo pour les calculs de rentabilité.
 *
 * La session (`authData.integrations.*.commission_rate`) n'est lue qu'à la
 * connexion : un taux modifié ensuite dans Intégrations n'y apparaissait pas,
 * et pour un établissement à plusieurs comptes Deliveroo la jointure de login
 * pouvait remonter le taux d'un compte déconnecté. On lit donc le compte
 * principal sur GET /integrations/uber-eats et /integrations/deliveroo — les
 * mêmes endpoints que la page Intégrations où le taux est saisi.
 */
export const useMarketplaceCommissionRates = () => {
  const { authData } = useAuth();
  const { statuses, commissionRates: sessionRates } = useIntegrationStatus();
  const merchantId = authData?.merchant.id ?? '';

  const uberQuery = useQuery({
    queryKey: ['integrations', 'uber-eats', 'status', merchantId] as const,
    queryFn: integrationsService.getUberEatsStatus,
    enabled: !!merchantId && statuses.uberEats.active,
    retry: 1,
  });

  const deliverooQuery = useQuery({
    queryKey: ['integrations', 'deliveroo', 'status', merchantId] as const,
    queryFn: integrationsService.getDeliverooStatus,
    enabled: !!merchantId && statuses.deliveroo.active,
    retry: 1,
  });

  const resolve = (live: unknown, session: number): MarketplaceCommissionRate => {
    const rate = toRate(live);
    return rate !== undefined ? { rate, source: 'integration' } : { rate: session, source: 'session' };
  };

  return {
    uberEats: resolve(uberQuery.data?.commission_rate, sessionRates.uberEats),
    deliveroo: resolve(deliverooQuery.data?.commission_rate, sessionRates.deliveroo),
  };
};
