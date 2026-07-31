import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Phone } from "lucide-react";

import type { MerchantUserListItem, MerchantUserStatus } from "@/types/adminUsers";
import { usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { usePermissions } from "@/hooks/usePermissions";

import { GeneralTab } from "./tabs/GeneralTab";
import { RightsTab } from "./tabs/RightsTab";
import { ContractTab } from "./tabs/ContractTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { SecurityTab } from "./tabs/SecurityTab";

// ─── Status helpers ────────────────────────────────────────────────────────────

const statusConfig: Record<MerchantUserStatus, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-100 text-green-800 border-green-200" },
  login_disabled: { label: "Connexion désactivée", className: "bg-orange-100 text-orange-800 border-orange-200" },
  disabled: { label: "Désactivé", className: "bg-red-100 text-red-800 border-red-200" },
};

function StatusBadge({ status }: { status: MerchantUserStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.disabled;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function memberInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface MemberSheetProps {
  /** Row data from the list — used to pre-populate the header immediately */
  member: MerchantUserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful rights/identity update so the parent can refresh */
  onUpdated?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MemberSheet({ member, open, onOpenChange, onUpdated }: MemberSheetProps) {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState("general");

  // Optimistic toggle for login_enabled (header switch)
  const [loginEnabled, setLoginEnabled] = useState(false);

  // Reset tab and seed the toggle each time the sheet opens for a new member
  useEffect(() => {
    if (!open || !member) return;
    setActiveTab("general");
    setLoginEnabled(member.login_enabled);
  }, [open, member]);

  // ── Load full detail for header (status / admin badge / phone) ─────────────
  const { data: detail } = useQuery({
    queryKey: member ? qk.users.detail(member.user_id) : (["users", "detail", "none"] as const),
    queryFn: () => usersApi.get(member!.user_id),
    enabled: !!member && open,
  });

  // Keep the toggle in sync with the loaded detail
  useEffect(() => {
    if (detail) setLoginEnabled(detail.login_enabled);
  }, [detail]);

  // ── Toggle login_enabled (preserves all permissions) ───────────────────────
  const toggleLoginMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      if (!member) throw new Error("Aucun membre sélectionné");
      const currentRights = await usersApi.getRights(member.user_id);
      return usersApi.updateRights(member.user_id, {
        ...currentRights,
        login_enabled: checked,
      });
    },
    onMutate: (checked) => {
      setLoginEnabled(checked); // optimistic
    },
    onSuccess: (_data, checked) => {
      toast.success(checked ? "Connexion activée" : "Connexion désactivée");
      if (!member) return;
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      queryClient.invalidateQueries({ queryKey: qk.users.detail(member.user_id) });
      queryClient.invalidateQueries({ queryKey: qk.users.rights(member.user_id) });
      onUpdated?.();
    },
    onError: (err, checked) => {
      setLoginEnabled(!checked); // revert
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    },
  });

  // Derive display values (prefer loaded detail, fall back to list row)
  const firstName = detail?.first_name ?? member?.first_name ?? "";
  const lastName = detail?.last_name ?? member?.last_name ?? "";
  const tel = detail?.tel ?? member?.tel ?? "";
  const status = detail?.status ?? member?.status ?? "disabled";
  const isMemberAdmin = detail?.admin ?? member?.admin ?? false;
  const initials = memberInitials(firstName, lastName);
  const userId = member?.user_id ?? null;
  const employeeId = detail?.employee_id ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl !p-0 overflow-hidden flex flex-col">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-border bg-background px-6 pt-6 pb-4">
          <SheetHeader className="pb-0 pr-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-xl leading-none">
                    {firstName} {lastName}
                  </SheetTitle>
                  {isMemberAdmin && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  <StatusBadge status={status} />
                </div>
                {tel && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {tel}
                  </p>
                )}
              </div>
            </div>

            {/* Header toggle: Activé / Désactivé */}
            <div className="flex items-center gap-3 mt-4">
              <Switch
                id="login-enabled"
                checked={loginEnabled}
                onCheckedChange={(v) => toggleLoginMutation.mutate(v)}
                disabled={toggleLoginMutation.isPending}
              />
              <Label htmlFor="login-enabled" className="text-sm font-medium cursor-pointer">
                {loginEnabled ? "Connexion activée" : "Connexion désactivée"}
              </Label>
            </div>
          </SheetHeader>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        {userId && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col px-6 pb-6"
          >
            <TabsList className={`mt-4 shrink-0 grid w-full ${isAdmin ? "grid-cols-5" : "grid-cols-4"}`}>
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="rights">Droits</TabsTrigger>
              <TabsTrigger value="contract">Contrat</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              {isAdmin && <TabsTrigger value="security">Sécurité</TabsTrigger>}
            </TabsList>

            <TabsContent value="general" className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <GeneralTab userId={userId} />
            </TabsContent>

            <TabsContent value="rights" className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <RightsTab userId={userId} />
            </TabsContent>

            <TabsContent value="contract" className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <ContractTab userId={userId} employeeId={employeeId} isActive={activeTab === "contract"} />
            </TabsContent>

            <TabsContent value="documents" className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <DocumentsTab employeeId={employeeId} onGoToContract={() => setActiveTab("contract")} />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="security" className="mt-4 flex-1 min-h-0 overflow-y-auto">
                <SecurityTab
                  userId={userId}
                  onUnlinked={() => {
                    onUpdated?.();
                    onOpenChange(false);
                  }}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
