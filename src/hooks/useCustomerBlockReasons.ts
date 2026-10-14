import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { getCustomerBlockReasons, type CustomerBlockReason } from "@/services/customersService";

/**
 * Motifs de blocage de clients (GET /pos/deletion_reasons/customer). Liste
 * quasi statique : mise en cache longue, partagée entre la boîte de blocage, la
 * liste et la fiche client (qui s'en servent pour afficher le libellé).
 */
export function useCustomerBlockReasons(enabled = true) {
  const query = useQuery({
    queryKey: qk.customers.blockReasons,
    queryFn: getCustomerBlockReasons,
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const reasons: CustomerBlockReason[] = query.data ?? [];

  /** Libellé français d'un motif, ou undefined s'il est inconnu / pas encore chargé. */
  const labelFor = (reasonId: string | undefined): string | undefined => {
    if (!reasonId) return undefined;
    const reason = reasons.find((r) => r.deletion_reason_id === reasonId);
    return reason ? reason.label || reason.deletion_reason_desc : undefined;
  };

  return { reasons, labelFor, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
