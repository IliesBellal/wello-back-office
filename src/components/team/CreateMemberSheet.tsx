import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Link2, AlertCircle, UserPlus } from "lucide-react";

import { usersApi, planningPositionsApi, planningRefsApi, rolesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import type { LinkableUser, CreateUserRequest } from "@/types/adminUsers";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create/link so the parent can refresh the list. */
  onSuccess?: () => void;
}

const SENTINEL_NONE = "__none__";

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateMemberSheet({ open, onOpenChange, onSuccess }: CreateMemberSheetProps) {
  const [mode, setMode] = useState<"create" | "link">("create");

  // Reset to create tab when the sheet opens
  useEffect(() => {
    if (open) setMode("create");
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl !p-0 overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-border bg-background px-6 pt-6 pb-4">
          <SheetHeader>
            <SheetTitle>Ajouter un membre</SheetTitle>
            <SheetDescription>
              Créez un nouveau compte ou liez un utilisateur existant à cet établissement.
            </SheetDescription>
          </SheetHeader>
        </div>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "create" | "link")}
          className="flex min-h-0 flex-1 flex-col px-6 pb-6"
        >
          <TabsList className="mt-4 grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="create">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau membre
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="h-4 w-4 mr-2" />
              Lier un existant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4 flex-1 min-h-0 overflow-y-auto">
            <CreateForm
              onSuccess={() => {
                onSuccess?.();
                onOpenChange(false);
              }}
            />
          </TabsContent>

          <TabsContent value="link" className="mt-4 flex-1 min-h-0 overflow-y-auto">
            <LinkForm
              onSuccess={() => {
                onSuccess?.();
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [positionId, setPositionId] = useState("");
  const [hrRole, setHrRole] = useState("");
  const [contractTypeCode, setContractTypeCode] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleIdTouched, setRoleIdTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: positions = [] } = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
  });

  const { data: contractTypes = [] } = useQuery({
    queryKey: qk.planningRefs.contractTypes,
    queryFn: () => planningRefsApi.contractTypes(),
  });

  // Same query (and cache key) AccessTab.tsx uses for its own role picker.
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: qk.roles.list(),
    queryFn: rolesApi.list,
  });

  // Default to the merchant's default role, but only until the admin picks
  // one explicitly — a role list refresh must not silently override a
  // manual choice.
  useEffect(() => {
    if (roleIdTouched || roleId) return;
    const defaultRole = roles.find((r) => r.is_default);
    if (defaultRole) setRoleId(defaultRole.id);
  }, [roles, roleId, roleIdTouched]);

  const mutation = useMutation({
    mutationFn: (payload: CreateUserRequest) => usersApi.create(payload),
    onSuccess: () => {
      toast.success("Membre créé");
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      onSuccess();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création";
      setError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Prénom, nom et email sont obligatoires.");
      return;
    }

    const payload: CreateUserRequest = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      tel: tel.trim() || undefined,
      password: password ? password : undefined,
      rights: {
        admin,
        login_enabled: loginEnabled,
      },
      role_id: roleId || undefined,
      planning: {
        ...(positionId ? { position_id: positionId } : {}),
        ...(hrRole ? { role: hrRole } : {}),
        ...(contractTypeCode ? { contract_type_code: contractTypeCode } : {}),
      },
    };

    mutation.mutate(payload);
  };

  return (
    <div className="space-y-5 py-2">
      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-fn" className="text-xs">Prénom *</Label>
            <Input
              id="create-fn"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-ln" className="text-xs">Nom *</Label>
            <Input
              id="create-ln"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="create-email" className="text-xs">Email *</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="create-tel" className="text-xs">Téléphone</Label>
            <Input
              id="create-tel"
              type="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="create-pw" className="text-xs">
              Mot de passe (laisser vide pour générer automatiquement)
            </Label>
            <Input
              id="create-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Accès</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="create-role" className="text-xs">Rôle</Label>
            <Select
              value={roleId || undefined}
              onValueChange={(v) => {
                setRoleId(v);
                setRoleIdTouched(true);
              }}
              disabled={isLoadingRoles}
            >
              <SelectTrigger id="create-role">
                <SelectValue placeholder="Sélectionner un rôle…" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.is_default ? " (défaut)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="create-admin" className="text-sm cursor-pointer">
              Administrateur
            </Label>
            <Switch id="create-admin" checked={admin} onCheckedChange={setAdmin} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="create-login" className="text-sm cursor-pointer">
              Connexion activée
            </Label>
            <Switch id="create-login" checked={loginEnabled} onCheckedChange={setLoginEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Planning (optional) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Planning (optionnel)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Poste</Label>
            <Select
              value={positionId || SENTINEL_NONE}
              onValueChange={(v) => setPositionId(v === SENTINEL_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_NONE}>— Aucun —</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Poste RH</Label>
            <Select
              value={hrRole || SENTINEL_NONE}
              onValueChange={(v) => setHrRole(v === SENTINEL_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_NONE}>— Non défini —</SelectItem>
                <SelectItem value="employee">Employé</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Type de contrat</Label>
            <Select
              value={contractTypeCode || SENTINEL_NONE}
              onValueChange={(v) => setContractTypeCode(v === SENTINEL_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_NONE}>— Aucun —</SelectItem>
                {contractTypes.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Création…" : "Créer le membre"}
        </Button>
      </div>
    </div>
  );
}

// ─── Link form (linkable-search → merchant-link) ──────────────────────────────

function LinkForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: qk.users.linkableSearch(debounced),
    queryFn: () => usersApi.linkableSearch(debounced),
    enabled: debounced.length >= 2,
  });

  const handleLink = async (user: LinkableUser) => {
    setLinking(user.user_id);
    try {
      await usersApi.merchantLink(user.user_id, {
        rights: {
          admin: false,
          login_enabled: true,
          permissions: {
            access_reception: false,
            print_merchant_cash_report: false,
            open_cash_drawer: false,
            manage_menu: false,
            manage_plannings: false,
            manage_users: false,
            manage_settings: false,
            manage_haccp: false,
            view_reports: false,
            view_financials: false,
            manage_customers: false,
          },
        },
      });
      toast.success(`${user.first_name} ${user.last_name} a été lié à l'établissement`);
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du liage");
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="link-search" className="text-sm">
          Rechercher un utilisateur existant
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="link-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, nom ou téléphone…"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Au moins 2 caractères. L'utilisateur sera ajouté à cet établissement avec des droits
          minimaux ; ajustez-les ensuite depuis l'onglet « Droits ».
        </p>
      </div>

      {debounced.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Tapez pour rechercher.
        </p>
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground text-center py-6">Recherche…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucun utilisateur trouvé.
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((u) => (
            <Card key={u.user_id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLink(u)}
                  disabled={linking === u.user_id}
                >
                  {linking === u.user_id ? "Liaison…" : "Lier"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
