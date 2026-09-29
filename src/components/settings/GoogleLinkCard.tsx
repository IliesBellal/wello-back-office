import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleLogo } from "@/components/auth/AuthProviderButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { toast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { isApiHttpError } from "@/services/apiClient";
import { authService, type GoogleLinkStatus } from "@/services/authService";

/** French copy for /v1/auth/google/link's error codes. */
const LINK_ERROR_MESSAGES: Record<string, string> = {
  google_account_linked_elsewhere: "Ce compte Google est déjà associé à un autre compte Wello Resto.",
  google_already_linked: "Un autre compte Google est déjà associé. Dissociez-le d'abord.",
  google_unlink_requires_password:
    "Google est votre seul moyen de connexion : définissez d'abord un mot de passe.",
  google_email_not_verified: "L'adresse e-mail de ce compte Google n'est pas vérifiée.",
  invalid_google_token: "La réponse de Google n'a pas pu être vérifiée. Réessayez.",
};

const errorDescription = (error: unknown): string => {
  const body = isApiHttpError(error) ? (error.responseBody as { status?: unknown } | undefined) : undefined;
  const code = typeof body?.status === "string" ? body.status : undefined;
  return (code && LINK_ERROR_MESSAGES[code]) || "Une erreur est survenue. Réessayez dans un instant.";
};

/**
 * Carte "Connexion avec Google" de l'onglet Profil : associe le compte Google
 * choisi au compte connecté (POST /v1/auth/google/link), ou le dissocie.
 * C'est le chemin que la page de login indique à un compte à mot de passe
 * que /v1/auth/google refuse de rattacher automatiquement.
 */
export const GoogleLinkCard = () => {
  const queryClient = useQueryClient();
  const { data: status, isLoading, isError } = useQuery({
    queryKey: qk.googleLink.all,
    queryFn: authService.getGoogleLink,
  });

  const storeStatus = (data: GoogleLinkStatus) => {
    queryClient.setQueryData(qk.googleLink.all, data);
  };

  const link = useMutation({
    mutationFn: authService.linkGoogle,
    onSuccess: (data) => {
      storeStatus(data);
      toast({ title: "Compte Google associé", description: "Vous pouvez maintenant vous connecter avec Google." });
    },
    onError: (error) =>
      toast({ title: "Association impossible", description: errorDescription(error), variant: "destructive" }),
  });

  const unlink = useMutation({
    mutationFn: authService.unlinkGoogle,
    onSuccess: (data) => {
      storeStatus(data);
      toast({ title: "Compte Google dissocié", description: "Connectez-vous désormais avec votre e-mail et mot de passe." });
    },
    onError: (error) =>
      toast({ title: "Dissociation impossible", description: errorDescription(error), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GoogleLogo />
          Connexion avec Google
        </CardTitle>
        <CardDescription>Connectez-vous en un clic avec votre compte Google.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : isError || !status ? (
          <p className="text-sm text-muted-foreground">Impossible de charger l'état de la connexion Google.</p>
        ) : status.linked ? (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Check className="h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Compte Google associé</p>
                <p className="text-xs text-muted-foreground">
                  {status.can_unlink
                    ? "Vous pouvez vous connecter avec Google ou avec votre mot de passe."
                    : "Google est votre seul moyen de connexion : définissez un mot de passe pour pouvoir le dissocier."}
                </p>
              </div>
            </div>
            {status.can_unlink && (
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                disabled={unlink.isPending}
                onClick={() => unlink.mutate()}
              >
                {unlink.isPending ? "Dissociation..." : "Dissocier"}
              </Button>
            )}
          </div>
        ) : (
          <GoogleSignInButton onCredential={(idToken) => link.mutate(idToken)} disabled={link.isPending} />
        )}
      </CardContent>
    </Card>
  );
};
