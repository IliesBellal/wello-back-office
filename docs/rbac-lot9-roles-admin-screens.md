# RBAC lot 9 — écrans d'administration des rôles

Date : 2026-08-27 · Branche : `staging`

## 1. Livrables

```
src/types/roles.ts                                nouveau — PermissionKey, Role/RoleEntry/RoleDetail, etc.
src/lib/permissions.ts                             nouveau — checkPermission(authData, key), partagé hook + nav
src/lib/roleDiff.ts                                nouveau — diffPermissions(before, after)
src/lib/queryKeys.ts                               + qk.roles, qk.permissionsCatalog, qk.myPermissions
src/services/welloApi.ts                           + rolesApi.*, usersApi.updateRole
src/services/apiClient.ts                          + suppressErrorToast, ROLE_DIALOG_CODES, ROLE_ERROR_MESSAGES,
                                                      export unwrapErrorData, fix : errorCode/responseBody non
                                                      dé-enveloppés (voir §3)
src/hooks/usePermissions.ts                        réécrit — synchrone, lit authData.permissions (nouveau champ)
src/hooks/useArchiveRoleFlow.ts                    nouveau
src/hooks/useRoleVersionConflict.ts                nouveau
src/contexts/AuthContext.tsx                       + revalidation GET /me/permissions en arrière-plan (une seule
                                                      instance, pas dans usePermissions)
src/components/team/roles/*                        nouveau — RolesTable, RoleEditorSheet, PermissionsEditor,
                                                      SaveDiffDialog, VersionConflictDialog, RoleHasMembersDialog
src/components/team/tabs/AccessTab.tsx             remplace RightsTab.tsx (supprimé)
src/components/team/MemberSheet.tsx                onglet "Accès" (+ prop initialTab pour le deep-link E1→E3)
src/components/shared/EmptyPermissionsNotice.tsx   nouveau
src/pages/equipe/RolesPage.tsx                     nouveau — E1
src/pages/equipe/EquipePage.tsx                    + deep-link ?openMember=&tab=access
src/pages/settings/MyPermissionsPage.tsx           nouveau — E5
src/pages/Index.tsx + services/dashboardService.ts masquage tuile dashboard sur 403 (§6)
src/pages/haccp/Settings.tsx                       self-gate direct-URL (§6)
src/config/navConfig.ts                            visibilityCheck par item/section (voir §4)
src/types/adminUsers.ts                            + role_id/role sur MerchantUserDetail
```

Côté API (`ib-welloresto-api`, commit `55c4b9d`, poussé et déployé sur staging) :
- `permissions: string[]` sur la réponse de login (sibling de `access`).
- `UserLoginRow.HasAdminRole()` — corrige `access.admin`/`is_admin` qui lisaient la colonne historique au lieu du rôle.
- `role_id`/`role` sur `GET /users/{id}`.
- Commit englobe aussi tout le travail RBAC lots 1-8, jamais committé jusqu'ici (voir `docs/decisions.md`, entrée du 2026-08-27 "RBAC lot 9").

## 2. Décisions prises en cours de route

- **§1 du brief était faux** : le login n'émettait pas les clés à points. Corrigé côté API plutôt que côté front (voir décision détaillée dans `ib-welloresto-api/docs/decisions.md`).
- **`usePermissions` reste synchrone** : la revalidation contre `GET /me/permissions` vit dans `AuthContext` (une seule instance), pas dans le hook (monté par ~10 composants).
- **Duplication de rôle** : le brouillon de droits copiés est modifiable avant la création ; si le résultat diffère de la copie serveur, un second appel `PUT .../permissions` s'enchaîne avec la version retournée par le `POST` (jamais celle de la page).
- **Diff de sauvegarde** : montré pour édition et duplication, sauté en création pure (rien à comparer).
- **Confirmation "droit sensible"** : indépendante du diff de sauvegarde, se déclenche à l'octroi.

## 3. Deux bugs trouvés et corrigés pendant la validation E2E (pas en revue de code)

1. **Bouton "Confirmer" du diff jamais cliquable** : `setIsSaving(true)` était posé avant l'attente de la confirmation utilisateur (`await confirmSaveDiff(...)`), désactivant le bouton du dialogue pendant toute son ouverture. Corrigé : `isSaving` n'est posé qu'après confirmation, juste avant les appels réseau (`RoleEditorSheet.tsx`).
2. **Dialogue "rôle encore porté" jamais affiché, crash silencieux à la place** : les réponses d'erreur du module roles sont enveloppées `{id, data: {status, holder_count, ...}}`, mais `apiClient.ts` lisait `errorData.status`/`errorCode` au niveau racine (jamais nested), et `error.responseBody` stockait le corps brut non dé-enveloppé — `useArchiveRoleFlow`/`useRoleVersionConflict` cherchaient donc `status`/`holder_count` au mauvais niveau, l'erreur n'était jamais reconnue comme "notre cas spécial" et remontait comme exception non gérée. Corrigé en centralisant le dé-enveloppement (`unwrapErrorData`, déjà présent mais seulement utilisé pour le flux MFA) sur `errorCode` **et** `responseBody` dans `request()`/`requestWithCustomToken()` — corrige aussi un bug latent équivalent dans `useDuplicateNameConfirm.ts` (préexistant, non touché autrement).

Les deux ont été trouvés en pilotant l'app réelle (Playwright + Chrome local) contre staging, pas en lisant le code.

## 4. Correction post-livraison : visibilité du menu

Le principe initial ("un seul sous-item HACCP masqué") était insuffisant — signalé après coup. Règle appliquée partout : chaque item de nav (parent ou enfant) porte le `visibilityCheck` correspondant à son droit RBAC réel ; `getVisibleNavItems` masque déjà un parent dès que 0 enfant reste visible (mécanisme préexistant, non modifié) — il suffisait de armer les `visibilityCheck` manquants :
- Équipe : chaque enfant → son droit propre (`staff.manage`, `staff.schedule.manage`, ou l'OR des deux pour Paramètres) ; le parent disparaît si aucun.
- HACCP : Activité **et** Réglages → `haccp.manage` (masquage front uniquement — `POST/GET /haccp/traceability` restent libres côté API, voir `docs/decisions.md`).
- Menu, Clients → `catalog.manage`/`customers.manage` sur le parent. Stocks → `inventory.manage`. Comptabilité → `reports.financial.read` OU `reports.sales.read`. Établissement/Imprimantes → `settings.manage`.
- Non touchés : Kiosk, Intégrations, Réservations (capacités marchand, pas des droits du catalogue RBAC) ; Mon Profil / Mes droits (toujours visibles, personnels).

## 5. Scénario de recette exécuté (staging réel, merchant 2 "Brasserie du midi")

Compte admin : `iliesbellal@gmail.com` (login mot de passe cassé pour ce compte multi-établissement — bug préexistant sans rapport, contourné via le token du merchant 2 directement ; utilisé `christophe@welloresto.fr`, déjà `system_key=admin` sur ce merchant, pour le pilotage navigateur). Utilisateur de test dédié créé (`test.rbac.lot9@welloresto-test.fr`), nettoyé en fin de session (réaffecté au rôle "Employé polyvalent", connexion désactivée). Rôle "Serveur" de test archivé.

| # | Étape | Résultat observé |
|---|---|---|
| 1 | Créer un rôle sans droit | OK (curl + UI) |
| 2 | Ajouter un droit sensible | Confirmation dédiée affichée, distincte du diff de sauvegarde (bug #1 ci-dessus trouvé et corrigé ici) |
| 3 | Assigner à l'utilisateur de test | OK |
| 4 | Menus masqués pour ce compte | Confirmé (Équipe + HACCP absents du menu, tuile dashboard masquée) |
| 5 | curl direct sur route gardée sans le droit | 403 `access_denied` |
| 6a | Invalidation Redis à l'octroi, sans reconnexion | 200 immédiat |
| 6b | Invalidation Redis au retrait, sans reconnexion | 403 immédiat |
| 6c | Masquage menu (front) | Non re-testé en live après un octroi/retrait à chaud — dépend du prochain focus/remount (`refetchOnWindowFocus`/`refetchOnMount`), mécanisme distinct de 6a/6b, non chronométré séparément |
| 7 | Archiver un rôle porté | 409 `role_has_members`, dialogue avec porteur + lien "Voir" (bug #2 ci-dessus trouvé et corrigé ici) |
| 8 | Conflit de version deux "onglets" | Vérifié côté API (curl : 409 `version_conflict` + `current_version`) ; non rejoué dans deux onglets navigateur réels |

Non exécuté par manque de temps, à faire si besoin : le dialogue de conflit de version en conditions réelles (deux onglets), le flux de duplication de bout en bout dans le navigateur.
