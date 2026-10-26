import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Network, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateFranchiseDialog } from "@/components/franchise/CreateFranchiseDialog";
import { useFranchiseSelection } from "@/hooks/useFranchiseSelection";
import { qk } from "@/lib/queryKeys";
import { franchisesService } from "@/services/franchisesService";
import { franchiseRoleLabels, type FranchiseDetail } from "@/types/franchise";

export interface FranchisePageContext {
  franchiseId: string;
  detail: FranchiseDetail;
  /** Quitte la franchise affichée (supprimée, ou l'utilisateur n'en est plus gestionnaire). */
  leave: () => void;
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <div className="flex h-full items-center justify-center p-4">{children}</div>
    </DashboardLayout>
  );
}

/**
 * Cadre commun des pages du menu Franchise (Établissements, Hub,
 * Gestionnaires, Statistiques) : franchise affichée (?f=, sinon la dernière
 * consultée), sélecteur, création, chargement, erreurs et état vide. Les
 * droits suivent l'utilisateur, pas l'établissement sélectionné.
 */
export function FranchisePageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: (ctx: FranchisePageContext) => React.ReactNode;
}) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { listQuery, list, franchises, selectedId, select } = useFranchiseSelection();

  const detailQuery = useQuery({
    queryKey: qk.franchises.detail(selectedId ?? ""),
    queryFn: () => franchisesService.get(selectedId as string),
    enabled: selectedId !== null,
  });
  const detail = detailQuery.data;

  const createDialog = (
    <CreateFranchiseDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      onCreated={(created) => navigate(`/franchise?f=${encodeURIComponent(created.franchise.franchise_id)}`)}
    />
  );

  if (listQuery.isLoading || (selectedId && detailQuery.isLoading)) {
    return (
      <CenteredState>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CenteredState>
    );
  }

  if (listQuery.isError || detailQuery.isError) {
    return (
      <CenteredState>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Impossible de charger la franchise.</p>
            <Button
              onClick={() => (listQuery.isError ? listQuery.refetch() : detailQuery.refetch())}
              className="mt-4 w-full"
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </CenteredState>
    );
  }

  if (!selectedId || !detail) {
    return (
      <CenteredState>
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Network className="h-6 w-6" />
            </div>
            <CardTitle>Regroupez vos établissements</CardTitle>
            <CardDescription>
              Une franchise réunit vos établissements sur une page commune : vos clients voient ceux qui sont ouverts,
              les plus proches, et commandent ou réservent dans le bon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {list?.can_create ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer une franchise
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Seul un administrateur d'établissement peut créer une franchise.
              </p>
            )}
          </CardContent>
        </Card>
        {createDialog}
      </CenteredState>
    );
  }

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{title}</h1>
              {franchises.length > 1 ? (
                <Select value={selectedId} onValueChange={select}>
                  <SelectTrigger className="h-10 w-56 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((f) => (
                      <SelectItem key={f.franchise_id} value={f.franchise_id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="truncate text-xl text-muted-foreground">{detail.franchise.name}</span>
              )}
              <span className="text-sm text-muted-foreground">Votre rôle : {franchiseRoleLabels[detail.role]}</span>
            </div>
            {list?.can_create && (
              <Button variant="outline" onClick={() => setCreateOpen(true)} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle franchise
              </Button>
            )}
          </div>
        }
        description={description}
        className="space-y-6"
      >
        {children({ franchiseId: selectedId, detail, leave: () => select(null) })}
      </PageContainer>
      {createDialog}
    </DashboardLayout>
  );
}
