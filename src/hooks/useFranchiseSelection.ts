import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFranchiseList } from "@/hooks/useFranchises";

const LAST_FRANCHISE_KEY = "franchise:last-selected";

const readLast = (): string | null => {
  try {
    return localStorage.getItem(LAST_FRANCHISE_KEY);
  } catch {
    return null;
  }
};

const writeLast = (franchiseId: string | null) => {
  try {
    if (franchiseId) localStorage.setItem(LAST_FRANCHISE_KEY, franchiseId);
    else localStorage.removeItem(LAST_FRANCHISE_KEY);
  } catch {
    // Stockage indisponible : la sélection reste celle de l'URL.
  }
};

/**
 * Franchise affichée par les pages du menu Franchise : celle de l'URL (?f=),
 * sinon la dernière consultée sur cet appareil (les liens du menu n'ont pas
 * de ?f=), sinon la première gérée. L'URL est réalignée sur la franchise
 * réellement affichée, pour qu'un lien reste partageable.
 */
export function useFranchiseSelection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const listQuery = useFranchiseList();
  const franchises = listQuery.data?.franchises ?? [];
  const requestedId = searchParams.get("f");
  const managed = (id: string | null) => franchises.find((f) => f.franchise_id === id)?.franchise_id ?? null;
  const selectedId = managed(requestedId) ?? managed(readLast()) ?? franchises[0]?.franchise_id ?? null;

  const select = (franchiseId: string | null) => {
    writeLast(franchiseId);
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
