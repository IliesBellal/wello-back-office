import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer, EmptyPermissionsNotice } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, ShieldCheck, Fingerprint } from "lucide-react";

import { rolesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";

/**
 * E5 — "Mes droits": the caller's own effective permissions and the role
 * that carries them. The support diagnostic page: whoever answers "je n'ai
 * pas accès à X" opens this first. Visible to every authenticated user, no
 * permission gate — everyone can see their own rights.
 */
export default function MyPermissionsPage() {
  const { authData } = useAuth();

  const { data: myPermissions, isLoading: isLoadingMine } = useQuery({
    queryKey: authData ? qk.myPermissions(authData.user.id, authData.merchant.id) : (["me", "permissions", "none"] as const),
    queryFn: rolesApi.getMyPermissions,
    enabled: !!authData,
  });

  const { data: catalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: qk.permissionsCatalog,
    queryFn: rolesApi.getCatalog,
    staleTime: 30 * 60 * 1000,
  });

  const isLoading = isLoadingMine || isLoadingCatalog;
  const granted = new Set(myPermissions?.permissions ?? []);

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Fingerprint className="h-6 w-6" />
              Mes droits
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ce à quoi votre compte a accès sur cet établissement
            </p>
          </div>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-5 max-w-2xl">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rôle</CardTitle>
              </CardHeader>
              <CardContent>
                {myPermissions?.role ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{myPermissions.role.name}</span>
                    {myPermissions.role.system_key && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
                        Système
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun rôle attribué.</p>
                )}
              </CardContent>
            </Card>

            {myPermissions?.is_admin ? (
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-6 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-900">
                    Vous êtes administrateur : accès à toutes les fonctionnalités, indépendamment des droits listés
                    ci-dessous.
                  </p>
                </CardContent>
              </Card>
            ) : granted.size === 0 ? (
              <EmptyPermissionsNotice />
            ) : (
              catalog?.map((group) => (
                <Card key={group.domain}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm capitalize">{group.domain}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.permissions.map((permission) => {
                      const has = granted.has(permission.key);
                      return (
                        <div key={permission.key} className="flex items-center gap-2 text-sm">
                          {has ? (
                            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          )}
                          <span className={has ? "" : "text-muted-foreground"}>{permission.label}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
