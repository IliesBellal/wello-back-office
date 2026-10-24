import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MoreHorizontal, Plus, Store, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import type { FranchiseDetail, FranchiseMerchant } from "@/types/franchise";
import { AddMerchantsDialog } from "./AddMerchantsDialog";

interface FranchiseMerchantsTabProps {
  detail: FranchiseDetail;
}

function MerchantIdentity({ merchant }: { merchant: FranchiseMerchant }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {merchant.logo_url ? (
        <img src={merchant.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover border" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Store className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium truncate">{merchant.business_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[merchant.address, [merchant.zip_code, merchant.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}

function MerchantModes({ merchant }: { merchant: FranchiseMerchant }) {
  const modes = [
    merchant.order_types.in && "Sur place",
    merchant.order_types.take_away && "À emporter",
    merchant.order_types.delivery && "Livraison",
    merchant.reservation_enabled && "Réservation",
  ].filter(Boolean) as string[];
  if (modes.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {modes.map((m) => (
        <Badge key={m} variant="secondary" className="font-normal">
          {m}
        </Badge>
      ))}
    </div>
  );
}

function ScanNOrderStatus({ merchant }: { merchant: FranchiseMerchant }) {
  if (merchant.scannorder_active) {
    return <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-800 dark:text-green-400">Actif</Badge>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400" title="ScanNOrder n'est pas actif : l'établissement n'apparaît pas sur le hub.">
      <AlertTriangle className="h-3.5 w-3.5" />
      Inactif, non affiché
    </span>
  );
}

/** Onglet Établissements : rattachement, visibilité sur le hub, retrait. */
export function FranchiseMerchantsTab({ detail }: FranchiseMerchantsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const franchiseId = detail.franchise.franchise_id;
  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<FranchiseMerchant | null>(null);

  // Le nombre d'établissements de la liste « mes franchises » change aussi.
  const applyDetail = (next: FranchiseDetail) => {
    queryClient.setQueryData(qk.franchises.detail(franchiseId), next);
    queryClient.invalidateQueries({ queryKey: qk.franchises.lists });
  };

  const visibilityMutation = useMutation({
    mutationFn: ({ merchantId, visible }: { merchantId: string; visible: boolean }) =>
      franchisesService.setMerchantHubVisible(franchiseId, merchantId, visible),
    onSuccess: (next, { visible }) => {
      applyDetail(next);
      toast({ title: visible ? "Affiché sur le hub" : "Masqué sur le hub" });
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible de modifier la visibilité."), variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (merchantId: string) => franchisesService.removeMerchant(franchiseId, merchantId),
    onSuccess: (next) => {
      applyDetail(next);
      queryClient.invalidateQueries({ queryKey: qk.franchises.candidates(franchiseId) });
      toast({ title: "Établissement retiré de la franchise" });
      setToRemove(null);
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible de retirer cet établissement."), variant: "destructive" }),
  });

  const visibilitySwitch = (merchant: FranchiseMerchant) => (
    <Switch
      checked={merchant.hub_visible}
      disabled={visibilityMutation.isPending && visibilityMutation.variables?.merchantId === merchant.merchant_id}
      onCheckedChange={(visible) => visibilityMutation.mutate({ merchantId: merchant.merchant_id, visible })}
      aria-label={`Visible sur le hub : ${merchant.business_name}`}
    />
  );

  const actions = (merchant: FranchiseMerchant) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToRemove(merchant)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Retirer de la franchise
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Établissements</CardTitle>
          <CardDescription>
            Les établissements visibles et dont ScanNOrder est actif apparaissent sur le hub.
          </CardDescription>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un établissement
        </Button>
      </CardHeader>
      <CardContent>
        {detail.merchants.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Store className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Aucun établissement</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajoutez les établissements que vous administrez.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Établissement</TableHead>
                    <TableHead>Modes</TableHead>
                    <TableHead>ScanNOrder</TableHead>
                    <TableHead className="text-center">Visible sur le hub</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.merchants.map((m) => (
                    <TableRow key={m.merchant_id}>
                      <TableCell className="max-w-xs">
                        <MerchantIdentity merchant={m} />
                      </TableCell>
                      <TableCell>
                        <MerchantModes merchant={m} />
                      </TableCell>
                      <TableCell>
                        <ScanNOrderStatus merchant={m} />
                      </TableCell>
                      <TableCell className="text-center">{visibilitySwitch(m)}</TableCell>
                      <TableCell>{actions(m)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="space-y-3 md:hidden">
              {detail.merchants.map((m) => (
                <div key={m.merchant_id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <MerchantIdentity merchant={m} />
                    {actions(m)}
                  </div>
                  <MerchantModes merchant={m} />
                  <div className="flex items-center justify-between gap-2">
                    <ScanNOrderStatus merchant={m} />
                    <label className="flex items-center gap-2 text-sm">
                      Visible sur le hub
                      {visibilitySwitch(m)}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <AddMerchantsDialog franchiseId={franchiseId} open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Retirer l'établissement ?"
        description={`« ${toRemove?.business_name ?? ""} » ne fera plus partie de la franchise et disparaîtra du hub. L'établissement lui-même n'est pas modifié.`}
        confirmText="Retirer"
        isDangerous
        isLoading={removeMutation.isPending}
        onConfirm={() => toRemove && removeMutation.mutate(toRemove.merchant_id)}
      />
    </Card>
  );
}
