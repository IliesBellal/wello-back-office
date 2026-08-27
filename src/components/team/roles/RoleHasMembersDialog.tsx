import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { rolesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import type { RoleHasMembersState } from "@/hooks/useArchiveRoleFlow";

interface RoleHasMembersDialogProps {
  pending: RoleHasMembersState | null;
  onDismiss: () => void;
}

/**
 * Shown instead of a raw 409 when archiving a role still held by someone —
 * the holder count plus the actual holder list, each linking straight into
 * that member's "Accès" tab to reassign them. No bulk-reassign screen exists
 * (out of scope for this lot) — reassignment happens one member at a time.
 */
export function RoleHasMembersDialog({ pending, onDismiss }: RoleHasMembersDialogProps) {
  const navigate = useNavigate();

  const { data: members, isLoading } = useQuery({
    queryKey: qk.roles.members(pending?.role.id ?? "none"),
    queryFn: () => rolesApi.getMembers(pending!.role.id),
    enabled: !!pending,
  });

  const goToMember = (userId: string) => {
    onDismiss();
    navigate(`/equipe/equipiers?openMember=${userId}&tab=access`);
  };

  return (
    <AlertDialog open={!!pending} onOpenChange={(next) => !next && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ce rôle est encore porté</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.holderCount} utilisateur{pending && pending.holderCount !== 1 ? "s" : ""} porte
            {pending && pending.holderCount !== 1 ? "nt" : ""} encore « {pending?.role.name} ». Réaffectez-les à un autre
            rôle avant de pouvoir archiver celui-ci.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            members?.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => goToMember(member.user_id)}>
                  Voir
                </Button>
              </div>
            ))
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={onDismiss}>Fermer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
