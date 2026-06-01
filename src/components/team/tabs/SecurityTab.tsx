import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { KeyRound, Unlink, AlertCircle } from "lucide-react";

import { usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SecurityTabProps {
  userId: string;
  /** Called after a successful unlink so the parent sheet can close. */
  onUnlinked?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SecurityTab({ userId, onUnlinked }: SecurityTabProps) {
  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: (password: string) => usersApi.forceResetPassword(userId, { new_password: password }),
    onSuccess: () => {
      toast.success("Mot de passe réinitialisé");
      setResetOpen(false);
      setNewPassword("");
      setResetError(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Erreur lors de la réinitialisation";
      setResetError(msg);
      toast.error(msg);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => usersApi.deleteMerchantLink(userId),
    onSuccess: (result) => {
      toast.success(
        `Membre délié (${result.employee_links_cleared} fiche${
          result.employee_links_cleared !== 1 ? "s" : ""
        } employé(s) découplée(s))`,
      );
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
      onUnlinked?.();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors du déliage");
    },
  });

  const handleResetSubmit = () => {
    if (newPassword.length < 8) {
      setResetError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setResetError(null);
    resetMutation.mutate(newPassword);
  };

  return (
    <div className="space-y-4 py-2">
      {/* Reset password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Mot de passe
          </CardTitle>
          <CardDescription className="text-xs">
            Définit un nouveau mot de passe pour ce membre. Il devra l'utiliser pour sa prochaine connexion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            Réinitialiser le mot de passe
          </Button>
        </CardContent>
      </Card>

      {/* Unlink from merchant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Unlink className="h-4 w-4 text-destructive" />
            Délier du merchant
          </CardTitle>
          <CardDescription className="text-xs">
            Retire le membre de cet établissement. Son compte utilisateur reste actif mais perd
            tous ses droits ici. La fiche planning éventuelle reste, seul le lien
            <code className="px-1">employees.user_id</code> est effacé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setUnlinkOpen(true)}>
            Délier du merchant
          </Button>
        </CardContent>
      </Card>

      {/* Reset password dialog */}
      <Dialog
        open={resetOpen}
        onOpenChange={(v) => {
          setResetOpen(v);
          if (!v) {
            setNewPassword("");
            setResetError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Saisissez le nouveau mot de passe. Il sera communiqué manuellement au membre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs">
                Nouveau mot de passe
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                autoComplete="new-password"
              />
            </div>

            {resetError && (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{resetError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              disabled={resetMutation.isPending}
            >
              Annuler
            </Button>
            <Button onClick={handleResetSubmit} disabled={resetMutation.isPending}>
              {resetMutation.isPending ? "Mise à jour…" : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink confirmation */}
      <ConfirmDialog
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
        title="Délier ce membre du merchant ?"
        description="Le membre perdra l'accès à cet établissement."
        confirmText="Délier"
        cancelText="Annuler"
        isDangerous
        isLoading={unlinkMutation.isPending}
        onConfirm={() => unlinkMutation.mutateAsync()}
      />
    </div>
  );
}
