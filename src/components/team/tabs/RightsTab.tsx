import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Shield } from "lucide-react";

import { usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import type { MerchantUserPermissions, MerchantUserRights } from "@/types/adminUsers";

// ─── Permission families ──────────────────────────────────────────────────────

type PermKey = keyof MerchantUserPermissions;

interface PermissionItem {
  key: PermKey;
  label: string;
  description?: string;
}

interface PermissionGroup {
  title: string;
  items: PermissionItem[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Accès opérationnels",
    items: [
      { key: "access_reception", label: "Accès à la prise de commande sur place" },
      { key: "access_delivery", label: "Accès à la livraison" },
      { key: "access_waiter", label: "Accès au mode service en salle" },
      { key: "open_cash_drawer", label: "Ouvrir le tiroir-caisse" },
      { key: "print_merchant_cash_report", label: "Imprimer le rapport de caisse" },
    ],
  },
  {
    title: "Gestion",
    items: [
      { key: "manage_menu", label: "Gérer le menu" },
      { key: "manage_plannings", label: "Gérer les plannings" },
      { key: "manage_users", label: "Gérer les membres" },
      { key: "manage_settings", label: "Gérer les paramètres" },
      { key: "manage_haccp", label: "Gérer HACCP" },
      { key: "manage_customers", label: "Gérer les clients" },
    ],
  },
  {
    title: "Reporting & finances",
    items: [
      { key: "view_reports", label: "Voir les rapports" },
      { key: "export_reports", label: "Exporter les rapports" },
      { key: "view_financials", label: "Voir les données financières" },
      { key: "export_financials", label: "Exporter les données financières" },
      { key: "export_customers", label: "Exporter les clients" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_PERMS: MerchantUserPermissions = {
  access_reception: false,
  access_delivery: false,
  access_waiter: false,
  print_merchant_cash_report: false,
  open_cash_drawer: false,
  manage_menu: false,
  manage_plannings: false,
  manage_users: false,
  manage_settings: false,
  manage_haccp: false,
  view_reports: false,
  export_reports: false,
  view_financials: false,
  export_financials: false,
  manage_customers: false,
  export_customers: false,
};

function rightsEqual(a: MerchantUserRights, b: MerchantUserRights): boolean {
  if (a.admin !== b.admin || a.login_enabled !== b.login_enabled) return false;
  return (Object.keys(EMPTY_PERMS) as PermKey[]).every((k) => a.permissions[k] === b.permissions[k]);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RightsTabProps {
  userId: string;
}

export function RightsTab({ userId }: RightsTabProps) {
  const queryClient = useQueryClient();

  const { data: serverRights, isLoading } = useQuery({
    queryKey: qk.users.rights(userId),
    queryFn: () => usersApi.getRights(userId),
  });

  const [draft, setDraft] = useState<MerchantUserRights>({
    admin: false,
    login_enabled: false,
    permissions: { ...EMPTY_PERMS },
  });

  useEffect(() => {
    if (serverRights) {
      setDraft({
        admin: serverRights.admin,
        login_enabled: serverRights.login_enabled,
        permissions: { ...EMPTY_PERMS, ...serverRights.permissions },
      });
    }
  }, [serverRights]);

  const mutation = useMutation({
    mutationFn: (payload: MerchantUserRights) => usersApi.updateRights(userId, payload),
    onSuccess: (updated) => {
      toast.success("Droits enregistrés");
      queryClient.setQueryData(qk.users.rights(userId), updated);
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    },
  });

  const togglePerm = (key: PermKey, value: boolean) => {
    setDraft((d) => ({ ...d, permissions: { ...d.permissions, [key]: value } }));
  };

  if (isLoading || !serverRights) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const dirty = !rightsEqual(serverRights, draft);

  return (
    <div className="space-y-5 py-2">
      {/* Top-level flags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Statut du compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rights-admin" className="text-sm font-medium cursor-pointer">
                Administrateur
              </Label>
              <p className="text-xs text-muted-foreground">
                Accède à toutes les fonctionnalités, indépendamment des permissions.
              </p>
            </div>
            <Switch
              id="rights-admin"
              checked={draft.admin}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, admin: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rights-login" className="text-sm font-medium cursor-pointer">
                Connexion activée
              </Label>
              <p className="text-xs text-muted-foreground">
                Autorise le membre à se connecter au back-office.
              </p>
            </div>
            <Switch
              id="rights-login"
              checked={draft.login_enabled}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, login_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Permissions groups */}
      {PERMISSION_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <Label htmlFor={`perm-${item.key}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
                <Switch
                  id={`perm-${item.key}`}
                  checked={draft.permissions[item.key]}
                  onCheckedChange={(v) => togglePerm(item.key, v)}
                  disabled={draft.admin}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {draft.admin && (
        <p className="text-xs text-muted-foreground italic">
          Les permissions sont désactivées car le membre est administrateur (accès total).
        </p>
      )}

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={() => mutation.mutate(draft)}
          disabled={!dirty || mutation.isPending}
        >
          {mutation.isPending ? (
            "Enregistrement…"
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les droits
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
