import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";

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
  const { data: detail, isLoading } = useQuery({
    queryKey: qk.users.detail(userId),
    queryFn: () => usersApi.get(userId),
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

  return (
    <div className="space-y-5 py-2">

      {/* Read-only identity grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      {/* Read-only meta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
