import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { qk } from "@/lib/queryKeys";
import { franchisesService } from "@/services/franchisesService";

/**
 * Franchises gérées par l'utilisateur connecté et droit d'en créer.
 * Partagé par le menu (visibilité de l'entrée Franchise) et la page.
 */
export const useFranchiseList = () => {
  const { authData } = useAuth();
  const userId = authData?.user.id ?? "";
  return useQuery({
    queryKey: qk.franchises.list(userId),
    queryFn: franchisesService.list,
    enabled: userId !== "",
    staleTime: 5 * 60 * 1000,
  });
};

/** L'entrée Franchise du menu s'affiche si l'utilisateur gère ou peut créer une franchise. */
export const useShowFranchiseMenu = (): boolean => {
  const { data } = useFranchiseList();
  return Boolean(data && (data.franchises.length > 0 || data.can_create));
};
