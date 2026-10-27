import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import type { FranchiseDetail, FranchiseUpdateRequest } from "@/types/franchise";

/**
 * Enregistrement d'une franchise, partagé par les formulaires de Gestion et de
 * Hub : chaque carte n'envoie que ses propres champs, la franchise relue
 * remplace le cache (détail et liste).
 */
export function useFranchiseMutations(franchiseId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyDetail = (next: FranchiseDetail) => {
    queryClient.setQueryData(qk.franchises.detail(franchiseId), next);
    queryClient.invalidateQueries({ queryKey: qk.franchises.lists });
  };

  const update = useMutation({
    mutationFn: (payload: FranchiseUpdateRequest) => franchisesService.update(franchiseId, payload),
    onSuccess: (next) => {
      applyDetail(next);
      toast({ title: "Modifications enregistrées" });
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible d'enregistrer."), variant: "destructive" }),
  });

  const uploadImage = useMutation({
    mutationFn: ({ type, file }: { type: "logo" | "banner"; file: File }) => franchisesService.uploadImage(franchiseId, type, file),
    onSuccess: (url, { type }) => {
      const current = queryClient.getQueryData<FranchiseDetail>(qk.franchises.detail(franchiseId));
      if (current) {
        applyDetail({
          ...current,
          franchise: { ...current.franchise, [type === "logo" ? "logo_url" : "banner_url"]: url },
        });
      }
      toast({ title: type === "logo" ? "Logo mis à jour" : "Bannière mise à jour" });
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible d'envoyer l'image."), variant: "destructive" }),
  });

  return { update, uploadImage };
}
