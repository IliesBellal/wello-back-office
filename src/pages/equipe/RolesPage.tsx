import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

import { rolesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { usePermissions } from "@/hooks/usePermissions";
import { useArchiveRoleFlow } from "@/hooks/useArchiveRoleFlow";
import type { RoleEntry } from "@/types/roles";

import { RolesTable } from "@/components/team/roles/RolesTable";
import { RoleEditorSheet } from "@/components/team/roles/RoleEditorSheet";
import { RoleHasMembersDialog } from "@/components/team/roles/RoleHasMembersDialog";

export default function RolesPage() {
  const { canManageUsers } = usePermissions();

  if (!canManageUsers) {
    return <Navigate to="/" replace />;
  }

  return <RolesPageContent />;
}

type SheetState = { mode: "create" } | { mode: "edit"; role: RoleEntry } | { mode: "duplicate"; role: RoleEntry } | null;

function RolesPageContent() {
  const { data: roles, isLoading, isError, refetch } = useQuery({
    queryKey: qk.roles.list(),
    queryFn: rolesApi.list,
  });

  const [sheet, setSheet] = useState<SheetState>(null);
  const [archiveTarget, setArchiveTarget] = useState<RoleEntry | null>(null);
  const { attemptArchive, pending, dismiss, isArchiving } = useArchiveRoleFlow();

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    await attemptArchive(archiveTarget);
    setArchiveTarget(null);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Rôles</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Droits d'accès des membres de l'équipe
              </p>
            </div>
            <Button size="sm" onClick={() => setSheet({ mode: "create" })}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau rôle
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-destructive text-sm mb-3">Erreur lors du chargement des rôles.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <RolesTable
            roles={roles ?? []}
            onEdit={(role) => setSheet({ mode: "edit", role })}
            onDuplicate={(role) => setSheet({ mode: "duplicate", role })}
            onArchive={(role) => setArchiveTarget(role)}
          />
        )}
      </PageContainer>

      <RoleEditorSheet
        open={!!sheet}
        onOpenChange={(open) => !open && setSheet(null)}
        mode={sheet?.mode ?? "create"}
        roleId={sheet?.mode === "edit" ? sheet.role.id : undefined}
        sourceRole={sheet?.mode === "duplicate" ? sheet.role : undefined}
        onSaved={() => refetch()}
      />

      {/* Zero-holder archive: always confirm via a real archive attempt
          (never trust the row's cached member_count) — the 409 fallback
          (RoleHasMembersDialog) covers the race where it's gone stale. */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archiver ce rôle ?"
        description={`Le rôle « ${archiveTarget?.name} » sera archivé et ne pourra plus être attribué.`}
        onConfirm={handleArchiveConfirm}
        confirmText="Archiver"
        isDangerous
        isLoading={isArchiving}
      />

      <RoleHasMembersDialog pending={pending} onDismiss={dismiss} />
    </DashboardLayout>
  );
}
