import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { rolesApi } from "@/services/welloApi";
import { isApiHttpError } from "@/services/apiClient";
import { qk } from "@/lib/queryKeys";
import type { RoleEntry } from "@/types/roles";

export interface RoleHasMembersState {
  role: RoleEntry;
  holderCount: number;
}

/**
 * Archiving a role that's still held by someone is a 409 with an enriched
 * body ({holder_count}) — apiClient suppresses the generic toast for this
 * code (ROLE_DIALOG_CODES) so RoleHasMembersDialog can present it instead of
 * a raw error message. Every other archive error (role_immutable,
 * role_is_merchant_default, role_not_found, ...) already gets a readable
 * French toast from apiClient and is re-thrown here for the caller to
 * ignore — nothing else to do with it.
 */
export function useArchiveRoleFlow() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<RoleHasMembersState | null>(null);
  const mutation = useMutation({ mutationFn: (id: string) => rolesApi.archive(id) });

  const attemptArchive = async (role: RoleEntry): Promise<boolean> => {
    try {
      await mutation.mutateAsync(role.id);
      toast.success("Rôle archivé");
      queryClient.invalidateQueries({ queryKey: qk.roles.all });
      return true;
    } catch (err) {
      if (isApiHttpError(err)) {
        const body = err.responseBody as { status?: string; holder_count?: number } | undefined;
        if (body?.status === "role_has_members") {
          setPending({ role, holderCount: body.holder_count ?? 0 });
          return false;
        }
      }
      throw err;
    }
  };

  return {
    attemptArchive,
    pending,
    dismiss: () => setPending(null),
    isArchiving: mutation.isPending,
  };
}
