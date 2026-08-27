import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, KeyRound } from "lucide-react";

import { usersApi, rolesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyPermissionsNotice } from "@/components/shared";

/**
 * E3 — replaces the old flat permission-toggle grid (RightsTab) entirely.
 * A single role selector, plus a read-only preview of what that role
 * grants — so an admin sees what they're assigning without opening the
 * roles screen separately.
 *
 * Deliberately its own tab, never merged with "Contrat" (which owns
 * position/job_title — the "poste"): keeping role assignment and job
 * position in separate forms is the only thing preventing the two concepts
 * from blurring together again.
 *
 * The Sheet header's login-enabled toggle (MemberSheet.tsx) is untouched —
 * it still goes through GET/PUT /users/{id}/rights, unrelated plumbing.
 */
interface AccessTabProps {
  userId: string;
}

export function AccessTab({ userId }: AccessTabProps) {
  const queryClient = useQueryClient();
  const { authData } = useAuth();
  const isSelf = authData?.user.id === userId;

  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: qk.users.detail(userId),
    queryFn: () => usersApi.get(userId),
  });

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: qk.roles.list(),
    queryFn: rolesApi.list,
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (detail) setSelectedRoleId(detail.role_id ?? null);
  }, [detail]);

  const { data: selectedRole, isLoading: isLoadingSelectedRole } = useQuery({
    queryKey: qk.roles.detail(selectedRoleId ?? "none"),
    queryFn: () => rolesApi.get(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  const mutation = useMutation({
    mutationFn: (roleId: string) => usersApi.updateRole(userId, roleId),
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      queryClient.invalidateQueries({ queryKey: qk.roles.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    },
  });

  if (isLoadingDetail || !detail) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const dirty = selectedRoleId !== (detail.role_id ?? null);

  return (
    <div className="space-y-5 py-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Rôle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSelf && (
            <p className="text-xs text-muted-foreground italic">
              Vous ne pouvez pas modifier votre propre rôle.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="access-role-select">Rôle attribué</Label>
            <Select
              value={selectedRoleId ?? undefined}
              onValueChange={setSelectedRoleId}
              disabled={isLoadingRoles || isSelf}
            >
              <SelectTrigger id="access-role-select">
                <SelectValue placeholder="Aucun rôle attribué" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                    {role.system_key && (
                      <span className="text-muted-foreground"> · Système</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ce que ce rôle donne accès à</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedRoleId ? (
            <p className="text-sm text-muted-foreground">Aucun rôle attribué.</p>
          ) : isLoadingSelectedRole || !selectedRole ? (
            <Skeleton className="h-24 w-full" />
          ) : selectedRole.permissions.length === 0 ? (
            <EmptyPermissionsNotice />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedRole.permissions.map((p) => (
                <Badge key={p.key} variant="outline">
                  {p.label}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={() => selectedRoleId && mutation.mutate(selectedRoleId)}
          disabled={!dirty || !selectedRoleId || mutation.isPending || isSelf}
        >
          {mutation.isPending ? (
            "Enregistrement…"
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer le rôle
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
