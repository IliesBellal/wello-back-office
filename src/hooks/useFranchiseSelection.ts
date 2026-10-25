import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFranchiseList } from "@/hooks/useFranchises";

/**
 * Franchise affichée par les pages Gestion et Statistiques : celle de l'URL
 * (?f=), sinon la première gérée. L'URL est réalignée sur la franchise
 * réellement affichée, pour qu'un lien reste partageable et que le passage
 * d'une page à l'autre garde la même franchise.
 */
export function useFranchiseSelection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const listQuery = useFranchiseList();
  const franchises = listQuery.data?.franchises ?? [];
  const requestedId = searchParams.get("f");
  const selectedId =
    franchises.find((f) => f.franchise_id === requestedId)?.franchise_id ?? franchises[0]?.franchise_id ?? null;

  const select = (franchiseId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (franchiseId) next.set("f", franchiseId);
    else next.delete("f");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (selectedId && selectedId !== requestedId) select(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, requestedId]);

  return { listQuery, list: listQuery.data, franchises, selectedId, select };
}
