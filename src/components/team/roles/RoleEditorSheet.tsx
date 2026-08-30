import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, Users } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { rolesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { diffPermissions } from "@/lib/roleDiff";
import { useRoleVersionConflict } from "@/hooks/useRoleVersionConflict";
import type { Permission, RoleEntry } from "@/types/roles";

import { PermissionsEditor } from "./PermissionsEditor";
import { SaveDiffDialog } from "./SaveDiffDialog";
import { VersionConflictDialog } from "./VersionConflictDialog";

interface RoleEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "duplicate";
  /** required for mode="edit" */
  roleId?: string;
  /** required for mode="duplicate" — the role being copied */
  sourceRole?: RoleEntry;
  onSaved?: () => void;
}

interface Draft {
  name: string;
  description: string;
  keys: Set<string>;
}

const emptyDraft = (): Draft => ({ name: "", description: "", keys: new Set() });

export function RoleEditorSheet({ open, onOpenChange, mode, roleId, sourceRole, onSaved }: RoleEditorSheetProps) {
  const queryClient = useQueryClient();

  // ── Load existing role (edit) or the source role's permissions (duplicate) ──
  const { data: loadedRole, isLoading: isLoadingRole } = useQuery({
    queryKey: qk.roles.detail(roleId ?? sourceRole?.id ?? "none"),
    queryFn: () => rolesApi.get((roleId ?? sourceRole!.id)!),
    enabled: open && (mode === "edit" ? !!roleId : mode === "duplicate" ? !!sourceRole : false),
  });

  // ── Member count (impact banner) — edit mode only, a new/duplicated role starts with 0 holders ──
  const { data: members } = useQuery({
    queryKey: qk.roles.members(roleId ?? "none"),
    queryFn: () => rolesApi.getMembers(roleId!),
    enabled: open && mode === "edit" && !!roleId,
  });

  // ── Permission catalogue (grouped by domain, for the editor UI) ──
  const { data: catalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: qk.permissionsCatalog,
    queryFn: rolesApi.getCatalog,
    staleTime: 30 * 60 * 1000,
    enabled: open,
  });

  // ── Local baseline (server truth used for diffing/versioning) + draft ──
  // Everything the editor diffs against — including name/description, not
  // just permissions — lives here so a version-conflict reload (which
  // replaces this, not `loadedRole`) keeps every comparison consistent.
  const [baseline, setBaseline] = useState<{ version: number; name: string; description: string; permissions: Permission[] }>({
    version: 0,
    name: "",
    description: "",
    permissions: [],
  });
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSaveDiff, setPendingSaveDiff] = useState<{ before: Permission[]; after: Permission[] } | null>(null);
  const [saveDiffResolver, setSaveDiffResolver] = useState<((confirmed: boolean) => void) | null>(null);

  const { conflict, isReloading, captureIfVersionConflict, dismiss: dismissConflict } = useRoleVersionConflict(roleId);

  // Seed baseline/draft whenever the sheet opens for a given target.
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setBaseline({ version: 0, name: "", description: "", permissions: [] });
      setDraft(emptyDraft());
      return;
    }
    if (!loadedRole) return;
    if (mode === "edit") {
      setBaseline({ version: loadedRole.version, name: loadedRole.name, description: loadedRole.description, permissions: loadedRole.permissions });
      setDraft({ name: loadedRole.name, description: loadedRole.description, keys: new Set(loadedRole.permissions.map((p) => p.key)) });
    } else if (mode === "duplicate") {
      // name/description always come fresh, never from the source (per API contract) —
      // only the permission set is prefilled, so the admin can immediately drop a couple
      // before creating ("comme untel, mais sans les remboursements").
      setBaseline({ version: 0, name: "", description: "", permissions: loadedRole.permissions });
      setDraft({ name: "", description: "", keys: new Set(loadedRole.permissions.map((p) => p.key)) });
    }
  }, [open, mode, loadedRole]);

  const isAdminRole = mode === "edit" && loadedRole?.system_key === "admin";
  const memberCount = members?.length ?? 0;

  const handleToggle = (permission: Permission, checked: boolean) => {
    applyToggle(permission.key, checked);
  };

  const applyToggle = (key: string, checked: boolean) => {
    setDraft((d) => {
      const keys = new Set(d.keys);
      if (checked) keys.add(key);
      else keys.delete(key);
      return { ...d, keys };
    });
  };

  const draftPermissionObjects = (): Permission[] => {
    if (!catalog) return [];
    const all = catalog.flatMap((g) => g.permissions);
    return all.filter((p) => draft.keys.has(p.key));
  };

  /** Opens SaveDiffDialog and waits for the user's choice. */
  const confirmSaveDiff = (before: Permission[], after: Permission[]): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingSaveDiff({ before, after });
      setSaveDiffResolver(() => resolve);
    });
  };

  const resolveSaveDiff = (confirmed: boolean) => {
    saveDiffResolver?.(confirmed);
    setPendingSaveDiff(null);
    setSaveDiffResolver(null);
  };

  const invalidateAfterSave = () => {
    queryClient.invalidateQueries({ queryKey: qk.roles.all });
    if (roleId) queryClient.invalidateQueries({ queryKey: qk.roles.detail(roleId) });
  };

  // ── Save: create ──
  const handleCreate = async () => {
    if (!draft.name.trim()) {
      toast.error("Le nom du rôle est obligatoire");
      return;
    }
    setIsSaving(true);
    try {
      const created = await rolesApi.create({ name: draft.name.trim(), description: draft.description.trim() || undefined });
      if (draft.keys.size > 0) {
        await rolesApi.updatePermissions(created.id, { permission_keys: [...draft.keys], version: created.version });
      }
      toast.success("Rôle créé");
      invalidateAfterSave();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save: duplicate ──
  const handleDuplicateCreate = async () => {
    if (!draft.name.trim() || !sourceRole) {
      toast.error("Le nom du rôle est obligatoire");
      return;
    }
    const after = draftPermissionObjects();
    const diff = diffPermissions(baseline.permissions, after);
    if (diff.added.length > 0 || diff.removed.length > 0) {
      const confirmed = await confirmSaveDiff(baseline.permissions, after);
      if (!confirmed) return;
    }
    setIsSaving(true);
    try {
      const created = await rolesApi.create({
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        duplicate_from_role_id: sourceRole.id,
      });
      const createdKeys = new Set(created.permissions.map((p) => p.key));
      const stillDiffers = draft.keys.size !== createdKeys.size || [...draft.keys].some((k) => !createdKeys.has(k));
      if (stillDiffers) {
        await rolesApi.updatePermissions(created.id, { permission_keys: [...draft.keys], version: created.version });
      }
      toast.success("Rôle créé");
      invalidateAfterSave();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save: edit ── name/description PATCH first if changed (its RETURNED
  // version feeds the permissions PUT below — using the page-load version
  // there would spuriously 409 against this very PATCH).
  const handleEditSave = async () => {
    if (!roleId) return;
    const nameOrDescChanged = draft.name !== baseline.name || draft.description !== baseline.description;
    const after = draftPermissionObjects();
    const diff = diffPermissions(baseline.permissions, after);
    const permissionsChanged = diff.added.length > 0 || diff.removed.length > 0;

    if (!nameOrDescChanged && !permissionsChanged) {
      onOpenChange(false);
      return;
    }

    // Confirm the permissions diff BEFORE marking anything "saving" — the
    // dialog's own confirm button is disabled while isSaving is true, so
    // setting it before this await would leave the button permanently
    // disabled for as long as the dialog is open waiting on the user.
    if (permissionsChanged) {
      const confirmed = await confirmSaveDiff(baseline.permissions, after);
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      let workingVersion = baseline.version;

      if (nameOrDescChanged) {
        try {
          const updated = await rolesApi.update(roleId, { name: draft.name.trim(), description: draft.description, version: workingVersion });
          workingVersion = updated.version;
          setBaseline({ version: updated.version, name: updated.name, description: updated.description, permissions: updated.permissions });
        } catch (err) {
          if (await captureIfVersionConflict(err)) return;
          throw err;
        }
      }

      if (permissionsChanged) {
        try {
          const updated = await rolesApi.updatePermissions(roleId, { permission_keys: [...draft.keys], version: workingVersion });
          setBaseline({ version: updated.version, name: updated.name, description: updated.description, permissions: updated.permissions });
        } catch (err) {
          if (await captureIfVersionConflict(err)) return;
          throw err;
        }
      }

      toast.success("Rôle enregistré");
      invalidateAfterSave();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (mode === "create") return handleCreate();
    if (mode === "duplicate") return handleDuplicateCreate();
    return handleEditSave();
  };

  const handleReloadAfterConflict = () => {
    if (!conflict) return;
    setBaseline({
      version: conflict.freshRole.version,
      name: conflict.freshRole.name,
      description: conflict.freshRole.description,
      permissions: conflict.freshRole.permissions,
    });
    // draft (name/description text, permission checkboxes) intentionally untouched.
    dismissConflict();
  };

  const isLoading = (mode === "edit" || mode === "duplicate") && isLoadingRole;
  const title = mode === "create" ? "Nouveau rôle" : mode === "duplicate" ? `Dupliquer « ${sourceRole?.name} »` : draft.name || "Rôle";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="mt-6 space-y-3">
              <div className="h-10 bg-muted animate-pulse rounded-md" />
              <div className="h-24 bg-muted animate-pulse rounded-md" />
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {isAdminRole && (
                <div className="flex items-start gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm text-purple-900">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Le rôle Administrateur donne accès à toutes les fonctionnalités par construction et ne peut pas être
                    modifié, renommé ni archivé.
                  </span>
                </div>
              )}

              {mode === "edit" && !isAdminRole && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {memberCount} utilisateur{memberCount !== 1 ? "s" : ""} porte{memberCount !== 1 ? "nt" : ""} ce rôle.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role-name">Nom</Label>
                <Input
                  id="role-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  disabled={isAdminRole}
                  placeholder="Ex. Serveur"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  disabled={isAdminRole}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Droits</Label>
                <PermissionsEditor
                  domains={catalog}
                  isLoading={isLoadingCatalog}
                  selectedKeys={draft.keys}
                  onToggle={handleToggle}
                  readOnly={isAdminRole}
                />
              </div>

              {!isAdminRole && (
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Enregistrement..." : mode === "edit" ? "Enregistrer" : "Créer le rôle"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <SaveDiffDialog
        open={!!pendingSaveDiff}
        diff={pendingSaveDiff ? diffPermissions(pendingSaveDiff.before, pendingSaveDiff.after) : null}
        isSaving={isSaving}
        onConfirm={() => resolveSaveDiff(true)}
        onCancel={() => resolveSaveDiff(false)}
      />

      <VersionConflictDialog
        conflict={conflict}
        loadedPermissions={baseline.permissions}
        isReloading={isReloading}
        onReload={handleReloadAfterConflict}
        onDismiss={dismissConflict}
      />
    </>
  );
}
