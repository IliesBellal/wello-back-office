import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { franchiseErrorMessage, franchisesService } from "@/services/franchisesService";

interface AddMerchantsDialogProps {
  franchiseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Établissements que l'utilisateur administre. Ceux déjà dans la franchise
 * sont masqués, ceux d'une autre franchise grisés : un établissement
 * n'appartient qu'à une franchise.
 */
export function AddMerchantsDialog({ franchiseId, open, onOpenChange }: AddMerchantsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: qk.franchises.candidates(franchiseId),
    queryFn: () => franchisesService.candidates(franchiseId),
    enabled: open,
  });

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidates
      .filter((c) => c.franchise_id !== franchiseId)
      .filter((c) => !term || `${c.business_name} ${c.city} ${c.address}`.toLowerCase().includes(term));
  }, [candidates, franchiseId, search]);

  const close = (next: boolean) => {
    if (!next) {
      setSelected(new Set());
      setSearch("");
    }
    onOpenChange(next);
  };

  const addMutation = useMutation({
    mutationFn: () => franchisesService.addMerchants(franchiseId, [...selected]),
    onSuccess: (detail) => {
      queryClient.setQueryData(qk.franchises.detail(franchiseId), detail);
      queryClient.invalidateQueries({ queryKey: qk.franchises.lists });
      queryClient.invalidateQueries({ queryKey: qk.franchises.candidates(franchiseId) });
      toast({
        title: selected.size > 1 ? `${selected.size} établissements ajoutés` : "Établissement ajouté",
        description: "Ils sont visibles sur le hub.",
      });
      close(false);
    },
    onError: (error) =>
      toast({
        title: "Ajout impossible",
        description: franchiseErrorMessage(error, "Impossible d'ajouter ces établissements."),
        variant: "destructive",
      }),
  });

  const toggle = (merchantId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(merchantId)) next.delete(merchantId);
      else next.add(merchantId);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des établissements</DialogTitle>
          <DialogDescription>
            Seuls les établissements dont vous êtes administrateur peuvent être ajoutés.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un établissement"
            className="pl-9"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border divide-y">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {candidates.length === 0 || search.trim() === ""
                ? "Aucun autre établissement à ajouter."
                : "Aucun établissement ne correspond à la recherche."}
            </p>
          ) : (
            visible.map((c) => {
              const inOther = c.franchise_id !== null;
              return (
                <label
                  key={c.merchant_id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3",
                    inOther ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/50",
                  )}
                >
                  <Checkbox
                    checked={selected.has(c.merchant_id)}
                    onCheckedChange={() => toggle(c.merchant_id)}
                    disabled={inOther}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.business_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{[c.address, c.city].filter(Boolean).join(" · ")}</p>
                    {inOther && (
                      <p className="mt-1 text-xs text-muted-foreground">Déjà dans « {c.franchise_name ?? "une autre franchise"} »</p>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Annuler
          </Button>
          <Button onClick={() => addMutation.mutate()} disabled={selected.size === 0 || addMutation.isPending}>
            {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selected.size > 0 ? `Ajouter (${selected.size})` : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
