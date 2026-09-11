import { useEffect, useState } from 'react';

export interface PerMerchantAnalytics<T> {
  merchantId: string;
  data: T | null;
}

/**
 * Fetches one analytics response per establishment (not a per-merchant
 * breakdown of a single response — CA/Commandes/Règlements don't carry one,
 * unlike TVA's by_merchant.by_rate/by_channel) so the comparison tabs can
 * duplicate their Évolution/Répartition charts per establishment.
 *
 * `fetchOne` is called once per id in `merchantIds`, in parallel, each with
 * that single establishment as scope. Only enabled while `enabled` is true
 * (comparison mode, 2+ establishments) — the calling tab already has its own
 * combined-scope fetch for the aggregate view, this hook is purely additive.
 */
export function usePerMerchantAnalytics<T>(
  enabled: boolean,
  merchantIds: string[],
  dateRange: { from: Date; to: Date },
  fetchOne: (from: Date, to: Date, merchantId: string) => Promise<T>
): { perMerchant: PerMerchantAnalytics<T>[]; isLoading: boolean } {
  const [perMerchant, setPerMerchant] = useState<PerMerchantAnalytics<T>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || merchantIds.length === 0) {
      setPerMerchant([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    Promise.all(
      merchantIds.map((merchantId) =>
        fetchOne(dateRange.from, dateRange.to, merchantId)
          .then((data) => ({ merchantId, data }))
          .catch(() => ({ merchantId, data: null as T | null }))
      )
    ).then((results) => {
      if (!isMounted) return;
      setPerMerchant(results);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, merchantIds.join(','), dateRange.from.getTime(), dateRange.to.getTime()]);

  return { perMerchant, isLoading };
}
