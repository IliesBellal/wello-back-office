import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Network, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer, TabSystem } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateFranchiseDialog } from "@/components/franchise/CreateFranchiseDialog";
import { FranchiseHubLink } from "@/components/franchise/FranchiseHubLink";
import { FranchiseMerchantsTab } from "@/components/franchise/FranchiseMerchantsTab";
import { FranchiseAppearanceTab } from "@/components/franchise/FranchiseAppearanceTab";
import { FranchiseMembersTab } from "@/components/franchise/FranchiseMembersTab";
import { useFranchiseSelection } from "@/hooks/useFranchiseSelection";
import { qk } from "@/lib/queryKeys";
import { franchisesService } from "@/services/franchisesService";
import { franchiseRoleLabels } from "@/types/franchise";

const TABS = [
  { id: "merchants", label: "Établissements" },
  { id: "appearance", label: "Apparence du hub" },
  { id: "members", label: "Gestionnaires" },
];

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <div className="flex h-full items-center justify-center p-4">{children}</div>
    </DashboardLayout>
  );
}

/**
 * Menu Franchise : franchises gérées par l'utilisateur, quel que soit
 * l'établissement sélectionné. La franchise affichée est dans l'URL (?f=).
 */
export default function Franchise() {
  const [activeTab, setActiveTab] = useState("merchants");
  const [createOpen, setCreateOpen] = useState(false);

  const { listQuery, list, franchises, selectedId, select } = useFranchiseSelection();
  const { isLoading: listLoading, isError: listError, refetch } = listQuery;

  const { data: detail, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: qk.franchises.detail(selectedId ?? ""),
    queryFn: () => franchisesService.get(selectedId as string),
    enabled: selectedId !== null,
  });

  const createDialog = (
    <CreateFranchiseDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      onCreated={(created) => {
        select(created.franchise.franchise_id);
        setActiveTab("merchants");
      }}
    />
  );

  if (listLoading || (selectedId && detailLoading)) {
    return (
      <CenteredState>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CenteredState>
    );
  }

  if (listError || detailError) {
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
            <Button onClick={() => refetch()} className="mt-4 w-full">
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

  const leave = () => {
    select(null);
    setActiveTab("merchants");
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-3xl font-bold">Franchise</h1>
                {franchises.length > 1 ? (
                  <Select value={selectedId} onValueChange={(value) => { select(value); setActiveTab("merchants"); }}>
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
                  <span className="text-xl text-muted-foreground truncate">{detail.franchise.name}</span>
                )}
              </div>
              {list?.can_create && (
                <Button variant="outline" onClick={() => setCreateOpen(true)} className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle franchise
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <FranchiseHubLink hubUrl={detail.hub_url} slug={detail.franchise.slug} />
              <p className="text-sm text-muted-foreground">Votre rôle : {franchiseRoleLabels[detail.role]}</p>
            </div>
          </div>
        }
      >
        <TabSystem
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          renderContent={(tab) => {
            if (tab === "appearance") {
              return <FranchiseAppearanceTab key={selectedId} detail={detail} onDeleted={leave} />;
            }
            if (tab === "members") {
              return <FranchiseMembersTab key={selectedId} detail={detail} onLeft={leave} />;
            }
            return <FranchiseMerchantsTab detail={detail} />;
          }}
        />
      </PageContainer>
      {createDialog}
    </DashboardLayout>
  );
}
