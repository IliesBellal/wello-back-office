# Droits d'accès — état réel avant branchement des endpoints analytiques

> **Portée** : réponse ciblée aux deux décisions de conception qui bloquent le branchement de la page « Analyse » (portée des données, permission à poser sur les routes). Ce n'est pas un audit général du RBAC.
>
> **Corrige** [`AUDIT.md`](AUDIT.md) — dont le §4 (« 18 prédicats `middleware.RequirePermission` ») et le blocage n°3 / M12 (« un utilisateur = un seul établissement, `users.merchant_id` scalaire ») décrivent un état **périmé**. La couche RBAC a été livrée en 10 lots entre le 2026-08-27 et le 2026-08-28.
>
> **Sources** : dépôt `ib-welloresto-api` (code + `migrations/`), base **staging** `welloresto_staging` (Postgres 18.4, Render Frankfurt), interrogée en lecture seule le 2026-09-03. Aucune écriture, aucune migration, aucune modification de code.

---

## 1. Le modèle

### 1.1 Tables portant les droits

Quatre objets, tous créés par [`migrations/todo/094_roles_schema.up.sql`](../../../ib-welloresto-api/migrations/todo/094_roles_schema.up.sql) (appliquée sur staging sous son ancien numéro 089 — **jamais appliquée en production**, cf. §1.6).

#### `permissions` — catalogue fixe des actions attribuables

```sql
CREATE TABLE permissions (
    key           varchar(64) PRIMARY KEY,
    domain        varchar(32) NOT NULL,
    label         varchar(150) NOT NULL,
    description   text NOT NULL DEFAULT '',
    is_sensitive  boolean NOT NULL DEFAULT false,
    sort_order    integer NOT NULL DEFAULT 0,
    deprecated_at timestamptz
);
```

#### `roles` — paquets nommés de permissions, **par établissement**

```sql
CREATE TABLE roles (
    id          varchar(64) PRIMARY KEY,   -- 'role-<uuid>', généré côté Go (helpers.GeneratePrefixedID)
    merchant_id varchar(64) NOT NULL,      -- pas de FK vers merchant(id) : merchant.id est integer
    name        varchar(150) NOT NULL,
    description text NOT NULL DEFAULT '',
    system_key  varchar(16),               -- 'admin' | 'staff' | NULL (rôle custom)
    version     integer NOT NULL DEFAULT 1,-- verrou optimiste (PUT /roles/{id}/permissions)
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    CONSTRAINT roles_system_key_check CHECK (system_key IS NULL OR system_key IN ('admin','staff'))
);
```

Index (vérifiés sur staging, `pg_indexes`) :

| Index | Définition | Effet |
|---|---|---|
| `roles_pkey` | UNIQUE (`id`) | — |
| `idx_roles_merchant_name_active` | UNIQUE (`merchant_id`, `lower(name)`) `WHERE archived_at IS NULL` | un nom de rôle actif par établissement |
| `idx_roles_merchant_system_key` | UNIQUE (`merchant_id`, `system_key`) `WHERE system_key IS NOT NULL` | un seul rôle `admin` et un seul `staff` par établissement |
| `idx_roles_merchant_id` | btree (`merchant_id`) | — |

#### `role_permissions` — n-n rôle ↔ permission

```sql
CREATE TABLE role_permissions (
    role_id        varchar(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_key varchar(64) NOT NULL REFERENCES permissions(key),
    PRIMARY KEY (role_id, permission_key)
);
```

#### `users_rights` — le porteur de l'attribution (table historique, étendue)

```sql
ALTER TABLE users_rights ADD COLUMN role_id varchar(64) REFERENCES roles(id);  -- pas d'ON DELETE : RESTRICT
CREATE INDEX idx_users_rights_role_id ON users_rights (role_id);
ALTER TABLE merchant ADD COLUMN default_role_id varchar(64) REFERENCES roles(id);
```

`users_rights` complet (extrait du dump staging, colonnes pertinentes) :

```sql
CREATE TABLE public.users_rights (
    id integer NOT NULL,                       -- PK, GENERATED ALWAYS AS IDENTITY
    user_id character varying(64),             -- nullable (!), pas de FK
    merchant_id character varying(64) NOT NULL,-- pas de FK (merchant.id est integer)
    token character varying(255) NOT NULL,     -- LE token d'API — un par lien
    enabled boolean DEFAULT true NOT NULL,
    login_enabled boolean DEFAULT true NOT NULL,
    pin_hash character varying(64),
    role_id character varying(64),             -- ajouté par 094
    -- colonnes booléennes historiques encore lues en fallback :
    access_wrreception, print_merchant_cash_report, open_cash_drawer, admin,
    manage_menu, manage_plannings, manage_users, manage_settings, manage_haccp,
    view_reports, view_financials, manage_customers,
    -- + ~25 colonnes RH (contrat, salaire, heures…) sans rapport avec les droits
);
```

> ⚠️ **Anomalies de contraintes constatées, à consigner sans corriger** :
> - **Aucune unicité sur `(user_id, merchant_id)`** — rien n'empêche deux liens du même utilisateur vers le même établissement. Constaté sur staging : `user_id = ''` a **deux** lignes vers `merchant_id = 2` (ids 6 et 221).
> - **Aucun index ni unicité sur `users_rights.token`**, alors que `GetUserByToken` fait `WHERE ur.token = ?` à chaque requête authentifiée non cachée. Unicité vraie de fait sur staging (59 tokens distincts / 59 lignes) mais non garantie par le schéma.
> - `users_rights.user_id` est **nullable et sans FK** : 4 lignes staging ont `user_id = ''` (chaîne vide).
> - `users_rights.merchant_id` sans FK : la ligne `id=232` pointe vers `merchant_id = '99999230'`, **qui n'existe pas** dans `merchant`.

### 1.2 Unité d'attribution

**Un rôle.** Pas de permission unitaire attribuable à un utilisateur, pas de masque de bits, pas de liste stockée sur l'utilisateur.

Chaîne exacte : `users_rights.role_id` → `roles.id` → `role_permissions.permission_key` → `permissions.key`.

Le droit est attribué **au lien `users_rights`, c'est-à-dire au couple (user × merchant)** — pas à l'utilisateur. Un même utilisateur peut donc porter le rôle « Administrateur » sur un établissement et « Serveur » sur un autre. C'est la propriété centrale pour la couche analytique (§2).

Le rôle est lui-même **scopé à un établissement** (`roles.merchant_id`) : il n'existe pas de rôle partagé entre établissements. 30 établissements sur staging ⇒ 30 rôles `admin` + 30 rôles `staff` distincts.

### 1.3 Catalogue exhaustif des permissions (18 clés)

Identifiants identiques en base (`permissions.key`) et dans le code ([`internal/permission/keys_gen.go`](../../../ib-welloresto-api/internal/permission/keys_gen.go), type `permission.Key`). Les deux sont tenus synchronisés par `internal/permission/keys_gen_test.go`, qui scanne tous les `migrations/**/*.up.sql` et **casse le build** en cas de divergence.

Vérifié en base staging (`SELECT key, domain, label, is_sensitive, sort_order FROM permissions ORDER BY sort_order`) :

| # | `permissions.key` | Constante Go | Domaine | Sensible | `sort_order` | Ce que ça ouvre (routes réelles, `cmd/api/routes.go`) |
|---|---|---|---|:--:|--:|---|
| 1 | `pos.status.manage` | `POSStatusManage` | pos | ✗ | 15 | `PATCH /pos/status` (ouvrir/fermer l'établissement) |
| 2 | `pos.ticket.reopen` | `POSTicketReopen` | pos | ✔ | 20 | Réouverture d'un ticket clôturé |
| 3 | `pos.refund` | `POSRefund` | pos | ✔ | 40 | Remboursement d'une vente |
| 4 | `pos.cash_drawer.open` | `POSCashDrawerOpen` | pos | ✔ | 50 | Ouverture tiroir-caisse hors encaissement |
| 5 | **`pos.analytics`** | `POSAnalytics` | pos | ✗ | 55 | **`GET /stats/upsell`** — seule ancre ; sert de gate de la page « Analyse » côté front |
| 6 | `catalog.manage` | `CatalogManage` | catalog | ✔ | 60 | Produits, tarifs, cartes |
| 7 | `inventory.manage` | `InventoryManage` | inventory | ✗ | 70 | Stocks et inventaires |
| 8 | `haccp.manage` | `HACCPManage` | haccp | ✗ | 80 | Suivi HACCP |
| 9 | `customers.manage` | `CustomersManage` | customers | ✔ | 90 | Fiches clients (gestion **et export**) |
| 10 | `staff.manage` | `StaffManage` | staff | ✔ | 100 | `/users/*`, `/roles/*`, `PUT /merchant/default-role`, `POST /pos/link-user` |
| 11 | `staff.schedule.manage` | `StaffScheduleManage` | staff | ✗ | 110 | Planning et pointages |
| 12 | **`reports.sales.read`** | `ReportsSalesRead` | reports | ✗ | 120 | **`GET /stats/dashboard/summary`**, **`POST /pos/reports/{tva,payments}`** + leurs `/export` |
| 13 | **`reports.financial.read`** | `ReportsFinancialRead` | reports | ✔ | 130 | **`/accounting/*`** (calcul TVA, export CSV, PDF de caisse), `GET /integrations/stripe/balance` |
| 14 | `settings.manage` | `SettingsManage` | settings | ✔ | 140 | Paramétrage établissement (imprimantes, profils de production, PIN kiosk) |
| 15 | `bookings.manage` | `BookingsManage` | bookings | ✗ | 150 | `/bookings/settings*` uniquement (pas la gestion courante) |
| 16 | `platforms.manage` | `PlatformsManage` | platforms | ✗ | 160 | `/integrations/*` (Uber Eats, Deliveroo, ScanNOrder, Stripe Connect) |
| 17 | `kiosk.manage` | `KioskManage` | kiosk | ✗ | 170 | Mutations `/pos/settings/kiosk` |
| 18 | `seating_plan.manage` | `SeatingPlanManage` | seating_plan | ✗ | 180 | `/floors*` + mutations de tables sous `/locations` |

**Clés retirées** : `pos.access` et `pos.discount.apply` ont été supprimées du catalogue par `migrations/todo/100_deprecate_pos_access_and_discount_apply.up.sql` (aucune ne gardait de route). Elles n'existent plus ni en base ni dans `keys_gen.go`.

`deprecated_at` : NULL pour les 18 clés — la colonne existe mais n'est lue par aucun code.

### 1.4 Rôles prédéfinis

Deux `system_key`, déclarés dans [`internal/permission/system_keys.go`](../../../ib-welloresto-api/internal/permission/system_keys.go) (`SystemKeyAdmin = "admin"`, `SystemKeyStaff = "staff"`), créés par `roles.Repository.EnsureSystemRoles`.

| `system_key` | Nom affiché | Permissions | Modifiable ? |
|---|---|---|---|
| `admin` | « Administrateur » | **Tout le catalogue, par construction** — et court-circuité en code (§3.2) : `Has()` retourne `true` sans consulter `role_permissions` | ✗ — `ReplacePermissions` renvoie `ErrRoleImmutable` (garde G4) |
| `staff` | « Employé polyvalent » | **Aucune** — `sum(role_permissions) = 0` sur les 30 rôles `staff` de staging | ✔ |
| `NULL` | rôle custom | Ce que l'admin y met | ✔ (sauf gardes G1/G2) |

`merchant.default_role_id` pointe sur le rôle **`admin`** de chaque établissement (30/30 sur staging) : décision produit du lot 4, entérinée par `migrations/todo/099_merchant_default_role_admin.up.sql` — tout nouvel utilisateur lié devient administrateur tant que les droits ne sont pas exploités depuis l'UI.

### 1.5 Ce qui *ressemble* à un rôle mais n'en est pas

- `users_rights.role varchar(32) DEFAULT 'employee'` — **jamais lu par une décision d'autorisation**. Colonne RH.
- `employees.role` (enum Postgres) — idem.
- La colonne ajoutée par le RBAC s'appelle délibérément `role_id`, jamais `role`, pour éviter la confusion.

### 1.6 État de déploiement des migrations RBAC

Toutes les migrations RBAC (094→103) sont encore dans **`migrations/todo/`**. Elles sont **appliquées sur staging** (vérifié : les 4 tables existent, les 18 clés sont présentes avec leurs `description`). Le fichier `094` documente explicitement que **la production ne les a jamais reçues**. À vérifier avant tout raisonnement sur la prod.

---

## 2. La portée des données

### 2.1 Un utilisateur peut-il couvrir plusieurs établissements ?

**Oui.**

**Mécanisme** : `users_rights` est une table de liaison `user × merchant` sans contrainte d'unicité — un utilisateur a **N lignes, une par établissement**, chacune avec **son propre `token`, son propre `role_id` et ses propres booléens historiques**. Ce n'est pas une capacité ajoutée par le RBAC : la table était déjà ainsi. Ce que le RBAC ajoute, c'est que le **rôle** est porté par la ligne de liaison, donc les droits sont bien par établissement.

Preuve structurelle : `RotateRightsTokensForUser` itère sur un **ensemble** de liens pour un seul utilisateur —

```go
// internal/modules/auth/repository.go:587
rows, err := db.QueryContext(ctx, `SELECT id, token FROM users_rights WHERE user_id = ?`, userID)
// ... boucle sur []rightsRow, un nouveau token par lien
```

**Preuve en base (staging, 2026-09-03)** :

```sql
SELECT count(*) FROM (
  SELECT user_id FROM users_rights GROUP BY user_id HAVING count(DISTINCT merchant_id) > 1
) t;
-- => 5
```

| Mesure | Valeur |
|---|--:|
| Lignes `users_rights` | 59 |
| `user_id` distincts | 48 |
| `merchant_id` distincts | 30 |
| **Utilisateurs couvrant > 1 établissement** | **5** |
| idem en ne comptant que les liens `enabled` | **5** |
| Tokens distincts / lignes | 59 / 59 |

Détail des 5 :

| `user_id` | Liens | `merchant_id` | Rôles | `users.merchant_id` |
|---|--:|---|---|---|
| `''` (chaîne vide) | 4 | 173, 2, 2, 203 | admin ×4 | NULL |
| `2` | 4 | 2, 212, 230, 303 | admin ×4 | `2` |
| `232` | 4 | 2, 237, 303, 99999230 | admin ×3 + custom | `237` |
| `261` | 2 | 231, 236 | admin ×2 | `231` |
| `4` | 2 | 114, 2 | admin ×2 | `2` |

Les données existent donc déjà en multi-établissement. C'est le mécanisme d'**adressage** (§2.3) qui n'est pas conçu pour, pas le modèle.

### 2.2 `users.merchant_id` : vestige

**Existe toujours** : `users.merchant_id character varying(64)` — nullable, renseignée sur **46 des 47** lignes de staging.

**N'est plus source de vérité.** Aucun chemin d'autorisation ni de scoping ne la lit. Les seules occurrences dans le code Go sont **des commentaires expliquant qu'on a arrêté de la lire** :

```
internal/modules/orders/orders_fetcher_builder.go:606  // la condition o.merchant_id = u.merchant_id s'appuyait sur la colonne
internal/modules/orders/orders_fetcher_builder.go:607  // héritée users.merchant_id (nullable, mono-établissement) et faisait…
internal/modules/pos/repository.go:72                  // users_rights) et non plus de users.merchant_id : cette colonne héritée est…
internal/modules/stocks/repository.go:272              // users.merchant_id écrivait un marchand faux (ou n'insérait rien) pour…
```

**`user.MerchantID` est toujours une `string`** — [`internal/modules/auth/models.go:110`](../../../ib-welloresto-api/internal/modules/auth/models.go#L110) :

```go
MerchantID   string `json:"merchant_id"`
```

Mais **elle est alimentée par `users_rights.merchant_id`, pas par `users.merchant_id`** — c'est la colonne `ur.merchant_id` de la requête `GetUserByToken` ([`repository.go:76`](../../../ib-welloresto-api/internal/modules/auth/repository.go#L76)) :

```sql
COALESCE(ur.manage_customers, FALSE),
ur.merchant_id,          -- <- scanné dans data.MerchantID
ur.role_id,
rl.system_key AS role_system_key,
```

**Qui la lit** : à peu près tous les services (`user.MerchantID` est le paramètre de scoping universel — cf. §3.3). Elle est donc **la bonne valeur** : c'est l'établissement du lien authentifié, pas un défaut d'utilisateur. Le champ reste néanmoins **scalaire**, et c'est exactement là que la couche analytique bute.

> `users.merchant_id` étant divergente en base — `user_id = 232` a `users.merchant_id = '237'` mais des liens vers 2, 237, 303 et 99999230 —, toute requête analytique qui la lirait renverrait un établissement arbitraire. Ne pas la lire.

### 2.3 Résolution d'un token

**Un token → un couple (user × merchant), jamais un ensemble.**

`users_rights.token` est le token d'API, et il est **par ligne de liaison**. Un utilisateur couvrant 4 établissements a **4 tokens distincts** ; **le token porte l'établissement**. Il n'y a pas de « token utilisateur » qu'on résoudrait ensuite vers une liste.

Middleware d'authentification — [`internal/middleware/auth.go`](../../../ib-welloresto-api/internal/middleware/auth.go) :

```go
const userContextKey contextKey = "authenticatedUser"

func Auth(service AuthService) func(http.Handler) http.Handler {
    // …extraction du header "Bearer <token>"…
    user, err := service.GetUserByToken(r.Context(), token)
    if err != nil || user == nil { /* 401 */ }
    // …MFA back-office…
    ctx := context.WithValue(r.Context(), userContextKey, user)   // <- unique injection
    next.ServeHTTP(w, r.WithContext(ctx))
}

func GetUser(r *http.Request) *auth.UserLoginRow           { /* depuis le contexte */ }
func UserFromContext(ctx context.Context) (*auth.UserLoginRow, error) { /* idem, avec erreur */ }
```

**Ce qui est injecté en contexte** : un seul `*auth.UserLoginRow`, qui porte `UserID`, **`MerchantID` (scalaire)**, `RoleID`, `RoleSystemKey`, `Permissions []string`, `Rights` (booléens historiques), plus tous les paramètres de l'établissement courant (fuseau, devise, modules activés, intégrations…). **Rien qui ressemble à une liste d'établissements.**

Résolution SQL ([`repository.go:136-152`](../../../ib-welloresto-api/internal/modules/auth/repository.go#L136)) :

```sql
FROM users u
INNER JOIN users_rights ur ON ur.user_id = u.user_id
INNER JOIN merchant m ON CAST(m.id AS TEXT) = ur.merchant_id
LEFT JOIN roles rl ON rl.id = ur.role_id
-- … 8 LEFT JOIN sur les paramètres/intégrations de CE merchant …
WHERE ur.token = ?
  AND ur.enabled = TRUE
  AND ur.login_enabled = TRUE
LIMIT 1;
```

Puis, seulement si `RoleID != nil`, une **seconde requête** charge les permissions :

```go
// repository.go:432
func (r *AuthRepository) attachRolePermissions(ctx context.Context, data *UserLoginRow) error {
    if data == nil || data.RoleID == nil { return nil }
    perms, err := r.loadRolePermissions(ctx, *data.RoleID)   // SELECT permission_key FROM role_permissions WHERE role_id = ?
    if err != nil { return err }
    data.Permissions = permission.FilterValid(perms)
    return nil
}
```

**Cache** : le `UserLoginRow` entier est sérialisé en JSON dans Redis, **clé = le token** (`models.UserCachePrefix + token`), avec singleflight (`service.go:64-102`). TTL 60 min. Conséquence : un changement de rôle qui n'invalide pas explicitement le token met jusqu'à 60 minutes à prendre effet — le service `roles` appelle bien `invalidateTokens` sur les porteurs, mais **best-effort**.

### 2.4 Une fonction listant les établissements accessibles ?

**Non. Elle n'existe pas.** Recherches exhaustives menées sur `AccessibleMerchant`, `ListMerchantsForUser`, `GetUserMerchants`, `UserMerchants`, `multi-site`, `multi-establishment`, `switch merchant`, `select merchant` → **zéro résultat** dans `internal/` et `cmd/`.

Les deux seules requêtes qui balaient les liens d'un utilisateur ne sélectionnent **pas** `merchant_id` — ce sont des rotations de token :

```go
// internal/modules/auth/repository.go:587  (RotateRightsTokensForUser)
`SELECT id, token FROM users_rights WHERE user_id = ?`
// internal/modules/users/repository.go:408
`SELECT id, token FROM users_rights WHERE user_id = ?`
```

**C'est la brique manquante.** Elle est triviale à écrire (`SELECT merchant_id FROM users_rights WHERE user_id = ? AND enabled AND login_enabled`) mais elle **n'existe nulle part** — il n'y a rien à réutiliser, et rien à ne pas réinventer.

### 2.5 Groupe / enseigne / multi-sites

- **`brands`** : table réelle mais **décorative** — `brand_id`, `name`, `slug`, `logo_url`, `banner_url`, `description`, `creation_date`. Aucune colonne d'habilitation, aucune FK depuis `users` ou `users_rights`.
- **Staging** : **1 seule ligne** (`brand-001` / « Wello Resto »), rattachée à **3 des 30 établissements**. Les 27 autres ont `merchant.brand_id IS NULL`. État inchangé depuis l'audit.
- Usage réel : `GET /scannorder/brands/{brand_slug}` — vitrine ScanNOrder multi-marques. **Aucun rapport avec les droits.**

**Il n'existe aucune notion de groupe, d'enseigne ou de périmètre multi-sites dans la couche de droits.** Le seul multi-établissement existant est la multiplicité de lignes `users_rights` (§2.1), qui n'est ni nommée, ni exposée, ni agrégée.

### 2.6 Comment est déterminé l'établissement « courant » pour POS / carte / commandes ?

**Rien de prévu. C'est le token utilisé qui décide, et il n'y a aucun sélecteur.**

- **Pas de sélecteur** : aucune route de type `POST /auth/switch-merchant`, aucun en-tête `X-Merchant-Id` lu, aucun paramètre `merchant_id` accepté d'un client authentifié.
- **Le login choisit arbitrairement.** `AuthRepository.Login` cherche par email/nom **sur la jointure `users × users_rights`**, sans `ORDER BY`, avec `LIMIT 1` :

```sql
WHERE (
    (UPPER(u.name)=UPPER(?) AND …)
    OR (UPPER(u.email)=UPPER(?) AND …)
    OR ur.token = ?
)
LIMIT 1;
```

  Pour les 5 utilisateurs multi-établissements, **le résultat du login dépend de l'ordre physique des lignes** — il n'est ni stable ni choisi. `merchant.default_role_id` ne joue aucun rôle ici (c'est le rôle par défaut, pas l'établissement par défaut).

- **Changer d'établissement, en pratique** : il faut se ré-authentifier avec l'autre token de l'utilisateur. Le back-office n'a pas d'écran pour ça.

> À consigner : c'est le point le plus fragile de tout l'ensemble. Un onglet « Restaurants » comparatif suppose un adressage multi-établissement dans une seule requête, alors que la session est structurellement mono-établissement.

---

## 3. La vérification en code

### 3.1 Comment une permission est vérifiée

**Un middleware Chi**, appliqué par route ou par groupe de routes. Ni décorateur, ni appel explicite dans le handler.

[`internal/middleware/require_permission.go`](../../../ib-welloresto-api/internal/middleware/require_permission.go) :

```go
func RequirePermission(key permission.Key) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if r.Method == http.MethodOptions { next.ServeHTTP(w, r); return }   // preflight CORS

            user := GetUser(r)
            if user == nil { /* 401 {"error":"unauthorized"} */ ; return }

            granted := user.Has(key)
            observeDecision(r, user, key, granted)                                // no-op si RBAC_OBSERVE != true

            if !granted { renderError(w, r, "access_denied", http.StatusForbidden); return }
            next.ServeHTTP(w, r)
        })
    }
}
```

Deux gardes seulement existent : `RequirePermission(key)` et `RequireAdmin()`. **La signature ne prend qu'une seule clé** — les combinateurs `AnyOf` / `AllOf` du système précédent ont été **supprimés** au lot 2 (voir §4). Il n'est donc plus possible d'exiger deux permissions sur une route. C'est une contrainte forte pour le découpage du §6.

**Exemple complet d'une route protégée** — [`cmd/api/routes.go:651-666`](../../../ib-welloresto-api/cmd/api/routes.go#L651) :

```go
// --- STATS ---
r.Route("/stats", func(r chi.Router) {
    r.Use(authMiddleware)

    // RBAC lot 8 : tuile de reporting sur la page d'accueil back-office —
    // le front doit traiter un 403 en masquant la tuile, pas en cassant
    // la page d'accueil (voir docs/RBAC_ROUTES.md).
    r.Route("/dashboard", func(r chi.Router) {
        r.With(middleware.RequirePermission(permission.ReportsSalesRead)).
            Get("/summary", statsH.GetDashboardSummary)
    })

    // RBAC lot 10 : ancre de garde pour pos.analytics — voir docs/decisions.md.
    r.With(middleware.RequirePermission(permission.POSAnalytics)).
        Get("/upsell", statsH.GetUpsellStats)
})
```

Deux formes équivalentes : `r.Use(...)` pour tout un sous-arbre, `r.With(...).Get(...)` pour une route isolée.

### 3.2 La décision elle-même

[`internal/modules/auth/permissions.go`](../../../ib-welloresto-api/internal/modules/auth/permissions.go) — **un seul point de décision dans tout le code** :

```go
func (u *UserLoginRow) Has(key permission.Key) bool {
    if u.RoleID != nil {
        if u.RoleSystemKey != nil && *u.RoleSystemKey == permission.SystemKeyAdmin {
            return true                       // court-circuit : le rôle admin a tout
        }
        for _, granted := range u.Permissions {
            if granted == string(key) { return true }
        }
        return false                          // le rôle fait autorité, les booléens sont ignorés
    }

    // Monde historique (role_id NULL) : admin court-circuite, sinon fallback booléen.
    if u.Rights.Admin { return true }
    if fallback, ok := legacyPermissionFallback[key]; ok { return fallback(u.Rights) }
    return false                              // clé sans fallback + pas de rôle = refusé
}
```

Conséquence structurelle pour une **nouvelle** clé : elle n'aura **pas** d'entrée dans `legacyPermissionFallback`, donc un utilisateur `role_id IS NULL` non-admin sera **toujours refusé**. Sur staging cela ne concerne qu'**1 lien sur 59** (et il est `admin = true`), mais c'est le comportement à connaître.

### 3.3 Vérification croisée permission × établissement

**Elle n'existe pas, et elle n'est pas exprimable en l'état.**

Il n'y a **aucune** fonction de la forme `Has(key, merchantID)`. `Has(key)` répond « cet utilisateur a-t-il ce droit **sur l'établissement de son token** » — l'établissement est implicite, jamais un paramètre.

C'est cohérent, parce que le token est déjà l'établissement : les permissions chargées viennent du `role_id` de **la ligne `users_rights` de ce token**, donc de cet établissement-là. Il n'y a pas de fuite possible — mais il n'y a pas non plus de moyen de poser la question pour un autre établissement.

Le seul endroit du code qui fasse une vérification explicitement scopée est le module `roles`, et il le fait **manuellement**, en passant `currentUser.MerchantID` en paramètre de la requête SQL :

```go
// internal/modules/roles/service.go:290 (ReplacePermissions)
role, err := s.getMerchantRole(ctx, currentUser.MerchantID, roleID)   // 404 si le rôle appartient à un autre établissement
```

```go
// internal/modules/roles/repository.go:512 (GetUserRightsRoleID)
`SELECT id, role_id FROM users_rights WHERE merchant_id = ? AND user_id = ? AND enabled = TRUE`
```

**Pour la couche analytique** : « cet utilisateur a-t-il `X` sur l'établissement `M` » est une question **à construire**. Elle demande une jointure `users_rights × roles × role_permissions` filtrée sur `(user_id, merchant_id)` — plus le court-circuit `system_key = 'admin'` et le fallback booléen à répliquer si l'on veut le même résultat que `Has()`. Rien de tout cela n'existe.

### 3.4 Où se fait le filtrage par établissement

**Au service.** Chaque service lit `user.MerchantID` du contexte et le passe en paramètre au repository. Le repository l'utilise en clause `WHERE`. Il n'y a **ni garde générique, ni row-level security, ni injection automatique**.

```go
// internal/modules/stats/service.go:22-30
func (s *StatsService) GetDashboardSummary(ctx context.Context, token string) (*DashboardSummaryResponse, error) {
    user, err := middleware.UserFromContext(ctx)
    if err != nil { return nil, models.ErrUnauthorized }

    merchantID := user.MerchantID          // <- le scoping, en clair, au service
    tzString, err := s.statsRepo.GetMerchantTimezone(ctx, merchantID)
    …
}
```

```go
// internal/modules/pos/reports/service.go:29-35
merchantID := user.MerchantID
if merchantID == "" { /* erreur */ }
tvaData, err := s.reportsRepo.GetTVAReportData(ctx, merchantID, dateFrom, dateTo)
```

```sql
-- internal/modules/stats/repository.go:267
WHERE o.merchant_id = ?
```

**Le filtrage est donc à la charge de chaque service, ligne par ligne.** Aucun mécanisme ne rattrape un oubli : un repository analytique qui oublierait `WHERE merchant_id = ?` renverrait les 30 établissements sans qu'aucune couche ne s'y oppose. C'est le risque n°1 du branchement analytique, d'autant que l'onglet « Restaurants » demande *précisément* d'agréger sur plusieurs établissements.

---

## 4. Coexistence avec l'ancien système

### 4.1 `internal/middleware/permissions.go` existe-t-il encore ?

**Oui — mais il ne contient plus qu'une seule fonction, 4 lignes de code utile et 28 lignes de commentaire.** Fichier intégral :

```go
package middleware

import "welloresto-api/internal/modules/auth"

// ============================================================
// RBAC lot 2 — bascule des prédicats
//
// Toutes les fonctions HasXxx/CanXxx ainsi que les combinateurs AnyOf/AllOf
// ont été retirées : RequirePermission prend désormais directement une
// permission.Key et appelle user.Has(key)… Elles ont été supprimées plutôt
// que dépréciées car aucune n'avait plus d'appelant réel dans
// cmd/api/routes.go au moment de la bascule…
// ============================================================

// IsAdmin vérifie que l'utilisateur est administrateur
func IsAdmin(user *auth.UserLoginRow) bool {
    return user.IsAdmin()
}
```

**Les 18 prédicats décrits par `AUDIT.md` (`HasReportsViewAccess`, `HasFinancialsViewAccess`, `HasMenuAccess`, …) n'existent plus.** Ils ont été *supprimés*, pas dépréciés — il n'y a donc pas de code mort de ce côté. `AnyOf` / `AllOf` sont partis avec eux.

Retiré aussi au lot 2.5 : `IsEmailVerified` / `IsTelVerified`, qui détournaient un statut de vérification de compte en décision d'autorisation (documenté dans `docs/RBAC_VERIFICATION_RETIREE.md`). Les colonnes `users.email_verified_at` / `tel_verified_at` sont intactes ; seule la décision a disparu.

### 4.2 Deux systèmes coexistent-ils ?

**Oui — mais pas de la façon dangereuse.** Il y a **deux sources de droits**, et **un seul point de décision** qui arbitre entre elles : `UserLoginRow.Has()` (§3.2). Aucune route n'utilise « l'ancien système » : toutes passent par `RequirePermission` → `Has()`.

L'arbitrage est **par utilisateur**, pas par route :

| Cas | Source qui fait autorité | Les autres |
|---|---|---|
| `users_rights.role_id IS NOT NULL` **et** rôle `system_key='admin'` | Court-circuit : **tout accordé** | `role_permissions` et les booléens sont ignorés |
| `users_rights.role_id IS NOT NULL`, rôle non-admin | **`role_permissions`** | Les booléens sont **ignorés, même s'ils contredisent le rôle** |
| `users_rights.role_id IS NULL`, `admin = true` | **Tout accordé** | — |
| `users_rights.role_id IS NULL`, `admin = false` | **Colonnes booléennes**, via `legacyPermissionFallback` | Clé sans entrée dans la map ⇒ refusé |

**Ce qui est du code mort / du vestige** :

| Élément | Statut |
|---|---|
| Les 18 prédicats `HasXxx` | **Supprimés** (n'existent plus) |
| `AnyOf` / `AllOf` | **Supprimés** |
| `pos.access`, `pos.discount.apply` | **Supprimées du catalogue** (migration 100) |
| `users_rights.access_wrdelivery`, `access_wrwaiter`, `export_reports`, `export_financials`, `export_customers` | **Droppées** par la migration 110 (`todo/`) |
| `users_rights.access_wrreception` | **Vivante** : c'est le fallback de `pos.status.manage` |
| Les 11 autres colonnes booléennes (`manage_menu`, `view_reports`, `view_financials`, `admin`…) | **Vivantes en fallback uniquement**, pour les liens sans `role_id` |
| `users_rights.role` (varchar) / `employees.role` (enum) | Vestiges RH, jamais lus par l'autorisation |
| `users.merchant_id` | Vestige (§2.2) |
| `middleware.RequireAdmin()` / `IsAdmin()` | **Vivant, et distinct du RBAC** : lit `Rights.Admin` (la colonne), pas le rôle |

> ⚠️ **Le piège réel du projet n'est pas « deux systèmes de routes » — c'est `IsAdmin()` vs `HasAdminRole()`.** Deux méthodes très proches, sur le même objet, qui répondent à deux questions différentes :
> - `IsAdmin()` → `Rights.Admin`, la **colonne** `users_rights.admin`. Utilisée par `middleware.RequireAdmin()` (`POST /users/{id}/force-reset-password`, `DELETE /users/{id}/merchant-link`).
> - `HasAdminRole()` → le **rôle** (`system_key = 'admin'`). Utilisée par la réponse de login et `GET /me/permissions`.
>
> Le commentaire du code est explicite : *« Rights.Admin frequently stays true in production regardless of the assigned role (historical seeding) »*. Vérifié sur staging : **40 lignes sur 59 ont `admin = true`**, dont **1 lien portant le rôle custom « Test droits » (0 permission)** et **6 liens désactivés**. Toute décision analytique qui lirait `admin` plutôt que le rôle accorderait tout à ces comptes.

### 4.3 État actuel de `/stats/*` et `/pos/reports/*`

**Protégées, toutes les deux, depuis le lot 8.**

| Route | Authentification | Permission | Depuis |
|---|:--:|---|---|
| `GET /stats/dashboard/summary` | ✔ | `reports.sales.read` | lot 8 |
| `GET /stats/upsell` | ✔ | **`pos.analytics`** | lot 10 |
| `POST /pos/reports/tva` | ✔ | `reports.sales.read` | lot 8 |
| `POST /pos/reports/payments` | ✔ | `reports.sales.read` | lot 8 |
| `POST /pos/reports/tva/export` | ✔ | `reports.sales.read` | lot 8 |
| `POST /pos/reports/payments/export` | ✔ | `reports.sales.read` | lot 8 |
| `POST /pos/accounting/export` | ✔ | **aucune** | — |
| `/accounting/*` (3 routes) | ✔ | `reports.financial.read` | lot 8 |

> À consigner : `POST /pos/accounting/export` (`posAccountingHandler.ExportAccounting`) est dans le sous-arbre `/pos` — authentifié mais **sans aucune permission**, alors que ses trois jumelles sous `/accounting` sont gardées par `reports.financial.read`. Incohérence ; non corrigée ici.

---

## 5. L'attribution

### 5.1 Comment un droit est attribué, en pratique

**Par API, depuis le back-office.** Trois chemins, tous gardés par `staff.manage` (sauf mention).

| Action | Route | Handler | Écran back-office |
|---|---|---|---|
| Lister le catalogue | `GET /permissions` | `rolesH.ListPermissions` | — (alimente l'éditeur) |
| Mes droits effectifs | `GET /me/permissions` | `rolesH.MyPermissions` | gating du menu |
| CRUD des rôles | `GET/POST /roles`, `GET/PATCH /roles/{id}`, `GET /roles/{id}/members`, `POST /roles/{id}/archive` | `internal/modules/roles/handler.go` | `src/components/team/roles/` |
| **Définir les permissions d'un rôle** | **`PUT /roles/{id}/permissions`** | `rolesH.ReplacePermissions` | `PermissionsEditor.tsx` |
| **Attribuer un rôle à un utilisateur** | **`PUT /users/{id}/role`** | `rolesH.SetUserRole` | `AccessTab.tsx` |
| Rôle par défaut de l'établissement | `PUT /merchant/default-role` | `rolesH.SetMerchantDefaultRole` | — |

Côté front : `src/services/welloApi.ts` (`rolesApi`, ligne 287 ; `PUT /users/{id}/role`, ligne 273).

**Gardes métier appliquées par `internal/modules/roles/service.go`** :

| Code | Règle |
|---|---|
| G1 | On ne modifie ni son propre rôle (`SetUserRole`), ni les permissions du rôle qu'on porte (`ReplacePermissions`) — sinon « je ne peux pas changer mon rôle » se contourne en un clic |
| G2 | Retirer `staff.manage` ne doit pas laisser l'établissement sans **aucun** porteur actif |
| G4 | **Le rôle `admin` est immuable** — `ReplacePermissions` renvoie `ErrRoleImmutable` |
| — | Verrou optimiste : `PUT /roles/{id}/permissions` exige `version` ; conflit ⇒ 409 |
| — | Après écriture, les tokens des porteurs sont invalidés dans Redis (best-effort ; sinon TTL 60 min) |

**Aucune UI d'attribution de permission unitaire à un utilisateur** — et c'est structurel : l'attribution passe par un rôle. L'ancien éditeur de droits case-à-cocher (`RightsTab`) a été remplacé par un sélecteur de rôle (`AccessTab.tsx`).

**Migration / insertion manuelle** : le catalogue (`permissions`) est peuplé **uniquement par migration**. Les rôles système et le backfill du rôle admin passent par un programme Go one-shot, `go run ./cmd/seed_system_roles` (la migration 096 est délibérément un `SELECT 1;` no-op, parce que les ids `role-<uuid>` doivent être générés côté Go).

### 5.2 État réel sur staging (2026-09-03)

**Utilisateurs et liens**

| Mesure | Valeur |
|---|--:|
| Lignes `users` | 47 |
| Lignes `users_rights` (liens user × établissement) | 59 |
| `user_id` distincts dans `users_rights` | 48 (dont 1 = chaîne vide) |
| Établissements | 30 |
| Liens avec `role_id` renseigné | **58 / 59** |
| Liens avec `users_rights.admin = true` | 40 / 59 |

**Répartition des rôles portés**

| Rôle porté | Liens | dont actifs (`enabled ∧ login_enabled`) | dont `admin = true` |
|---|--:|--:|--:|
| `admin` — « Administrateur » | 56 | 50 | 39 |
| `staff` — « Employé polyvalent » | 1 | **0** | 0 |
| custom — « Test droits » | 1 | 1 | 0 |
| *aucun rôle* (`role_id IS NULL`) | 1 | 1 | 1 |

**Rôles existants**

| `system_key` | Nb rôles | Établissements couverts | Permissions attribuées |
|---|--:|--:|---|
| `admin` | 30 | 30 | **29 rôles à 13 clés, 1 seul à 18** |
| `staff` | 30 | 30 | **0 — aucun rôle `staff` n'a la moindre permission** |
| `NULL` (custom) | 3 (2 actifs) | 2 | « Serveur (modifie onglet A) » : `pos.refund` (0 porteur) · « Test droits » : **0** (1 porteur) · « test » : 0 (0 porteur) |

**Permissions effectivement attribuées** (`role_permissions`, par clé)

| Clé | Dans N rôles | dont `admin` | dont `staff` | dont custom |
|---|--:|--:|--:|--:|
| `catalog.manage`, `customers.manage`, `haccp.manage`, `inventory.manage`, `pos.cash_drawer.open`, `pos.status.manage`, `pos.ticket.reopen`, `reports.financial.read`, `reports.sales.read`, `settings.manage`, `staff.manage`, `staff.schedule.manage` | 30 | 30 | 0 | 0 |
| `pos.refund` | 31 | 30 | 0 | 1 |
| **`pos.analytics`**, `bookings.manage`, `kiosk.manage`, `platforms.manage`, `seating_plan.manage` | **1** | 1 | 0 | 0 |

> ⚠️ **`cmd/seed_system_roles` n'a pas été relancé après la migration 103.** Les 5 clés du lot 10 — dont **`pos.analytics`** — ne sont présentes dans `role_permissions` que pour **1 rôle `admin` sur 30**.
>
> **Sans effet sur l'autorisation** (`Has()` court-circuite sur `system_key = 'admin'`, §3.2). **Mais avec effet sur l'affichage** : `PermissionsEditor.tsx` lit `role_permissions`, donc l'éditeur de rôles montre 13 droits cochés au lieu de 18 pour 29 établissements. À relancer avant toute démonstration de la page Analyse.
>
> Deuxième conséquence : **si un jour un établissement passe ses utilisateurs sur un rôle non-`admin`, ils perdront `pos.analytics`** — la clé n'est nulle part ailleurs que dans ce rôle unique.

**Lecture d'ensemble** : staging est en pratique **mono-rôle**. 56 liens sur 59 portent « Administrateur », qui a tout. Le RBAC est déployé et fonctionnel, mais **non exercé** : il n'y a aujourd'hui **aucun compte staging pour lequel une permission analytique ferait une différence**, sauf le porteur de « Test droits » (0 permission — il est déjà refusé partout).

### 5.3 Recette exacte pour ajouter une permission et l'attribuer

Sept étapes, dans cet ordre. Trois tests **cassent le build** si l'une est oubliée.

**1. Migration — ajout au catalogue.** `migrations/todo/1XX_permission_<nom>.up.sql`, idempotente (convention 095/097/103) :

```sql
INSERT INTO permissions (key, domain, label, description, is_sensitive, sort_order) VALUES
    ('reports.staff_performance.read', 'reports', 'Consulter les analyses nominatives par salarié',
     'Accéder aux classements et statistiques nominatifs par membre de l''équipe (upsell, annulations).', true, 135)
ON CONFLICT (key) DO NOTHING;
```

`.down.sql` — purger `role_permissions` **avant** `permissions` (contrainte FK) :

```sql
DELETE FROM role_permissions WHERE permission_key IN ('reports.staff_performance.read');
DELETE FROM permissions      WHERE key            IN ('reports.staff_performance.read');
```

**2. Constante Go — miroir obligatoire.** `internal/permission/keys_gen.go` : ajouter la constante dans le bloc `const` **et** l'entrée dans `var All` à sa position de `sort_order`.
→ `internal/permission/keys_gen_test.go` scanne tous les `migrations/**/*.up.sql` et **échoue** si les deux divergent.

**3. Câbler au moins une route réelle.** `cmd/api/routes.go` :

```go
r.With(middleware.RequirePermission(permission.ReportsStaffPerformanceRead)).
    Get("/staff-performance", statsH.GetStaffPerformance)
```

→ `cmd/api/routes_rbac_permission_coverage_test.go` **échoue** si une clé du catalogue ne garde aucune route.

**4. Ratchet.** Si l'ajout garde des routes **mutatives** (POST/PUT/PATCH/DELETE) jusque-là libres, baisser `unguardedMutativeRouteCeiling` dans `cmd/api/routes_rbac_ratchet_test.go` (actuellement **175**). Des endpoints analytiques en `GET` ⇒ rien à changer.

**5. Vérifier.**

```bash
go build ./...
go test ./internal/permission/... ./cmd/api/... \
  -run 'TestAllMatchesMigrationCatalog|TestNoDuplicateKeys|TestRBACPermissionCoverage|TestRBACRatchet'
```

**6. Déployer la migration, puis backfiller les rôles admin.**

```bash
DB_DIALECT=postgres POSTGRES_URL=… go run ./cmd/seed_system_roles
```

Idempotent. `ensureSystemRole` réconcilie **le rôle `admin` seul** contre le catalogue courant (`grantMissingPermissions`) — c'est ce qui donne la nouvelle clé aux 30 rôles « Administrateur ». Nécessaire pour l'**affichage** de l'éditeur ; pas pour l'autorisation.
**À lancer aussi maintenant** pour rattraper les 5 clés du lot 10 (§5.2).

**7. Attribuer aux rôles non-admin.** Back-office → Équipe → Rôles → `PermissionsEditor` → `PUT /roles/{id}/permissions` avec `{ version, permission_keys: [...] }` (liste **complète**, c'est un remplacement, pas un delta). Le rôle `admin` refuse (G4) ; on ne peut pas éditer le rôle qu'on porte (G1). Puis `PUT /users/{id}/role` pour placer un utilisateur sur ce rôle.

**Ce qui n'est PAS nécessaire** : aucune énumération SQL (`permissions.key` est un `varchar`, pas un type enum) ; aucune entrée dans `legacyPermissionFallback` — et il ne **faut pas** en ajouter : une nouvelle clé sans fallback est refusée aux comptes `role_id IS NULL`, ce qui est le comportement voulu (fail-closed).

---

## 6. Une permission ou plusieurs ?

### 6.1 Ce que dit la granularité existante — pas la théorie

Trois observations, toutes tirées du catalogue réel :

1. **La convention est grossière par domaine.** 18 clés pour un ERP entier, presque toutes en `<domaine>.manage`, une par écran ou par famille d'écrans. Le principe des lots 8 et 10 est explicite dans `docs/decisions.md` : *« CONFIGURATION gardée, CONSULTATION/SAISIE courante laissée libre »*.

2. **Mais le domaine `reports` est le seul que le projet a délibérément coupé en deux** — et il l'a coupé **sur l'axe de la sensibilité**, pas sur celui de l'écran : `reports.sales.read` (`is_sensitive = false`) vs `reports.financial.read` (`is_sensitive = true`). La ligne de partage réellement tracée : **le volume et le CA sont « sales », la marge et la comptabilité sont « financial »**. Précédent qui fait foi : `GET /stats/dashboard/summary`, qui affiche du chiffre d'affaires, est sous `reports.sales.read` — pas sous financial.

3. **Le champ `is_sensitive` existe et est utilisé** (7 clés sur 18). Le projet dispose donc déjà d'un vocabulaire pour dire « ce droit n'est pas anodin » — et l'a appliqué à `customers.manage` (« Gérer **et exporter** les fiches clients »), c'est-à-dire précisément au caractère nominatif d'une donnée.

Il y a en revanche **une classe de sensibilité qui n'a aucune clé** : la **performance individuelle nominative d'un salarié**. `staff.manage` couvre l'administration RH (créer, payer, planifier), pas la lecture d'un classement de performance. Rien dans le catalogue ne l'exprime.

**Contrainte technique décisive** : depuis le lot 2, `RequirePermission` ne prend **qu'une seule clé** ; `AnyOf`/`AllOf` ont été supprimés (§3.1). **Une route = une permission.** Un découpage fin obligerait donc à découper les *endpoints*, pas seulement les droits.

### 6.2 Recommandation

> **Réutiliser trois clés existantes, en créer exactement une : `reports.staff_performance.read`.**
>
> **Une permission unique ne suffit pas** — non par principe RGPD abstrait, mais parce qu'elle créerait **deux réponses contradictoires à la même question** dans le même produit.

**L'argument central, celui qui tranche** : les données des onglets CA, Règlements et TVA sont **déjà servies aujourd'hui** par `POST /pos/reports/tva` et `POST /pos/reports/payments`, gardées par `reports.sales.read`. Poser une clé unique `pos.analytics` sur les endpoints analytiques ferait qu'un même utilisateur pourrait lire les mêmes chiffres de TVA **selon l'écran par lequel il passe**. Ce n'est pas une question de découpage théorique : c'est un contournement effectif du droit `reports.sales.read` par une autre porte. La réutilisation des clés `reports.*` n'est donc pas un raffinement, c'est **la condition de cohérence du système existant**.

**L'argument pour la clé nouvelle** : le classement des serveurs à l'upsell et les annulations par serveur sont la seule donnée de la page qui identifie **une personne physique salariée et évalue sa performance**. Le catalogue traite déjà le nominatif client comme sensible (`customers.manage`, `is_sensitive = true`) ; il n'a simplement jamais eu à traiter le nominatif salarié, faute d'écran qui l'expose. La page Analyse est cet écran. Ne pas créer la clé revient à décider qu'un droit de lecture de statistiques de vente emporte un droit d'évaluation individuelle du personnel — décision qui n'a jamais été prise, et que le RGPD rendrait coûteuse à défendre.

**Pourquoi une seule clé nouvelle, et pas trois ou quatre** : parce que la convention du projet est grossière, et qu'elle a raison de l'être. Les autres axes de sensibilité de la page ont **déjà** une clé qui les couvre exactement. Créer `analytics.revenue.read`, `analytics.products.read`, `analytics.discounts.read` dupliquerait `reports.*` et rouvrirait le problème de cohérence qu'on vient de fermer.

**Sort de `pos.analytics`** : on la **garde telle quelle**, dans son rôle actuel et documenté (`docs/decisions.md`, lot 10) — **gate de la page côté front**, plus son ancre `GET /stats/upsell`. Elle répond à « cet utilisateur voit-il l'entrée de menu Analyse », pas à « peut-il lire cette donnée ». C'est déjà l'intention écrite : *« seul `pos.analytics` gate la page dans son ensemble côté front »*.

### 6.3 Rattachement des 11 onglets

Onglets tels que déclarés dans `src/pages/DashboardAnalysis.tsx:1580-1592`.

| # | Onglet (`id`) | Nature de la donnée | Permission sur l'endpoint | Nouvelle ? |
|---|---|---|---|:--:|
| 1 | CA (`ca`) | Chiffre d'affaires, volume | `reports.sales.read` | non |
| 2 | Commandes (`commandes`) | Volume, panier moyen, canaux | `reports.sales.read` | non |
| 3 | Produits (`produits`) | Ventes par produit / catégorie | `reports.sales.read` | non |
| 4 | Options (`options`) | Ventes d'options et suppléments | `reports.sales.read` | non |
| 5 | Tags (`tags`) | Ventes par étiquette | `reports.sales.read` | non |
| 6 | Règlements (`paiements`) | Encaissements par moyen de paiement | `reports.sales.read` — **précédent direct** : `POST /pos/reports/payments` | non |
| 7 | Restaurants (`restaurants`) | Comparatif inter-établissements | `reports.sales.read` **+ résolution du blocage de portée (§2)** | non |
| 8 | Remises (`remises`) | **Impact marge**, marge avec/sans remise | `reports.financial.read` | non |
| 9 | Clients (`clients`) | **Nominatif client** : top clients, LTV, dernière visite | `customers.manage` | non |
| 10 | Annulations (`annulations`) | Agrégats → `reports.sales.read` · **bloc « par serveur » → endpoint séparé** | `reports.staff_performance.read` | **oui** |
| 11 | Vente additionnelle (`upsell`) | Agrégats → `pos.analytics` (existant, `GET /stats/upsell`) · **classement serveurs → endpoint séparé** | `reports.staff_performance.read` | **oui** |

Plus, transverse : **`pos.analytics` = accès à la page** (menu + route front). Un utilisateur sans `pos.analytics` ne voit pas l'entrée « Analyse ». Un utilisateur qui l'a mais qui n'a pas `reports.financial.read` voit la page, et l'onglet Remises renvoie 403 — le front doit **masquer l'onglet**, pas casser la page, exactement comme la consigne du lot 8 pour la tuile d'accueil.

**Conséquence de conception à assumer** : les onglets 10 et 11 doivent exposer **deux endpoints chacun** (agrégat / nominatif), puisqu'une route ne peut porter qu'une clé. C'est le prix du découpage, et il est faible : ce sont deux requêtes qui n'ont de toute façon ni le même `GROUP BY` ni la même pagination.

**Réserve à consigner** : l'onglet 11 est aujourd'hui **inexploitable sur données réelles** — `orderitems.is_upsell = 0` sur les 77 406 lignes (`AUDIT.md` M1). L'onglet 10 l'est partiellement — `created_by` ne correspond à aucun `users.user_id` sur 48 % des annulations (M11). La clé `reports.staff_performance.read` doit être créée quand même : elle garde des endpoints qui existeront avant que la donnée soit propre, et il sera plus coûteux de la rétro-poser une fois les écrans ouverts.

---

## Synthèse

1. **Multi-établissement : oui.** Un utilisateur a N lignes `users_rights` (une par établissement), chacune avec son `role_id` et **son propre token**. Aucune contrainte d'unicité sur `(user_id, merchant_id)`.
2. **Staging : 5 utilisateurs** couvrent plus d'un établissement (59 liens / 48 utilisateurs / 30 établissements).
3. **Mais le token EST l'établissement** : un token → un couple (user × merchant), jamais un ensemble. Le contexte ne porte qu'un `MerchantID` **scalaire**, issu de `users_rights.merchant_id` (pas de `users.merchant_id`, devenue un vestige jamais lu).
4. **Aucun sélecteur d'établissement** : pas de route de switch, pas d'en-tête. `Login` fait `LIMIT 1` sans `ORDER BY` — pour ces 5 comptes, l'établissement obtenu est arbitraire.
5. **La fonction qui liste les établissements accessibles n'existe pas.** Rien à réutiliser : les deux seules requêtes balayant les liens d'un utilisateur (`auth/repository.go:587`, `users/repository.go:408`) ne sélectionnent que `id, token` pour faire tourner les tokens.
6. **Il n'existe pas non plus de `Has(key, merchantID)`** : `Has(key)` répond toujours pour l'établissement du token. La vérification croisée droit × établissement est **à construire**.
7. **`brands` / `merchant.brand_id` restent décoratifs** (1 marque, 3 établissements sur 30) et n'ont aucun lien avec les droits. Il n'existe aucune notion de groupe ou d'enseigne.
8. **Permissions à poser** : `reports.sales.read` (onglets 1-7), `reports.financial.read` (Remises), `customers.manage` (Clients), **`reports.staff_performance.read` à créer** (blocs nominatifs par serveur d'Annulations et Vente additionnelle), `pos.analytics` conservée comme gate de page côté front. **Une seule clé à créer.**
9. **Recette** : migration idempotente `INSERT … ON CONFLICT DO NOTHING` (+ `.down` purgeant `role_permissions` avant `permissions`) → constante dans `keys_gen.go` **et** dans `All` → câblage sur ≥1 route réelle → `go test` (3 tests cassent le build sinon) → déploiement → `go run ./cmd/seed_system_roles` → `PUT /roles/{id}/permissions` puis `PUT /users/{id}/role`.
10. **Piège n°1** : `RequirePermission` ne prend **qu'une seule clé** (`AnyOf`/`AllOf` supprimés au lot 2) — un onglet à deux niveaux de sensibilité impose **deux endpoints**.
11. **Piège n°2** : le scoping par établissement est fait **à la main dans chaque service** (`merchantID := user.MerchantID`), sans garde ni RLS. Un `WHERE merchant_id = ?` oublié fuite les 30 établissements — et l'onglet « Restaurants » demande justement d'agréger au-delà d'un établissement.
12. **Piège n°3** : `IsAdmin()` (colonne `users_rights.admin`, `true` sur **40 liens / 59**) ≠ `HasAdminRole()` (rôle) ; le `UserLoginRow` entier est caché dans Redis **par token, 60 min** ; et `cmd/seed_system_roles` n'a pas été relancé après la migration 103 — **`pos.analytics` n'est dans `role_permissions` que pour 1 rôle admin sur 30** (sans effet sur l'autorisation grâce au court-circuit admin, mais l'éditeur de rôles l'affiche faux).
