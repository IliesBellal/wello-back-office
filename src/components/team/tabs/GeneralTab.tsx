import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Save } from "lucide-react";

import { usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import type { MerchantUserDetail } from "@/types/adminUsers";

interface GeneralTabProps {
  userId: string;
}

function formatDate(raw: string | null | undefined, withTime = false): string {
  if (!raw) return "—";
  try {
    return format(parseISO(raw), withTime ? "d MMM yyyy 'à' HH:mm" : "d MMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

export function GeneralTab({ userId }: GeneralTabProps) {
  const queryClient = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: qk.users.detail(userId),
    queryFn: () => usersApi.get(userId),
  });

  // Only `job_title` is editable here (passes through PATCH /users/{id}/member).
  const [jobTitle, setJobTitle] = useState<string>("");

  useEffect(() => {
    setJobTitle(detail?.planning?.job_title ?? "");
  }, [detail]);

  const mutation = useMutation({
    mutationFn: (payload: { job_title: string | null }) => usersApi.updateMember(userId, payload),
    onSuccess: (updated: MerchantUserDetail) => {
      toast.success("Identité mise à jour");
      queryClient.setQueryData(qk.users.detail(userId), updated);
      queryClient.invalidateQueries({ queryKey: qk.users.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    },
  });

  if (isLoading || !detail) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const hasJobTitleChange = (detail.planning?.job_title ?? "") !== jobTitle;

  return (
    <div className="space-y-6 py-2">

      {/* Read-only identity grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Prénom</Label>
          <Input value={detail.first_name} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nom</Label>
          <Input value={detail.last_name} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input value={detail.email} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Téléphone</Label>
          <Input value={detail.tel} readOnly className="bg-muted/50" />
        </div>
      </div>

      {/* Editable job_title */}
      <div className="space-y-1.5">
        <Label htmlFor="job_title" className="text-sm">
          Poste affiché
        </Label>
        <Input
          id="job_title"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Ex : Serveur, Chef de rang…"
        />
        <p className="text-xs text-muted-foreground">
          Libellé court affiché sur les écrans planning/POS.
        </p>
      </div>

      {/* Read-only meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">Créé le</p>
          <p className="text-sm font-medium">{formatDate(detail.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Dernière connexion</p>
          <p className="text-sm font-medium">{formatDate(detail.last_login_at, true)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Statut calculé</p>
          <p className="text-sm font-medium">
            {detail.status === "active" && "Actif"}
            {detail.status === "login_disabled" && "Connexion désactivée"}
            {detail.status === "disabled" && "Désactivé"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Fiche employé</p>
          <p className="text-sm font-medium">{detail.employee_name ?? "—"}</p>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={() => mutation.mutate({ job_title: jobTitle.trim() ? jobTitle.trim() : null })}
          disabled={!hasJobTitleChange || mutation.isPending}
        >
          {mutation.isPending ? (
            "Enregistrement…"
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
