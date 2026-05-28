import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IntegrationKey, IntegrationStatusMap } from '@/types/integrations';

export const useIntegrationStatus = () => {
  const { authData } = useAuth();

  const statuses: IntegrationStatusMap = useMemo(() => {
    const uberStoreId = authData?.integrations.uber_eats?.store_id;
    const deliverooLocationId = authData?.integrations.deliveroo?.location_id;
    const uberFeatureActive = authData?.capabilities.integrations.uber_eats ?? false;
    const deliverooFeatureActive = authData?.capabilities.integrations.deliveroo ?? false;

    const hasValue = (value: unknown) =>
      typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

    const hasUberConfig = hasValue(uberStoreId);
    const hasDeliverooConfig = hasValue(deliverooLocationId);

    return {
      uberEats: {
        active: uberFeatureActive,
        reason: hasUberConfig ? 'configured' : 'missing_config',
      },
      deliveroo: {
        active: deliverooFeatureActive,
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
      uberEats: toRate(authData?.integrations.uber_eats?.commission_rate, 30),
      deliveroo: toRate(authData?.integrations.deliveroo?.commission_rate, 20),
    };
  }, [authData]);

  return {
    statuses,
    isIntegrationActive,
    commissionRates,
  };
};
