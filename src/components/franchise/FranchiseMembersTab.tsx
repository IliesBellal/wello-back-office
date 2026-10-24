import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import { franchiseRoleLabels, type FranchiseDetail, type FranchiseMember, type FranchiseRole } from "@/types/franchise";

interface FranchiseMembersTabProps {
  detail: FranchiseDetail;
  /** L'utilisateur vient de quitter la franchise. */
  onLeft: () => void;
}

const roleDescriptions: Record<FranchiseRole, string> = {
  owner: "Tout, dont les gestionnaires et la suppression de la franchise.",
  manager: "Établissements et apparence du hub.",
};

const fullName = (m: FranchiseMember) => [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || m.user_id;

/**
 * Onglet Gestionnaires. Un propriétaire ajoute, change le rôle et retire ;
 * un gestionnaire voit la liste et peut quitter la franchise.
 */
export function FranchiseMembersTab({ detail, onLeft }: FranchiseMembersTabProps) {
  const { toast } = useToast();
  const { authData } = useAuth();
  const queryClient = useQueryClient();
  const franchiseId = detail.franchise.franchise_id;
  const isOwner = detail.role === "owner";
  const currentUserId = authData?.user.id;

  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FranchiseRole>("manager");
  const [toRemove, setToRemove] = useState<FranchiseMember | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: qk.franchises.members(franchiseId),
    queryFn: () => franchisesService.members(franchiseId),
  });

  const setMembers = (next: FranchiseMember[]) => queryClient.setQueryData(qk.franchises.members(franchiseId), next);
  const onError = (fallback: string) => (error: unknown) =>
    toast({ title: "Erreur", description: franchiseErrorMessage(error, fallback), variant: "destructive" });

  const addMutation = useMutation({
    mutationFn: () => franchisesService.addMember(franchiseId, email.trim(), role),
    onSuccess: (next) => {
      setMembers(next);
      toast({ title: "Gestionnaire ajouté" });
      setAddOpen(false);
      setEmail("");
      setRole("manager");
    },
    onError: onError("Impossible d'ajouter ce gestionnaire."),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: FranchiseRole }) =>
      franchisesService.updateMemberRole(franchiseId, userId, nextRole),
    onSuccess: (next) => {
      setMembers(next);
      toast({ title: "Rôle modifié" });
    },
    onError: onError("Impossible de modifier le rôle."),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => franchisesService.removeMember(franchiseId, userId),
    onSuccess: (next, userId) => {
      setToRemove(null);
      if (userId === currentUserId) {
        queryClient.removeQueries({ queryKey: qk.franchises.detail(franchiseId) });
        queryClient.invalidateQueries({ queryKey: qk.franchises.all });
        toast({ title: "Vous avez quitté la franchise" });
        onLeft();
        return;
      }
      setMembers(next);
      toast({ title: "Gestionnaire retiré" });
    },
    onError: onError("Impossible de retirer ce gestionnaire."),
  });

  const isSelf = (m: FranchiseMember) => m.user_id === currentUserId;
  const canRemove = (m: FranchiseMember) => isOwner || isSelf(m);

  const roleCell = (m: FranchiseMember) =>
    isOwner ? (
      <Select
        value={m.role}
        onValueChange={(value) => roleMutation.mutate({ userId: m.user_id, nextRole: value as FranchiseRole })}
        disabled={roleMutation.isPending}
      >
        <SelectTrigger className="h-8 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="owner">{franchiseRoleLabels.owner}</SelectItem>
          <SelectItem value="manager">{franchiseRoleLabels.manager}</SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <Badge variant={m.role === "owner" ? "default" : "secondary"}>{franchiseRoleLabels[m.role]}</Badge>
    );

  const removeButton = (m: FranchiseMember) =>
    canRemove(m) ? (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setToRemove(m)}
        title={isSelf(m) ? "Quitter la franchise" : "Retirer"}
        aria-label={isSelf(m) ? "Quitter la franchise" : `Retirer ${fullName(m)}`}
      >
        {isSelf(m) ? <LogOut className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    ) : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Gestionnaires</CardTitle>
          <CardDescription>
            {isOwner
              ? "Les personnes qui gèrent cette franchise depuis leur compte WelloResto."
              : "Seul un propriétaire peut ajouter ou retirer des gestionnaires."}
          </CardDescription>
        </div>
        {isOwner && (
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter un gestionnaire
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Depuis le</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">
                        {fullName(m)}
                        {isSelf(m) && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.email}</TableCell>
                      <TableCell>{roleCell(m)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>{removeButton(m)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium truncate">
                      {fullName(m)}
                      {isSelf(m) && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                    {roleCell(m)}
                  </div>
                  {removeButton(m)}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) addMutation.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Ajouter un gestionnaire</DialogTitle>
              <DialogDescription>La personne doit déjà avoir un compte WelloResto.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="member-email">E-mail</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@exemple.fr"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={role} onValueChange={(value) => setRole(value as FranchiseRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">{franchiseRoleLabels.manager}</SelectItem>
                    <SelectItem value="owner">{franchiseRoleLabels.owner}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!email.trim() || addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={toRemove && isSelf(toRemove) ? "Quitter la franchise ?" : "Retirer ce gestionnaire ?"}
        description={
          toRemove && isSelf(toRemove)
            ? "Vous ne pourrez plus gérer cette franchise, sauf si un propriétaire vous ajoute à nouveau."
            : `${toRemove ? fullName(toRemove) : ""} ne pourra plus gérer cette franchise.`
        }
        confirmText={toRemove && isSelf(toRemove) ? "Quitter" : "Retirer"}
        isDangerous
        isLoading={removeMutation.isPending}
        onConfirm={() => toRemove && removeMutation.mutate(toRemove.user_id)}
      />
    </Card>
  );
}
