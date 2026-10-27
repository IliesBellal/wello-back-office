import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import { FRANCHISE_NAME_MAX, type FranchiseDetail } from "@/types/franchise";
import { FranchiseImageField } from "./FranchiseImageField";
import { useFranchiseMutations } from "./useFranchiseMutations";

interface FranchiseSettingsTabProps {
  detail: FranchiseDetail;
  onDeleted: () => void;
}

/** Gestion → Paramètres : nom, logo, suppression de la franchise. */
export function FranchiseSettingsTab({ detail, onDeleted }: FranchiseSettingsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { franchise } = detail;
  const franchiseId = franchise.franchise_id;
  const { update, uploadImage } = useFranchiseMutations(franchiseId);

  const [name, setName] = useState(franchise.name);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const nameInvalid = name.trim().length === 0;
  const dirty = name.trim() !== franchise.name;

  const deleteMutation = useMutation({
    mutationFn: () => franchisesService.remove(franchiseId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: qk.franchises.detail(franchiseId) });
      queryClient.invalidateQueries({ queryKey: qk.franchises.all });
      toast({ title: "Franchise supprimée", description: "Les établissements ont été détachés." });
      setConfirmDeleteOpen(false);
      onDeleted();
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible de supprimer la franchise."), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nom de la franchise</CardTitle>
            <CardDescription>Affiché en haut du hub et sur la page de chaque établissement.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="franchise-name">Nom</Label>
              <Input id="franchise-name" value={name} maxLength={FRANCHISE_NAME_MAX} onChange={(e) => setName(e.target.value)} />
              {nameInvalid && <p className="text-xs text-destructive">Le nom est obligatoire.</p>}
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t pt-6">
            <Button variant="outline" disabled={!dirty || update.isPending} onClick={() => setName(franchise.name)}>
              Annuler
            </Button>
            <Button disabled={!dirty || nameInvalid || update.isPending} onClick={() => update.mutate({ name: name.trim() })}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Affiché sur le hub, et sur la carte pour les établissements sans logo.</CardDescription>
          </CardHeader>
          <CardContent>
            <FranchiseImageField
              label="Logo"
              url={franchise.logo_url}
              isLogo
              uploading={uploadImage.isPending && uploadImage.variables?.type === "logo"}
              onFile={(file) => uploadImage.mutate({ type: "logo", file })}
            />
          </CardContent>
        </Card>
      </div>

      {detail.role === "owner" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
            <CardDescription>
              Supprimer la franchise retire le hub et ses gestionnaires. Les établissements sont détachés, pas supprimés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer la franchise
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Supprimer « ${franchise.name} » ?`}
        description="Le hub ne sera plus accessible et ses QR codes cesseront de fonctionner. Cette action est définitive."
        confirmText="Supprimer"
        isDangerous
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
