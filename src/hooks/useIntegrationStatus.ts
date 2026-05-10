import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IntegrationKey, IntegrationStatusMap } from '@/types/integrations';

export const useIntegrationStatus = () => {
  const { authData } = useAuth();

  const statuses: IntegrationStatusMap = useMemo(() => {
    const uberStoreId = authData?.integration_uber_eats?.store_id;
    const deliverooLocationId = authData?.integration_deliveroo?.location_id;

    const hasValue = (value: unknown) =>
      typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

    const hasUberConfig = Boolean(authData?.integration_uber_eats) && hasValue(uberStoreId);
    const hasDeliverooConfig = Boolean(authData?.integration_deliveroo) && hasValue(deliverooLocationId);

    return {
      uberEats: {
        active: hasUberConfig,
        reason: hasUberConfig ? 'configured' : 'missing_config',
      },
      deliveroo: {
        active: hasDeliverooConfig,
        reason: hasDeliverooConfig ? 'configured' : 'missing_config',
      },
    };
  }, [authData]);

  const isIntegrationActive = (key: IntegrationKey) => statuses[key].active;

  const commissionRates = useMemo(() => {
    const toRate = (value: unknown, fallback: number) => {
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return fallback;
      return value;
    };

    return {
      uberEats: toRate(authData?.integration_uber_eats?.commission_rate, 30),
      deliveroo: toRate(authData?.integration_deliveroo?.commission_rate, 20),
    };
  }, [authData]);

  return {
    statuses,
    isIntegrationActive,
    commissionRates,
  };
};
