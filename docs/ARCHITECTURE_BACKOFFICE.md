# Architecture Back-office — WelloResto
## Document de référence pour le module Kiosk

> Généré le : 2026-06-18
> Stack : React 18.3.1 / TypeScript 5.8.3 / Vite 5.4.19
> Note : `docs/ARCHITECTURE_API.md` (référencé dans la consigne d'origine) n'existe pas dans ce repo au moment de la rédaction. Ce document s'appuie donc uniquement sur l'audit du code front-end. Si un contrat d'API Kiosk existe ailleurs, il faudra le confronter à la section 9.

---

## 1. Stack et dépendances

### 1.1 package.json annoté

```json
{
  "dependencies": {
    "@dnd-kit/core": "Drag & drop (plan de salle / réorganisation de listes)",
    "@dnd-kit/sortable": "Drag & drop — listes triables",
    "@dnd-kit/utilities": "Helpers CSS pour dnd-kit",
    "@googlemaps/js-api-loader": "Chargement dynamique de l'API Google Maps",
    "@hookform/resolvers": "Pont entre react-hook-form et Zod (zodResolver)",
    "@radix-ui/react-*": "Primitives UI headless (accordion, dialog, dropdown, select, sheet, tabs, toast, tooltip...) — base de shadcn/ui",
    "@tanstack/react-query": "Data fetching, cache, mutations — UNIQUE lib de fetching utilisée",
    "@types/google.maps": "Typage Google Maps",
    "class-variance-authority": "Gestion de variants de classes Tailwind (utilisé par les composants shadcn/ui)",
    "clsx": "Concatenation conditionnelle de classes CSS",
    "cmdk": "Command palette (⌘K)",
    "date-fns": "Manipulation de dates",
    "embla-carousel-react": "Carousel",
    "framer-motion": "Animations",
    "input-otp": "Saisie de code OTP (MFA)",
    "konva" / "react-konva": "Canvas 2D — plan de salle (FloorPlanCanvas)",
    "lucide-react": "Icônes — SEULE lib d'icônes utilisée",
    "next-themes": "Gestion thème clair/sombre",
    "react" / "react-dom": "Framework UI — v18.3.1",
    "react-day-picker": "Sélecteur de date (calendar.tsx)",
    "react-hook-form": "Gestion de formulaires — SEULE lib de formulaires utilisée",
    "react-phone-number-input": "Saisie de numéro de téléphone",
    "react-resizable-panels": "Panneaux redimensionnables",
    "react-rnd": "Drag/resize libre (plan de salle)",
    "react-router-dom": "Routing — v6.30.1, SEUL routeur utilisé",
    "recharts": "Graphiques (dashboard, rapports)",
    "sonner": "Toasts (notifications) — second système de toast, voir section 7.6",
    "tailwind-merge" / "tailwindcss-animate": "Utilitaires Tailwind",
    "vaul": "Drawer mobile",
    "zod": "Validation de schémas — utilisé avec react-hook-form pour TOUS les formulaires"
  },
  "devDependencies": {
    "@vitejs/plugin-react-swc": "Plugin Vite — compilation React via SWC (rapide)",
    "lovable-tagger": "Plugin Vite (mode dev uniquement) — tagging de composants pour l'éditeur Lovable",
    "typescript-eslint" / "eslint": "Lint",
    "tailwindcss" / "postcss" / "autoprefixer": "Styling"
  }
}
```

Le nom du package (`vite_react_shadcn_ts`) confirme l'origine du projet : un starter **Vite + React + shadcn/ui + TypeScript** (généré via Lovable).

### 1.2 UI library

**shadcn/ui** (composants copiés/générés dans `src/components/ui/`, basés sur Radix UI + class-variance-authority) + **Tailwind CSS**. Pas de MUI, pas d'Ant Design.

### 1.3 Icônes

**lucide-react** exclusivement.

### 1.4 Versions clés

| Élément | Version |
|---|---|
| React | 18.3.1 |
| TypeScript | 5.8.3 |
| Vite | 5.4.19 (bundler) |
| react-router-dom | 6.30.1 |
| @tanstack/react-query | 5.83.0 |
| zod | 3.25.76 |
| react-hook-form | 7.61.1 |

---

## 2. Structure du projet

```
src/
├── components/          Composants réutilisables, organisés par domaine + dossier ui/ générique
│   ├── ui/               ~50 composants shadcn/ui (button, dialog, sheet, table, select, form...)
│   ├── shared/            Composants génériques transverses (ProtectedRoute, PageContainer, ConfirmDialog...)
│   ├── dashboard/         Layout principal (DashboardLayout, Sidebar) + widgets du tableau de bord
│   ├── navigation/        SidebarItem, SubItemsPopover — rendu de la nav à partir de navConfig.ts
│   ├── settings/printers/ Composants spécifiques à la feature "imprimantes" (PrinterFormSheet)
│   ├── menu/, locations/, customers/, accounting/, analytics/, reports/, mobile/, auth/, command-palette/
│   │                      Composants spécifiques à chaque domaine fonctionnel
├── pages/                Une page = une route. Certaines sous-dossiers par domaine (equipe/, haccp/, reservations/)
├── services/             Couche d'accès API : un fichier "xxxService.ts" par domaine + apiClient.ts (HTTP client)
│   ├── mocks/             Données mockées pour USE_MOCK_DATA
│   └── __tests__/         Tests unitaires des services
├── types/                Types TypeScript globaux, un fichier par domaine (printers.ts, auth.ts, menu.ts...)
├── contexts/             État global via React Context (Auth, MFA, modals transverses)
├── hooks/                Hooks custom réutilisables (use-toast, useAuth, useFuzzySearch, data hooks de page)
├── lib/                  Utilitaires transverses + queryKeys.ts (factory des clés React Query) + moduleAccess.ts
├── config/               Configuration statique (navConfig.ts = source de vérité de la sidebar, settingsConfig.ts...)
└── utils/                Petits utilitaires métier (formatage dates, prix, conversions d'unités)
```

### 2.1 Organisation des features

Le projet est organisé **par type de fichier** (components / pages / services / types / hooks), puis **par domaine à l'intérieur de chaque dossier**. Ce n'est pas un découpage par feature-folder (pas de `features/printers/{components,hooks,types}`). Pour une feature donnée (ex. printers), les fichiers sont donc dispersés :
- `src/types/printers.ts`
- `src/services/printerService.ts`
- `src/pages/PrintersTable.tsx`
- `src/components/settings/printers/PrinterFormSheet.tsx`
- une entrée dans `src/lib/queryKeys.ts`
- une entrée dans `src/config/navConfig.ts`
- une route dans `src/App.tsx`

**C'est le pattern à reproduire pour Kiosk** (voir section 9 et 10).

### 2.2 Convention de nommage

| Élément | Convention | Exemple |
|---|---|---|
| Composants / Pages | PascalCase, suffixe explicite du type d'UI (`Table`, `Sheet`, `Dialog`, `Card`) | `PrintersTable.tsx`, `PrinterFormSheet.tsx` |
| Hooks | camelCase préfixé `use` | `useAuth.ts`, `useFuzzySearch.ts` |
| Services | camelCase suffixé `Service`, objet exporté du même nom | `printerService.ts` → `export const printerService = {...}` |
| Types/interfaces | PascalCase, pas de préfixe `I` | `PrinterEntry`, `CreatePrinterRequest` |
| Types union (enums) | PascalCase pour le type, valeurs en snake_case côté API | `PrinterRole = "caisse" | "production" | ...` |
| Fichiers de types | camelCase, nom du domaine au pluriel ou singulier selon le fichier existant | `printers.ts`, `auth.ts`, `menu.ts` |
| Query keys | objet `qk`, propriété nommée comme la ressource (camelCase) | `qk.printers.all`, `qk.printers.detail(id)` |

### 2.3 Entry point et routing

- Entry point : `src/main.tsx` (non audité en détail, monte `<App />`).
- Routing : **React Router v6** (`react-router-dom`), déclaration **centralisée** dans `src/App.tsx` — pas de co-location de routes, pas de fichier `routes.tsx` séparé.

### 2.4 Fichiers de config

- `vite.config.ts` : plugin React via SWC, alias `@` → `./src`, port dev 8080, plugin `lovable-tagger` en mode développement uniquement.
- `tsconfig.json` : project references (`tsconfig.app.json` / `tsconfig.node.json`), alias `@/*` → `./src/*`, **strict mode partiellement désactivé** (`noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals/Parameters: false`).
- `.env.local` / `.env.example` : `VITE_API_BASE_URL`, `VITE_USE_MOCK`, `VITE_ENABLE_LOGS`, `VITE_GOOGLE_PLACES_API_KEY`.

---

## 3. Routing et navigation

### 3.1 Déclaration des routes

Fichier unique et central : **`src/App.tsx`**. Toutes les pages y sont importées en haut du fichier puis déclarées dans un seul bloc `<Routes>` :

```tsx
<Route path="/settings/printers" element={<ProtectedRoute><PrintersTable /></ProtectedRoute>} />
<Route path="/stocks" element={<ProtectedRoute requiredModule="stock"><Stocks /></ProtectedRoute>} />
<Route path="/reservations/list" element={<ProtectedRoute requiredModule="bookings"><ReservationsListPage /></ProtectedRoute>} />
```

Toutes les routes (sauf `/login` et `*`) sont enveloppées dans `<ProtectedRoute>`. Certaines passent une prop `requiredModule` pour conditionner l'accès à une capacité du merchant (`stock`, `bookings`, `haccp`, `scannorder`).

### 3.2 Routes protégées (auth)

`src/components/shared/ProtectedRoute.tsx` :

```tsx
export function ProtectedRoute({
  children,
  requiredModule,
  fallbackPath = '/',
  accessCheck,
}: ProtectedRouteProps) {
  const { authData } = useAuth();

  if (!authData) {
    return <Navigate to="/login" replace />;
  }

  if (authData.session.mfa_status === 'pending') {
    return <Navigate to="/login" replace />;
  }

  if (!hasModuleAccess(authData, requiredModule)) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (accessCheck && !accessCheck(authData)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
```

`hasModuleAccess` (dans `src/lib/moduleAccess.ts`) vérifie que le merchant a la capacité demandée. Pour Kiosk, si l'accès doit être conditionné à un module (ex. `kiosk`), il faut étendre le type `ModuleCapability` (dans `src/types/auth.ts`) et passer `requiredModule="kiosk"` à la route.

### 3.3 Paramètres de route

Très peu de routes paramétrées dans le code observé (`/settings/:section` est le seul exemple visible). Pas de pattern générique de hook `useParams` typé — usage direct de `useParams()` de react-router-dom là où nécessaire.

### 3.4 Navigation latérale

Source de vérité **unique** : `src/config/navConfig.ts`, qui exporte `NAV_ITEMS: NavItem[]`. Chaque entrée a `id`, `title`, `icon` (composant lucide-react), `href` (ou `children: NavChild[]`), et optionnellement `requiredModule` / `visibilityCheck` / `primaryNav`.

```ts
{
  id: 'settings',
  title: 'Paramètres',
  icon: Settings,
  children: [
    { id: 'establishment', title: 'Établissement', icon: Store, href: '/settings/establishment' },
    { id: 'printers', title: 'Imprimantes', icon: Printer, href: '/settings/printers' },
    { id: 'profile', title: 'Mon Profil', icon: Users, href: '/settings/profile' },
  ],
  primaryNav: true,
},
```

`getVisibleNavItems(authData)` filtre `NAV_ITEMS` (items et enfants) selon `hasModuleAccess` et `visibilityCheck`, et c'est cette fonction filtrée qui alimente le composant Sidebar (`src/components/dashboard/Sidebar.tsx`) et le rendu des items (`src/components/navigation/SidebarItem.tsx`, `SubItemsPopover.tsx`). Un second fichier `src/config/navigationConfig.ts` existe également (à vérifier au moment de l'implémentation Kiosk — ne pas dupliquer dans le mauvais fichier).

---

## 4. Data fetching — pattern complet

### 4.1 Librairie

**TanStack React Query v5** exclusivement. Aucun usage de SWR ni de fetch/axios géré "à la main" dans les pages (sauf quelques pages plus anciennes comme `CustomersList.tsx` qui font du `useState` + appel direct au service — pattern legacy à ne pas reproduire).

### 4.2 QueryClientProvider

`src/App.tsx` :

```tsx
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    ...
  </QueryClientProvider>
);
```

Aucune configuration custom de `staleTime`/`gcTime`/`retry` au niveau global — comportement par défaut de React Query.

### 4.3 Query keys — factory centralisée

`src/lib/queryKeys.ts` — objet unique `qk`, une entrée par ressource, regroupant `all`, `list(filters)`, `detail(id)` et sous-ressources :

```ts
export const qk = {
  users: {
    all: ["users"] as const,
    list: (filters?: MerchantUserListFilters) => ["users", "list", filters ?? {}] as const,
    detail: (id: string) => ["users", "detail", id] as const,
    rights: (id: string) => ["users", "rights", id] as const,
  },
  printers: {
    all: ["printers"] as const,
    detail: (id: string) => ["printers", "detail", id] as const,
  },
  // ... planningEmployees, planningWeeks, planningShifts, etc.
} as const;
```

**Aucune query key inline en string brute** dans les pages — tout passe par `qk`.

### 4.4 Exemple complet — hook de query + mutation + invalidation

Tiré directement de `src/pages/PrintersTable.tsx` (le pattern le plus représentatif) :

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { printerService } from '@/services/printerService';

export default function PrintersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // QUERY — lecture
  const { data: printers = [], isLoading } = useQuery({
    queryKey: qk.printers.all,
    queryFn: () => printerService.getPrinters(),
  });

  // MUTATION — suppression
  const deleteMutation = useMutation({
    mutationFn: (id: string) => printerService.deletePrinter(id),
    onSuccess: () => {
      toast({ title: 'Imprimante supprimée' });
      queryClient.invalidateQueries({ queryKey: qk.printers.all }); // invalidation du cache
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer l'imprimante.",
        variant: 'destructive',
      });
    },
  });

  // appel : await deleteMutation.mutateAsync(id)
}
```

Et la mutation de création/édition, dans `src/components/settings/printers/PrinterFormSheet.tsx` :

```tsx
const mutation = useMutation({
  mutationFn: (payload: CreatePrinterRequest) =>
    isEditMode
      ? printerService.updatePrinter(printer!.id, payload)
      : printerService.createPrinter(payload),
  onSuccess: () => {
    toast({ title: isEditMode ? 'Imprimante mise à jour' : 'Imprimante ajoutée' });
    queryClient.invalidateQueries({ queryKey: qk.printers.all });
    onOpenChange(false); // ferme le Sheet
  },
  onError: () => {
    toast({
      title: 'Erreur',
      description: isEditMode ? "Impossible de mettre à jour l'imprimante." : "Impossible d'ajouter l'imprimante.",
      variant: 'destructive',
    });
  },
});
```

**Pattern à retenir :**
- Le hook de query est déclaré **inline dans la page**, pas dans un fichier de hook séparé, pour les ressources simples (CRUD basique). Des hooks dédiés (`useMenuData.ts`, `usePriceGridData.ts`...) existent pour des données composites/complexes — à utiliser seulement si la donnée Kiosk agrège plusieurs sources.
- Chaque mutation invalide systématiquement `qk.<ressource>.all` dans `onSuccess`.
- Chaque mutation affiche un toast de succès et un toast d'erreur via `useToast()`.
- `mutation.isPending` pilote l'état de chargement des boutons (spinner + `disabled`).

---

## 5. Client HTTP

### 5.1 Instanciation

Un seul fichier, **pas axios** : `src/services/apiClient.ts`, basé sur `fetch` natif, avec une fonction `request<T>()` interne et un objet exporté `apiClient` :

```ts
export const apiClient = {
  request,
  requestWithCustomToken,
  get<T>(endpoint, options) { return request<T>(endpoint, { ...options, method: "GET" }); },
  post<T>(endpoint, body, options) { return request<T>(endpoint, { ...options, method: "POST", body }); },
  patch<T>(endpoint, body, options) { return request<T>(endpoint, { ...options, method: "PATCH", body }); },
  put<T>(endpoint, body, options) { return request<T>(endpoint, { ...options, method: "PUT", body }); },
  delete<T>(endpoint, options) { return request<T>(endpoint, { ...options, method: "DELETE" }); },
};
```

`API_BASE_URL` vient de `import.meta.env.VITE_API_BASE_URL` (fallback sur l'URL de prod Render).

Enveloppe de réponse standard du backend :

```ts
export interface WelloApiResponse<T> {
  id: string;
  data: T;
}
```

→ chaque service "déballe" `.data` après l'appel (voir `printerService.getPrinters()`).

### 5.2 Injection du token d'auth

Pas d'intercepteur au sens axios — la fonction `request()` injecte manuellement le header à chaque appel :

```ts
const authToken = getAuthToken(); // lit le token stocké via getStoredAuthToken() (src/types/auth.ts)
if (!skipAuth && authToken) {
  requestHeaders["Authorization"] = `Bearer ${authToken}`;
}
```

Header additionnel systématique : `"X-App-Source": "backoffice"`.

Gestion **MFA** intégrée directement dans `request()` : si le serveur répond `401` avec `{ status: "mfa_required" }`, un `mfaHandler` (enregistré par `MFAContext` via `registerMFAHandler`) ouvre une modale OTP, attend sa résolution, puis **rejoue automatiquement la requête originale**.

### 5.3 Gestion globale des erreurs HTTP

`handleApiError(status, message)` mappe chaque code HTTP (400, 401, 403, 404, 500-504, défaut) vers un **toast** (titre + description + `variant: "destructive"`). Le 401 déclenche en plus `clearAuthAndRedirect()` (purge `localStorage.authData` + redirection forcée vers `/login`).

Les erreurs réseau (`TypeError: Failed to fetch`) déclenchent un toast dédié "Erreur de connexion" via `handleNetworkError()`.

Chaque erreur HTTP est aussi levée comme exception typée `ApiHttpError` (avec `status`, `responseBody`, `responseText`) pour permettre un traitement spécifique côté appelant si besoin (le mapping global suffit dans l'immense majorité des cas).

### 5.4 Affichage des erreurs à l'utilisateur

**Toasts**, via le hook `useToast()` (`src/hooks/use-toast.ts`, composant `src/components/ui/toast.tsx` + `Toaster` monté dans `App.tsx`). C'est le canal utilisé à la fois par `apiClient` (erreurs globales) et par chaque mutation (succès/erreur métier). Un second système de toast (`sonner`, importé comme `Sonner` dans `App.tsx`) est monté en parallèle mais semble peu utilisé directement dans les features — **préférer `useToast()` / `toast.tsx` (shadcn) pour rester cohérent avec le pattern Printers**.

### 5.5 Convention de nommage des fonctions d'appel API

Dans chaque `xxxService.ts`, un objet unique exporté du nom du service, avec des méthodes verbales `get*`, `create*`, `update*`, `delete*` :

```ts
export const printerService = {
  async getPrinters(): Promise<PrinterEntry[]> { ... },
  async createPrinter(data: CreatePrinterRequest): Promise<PrinterEntry> { ... },
  async updatePrinter(id: string, data: UpdatePrinterRequest): Promise<PrinterEntry> { ... },
  async deletePrinter(id: string): Promise<void> { ... },
};
```

---

## 6. État global

### 6.1 Contexts existants

| Context | Fichier | Rôle |
|---|---|---|
| `AuthContext` | `src/contexts/AuthContext.tsx` | `authData` (user + merchant + session + token), `setAuthData`, `logout`. Persisté en `localStorage` (`authData`). |
| `MFAContext` | `src/contexts/MFAContext.tsx` (+ `MFAContextDefinition.ts`, `useMFA.ts`) | Pilote l'ouverture de la modale OTP MFA, s'enregistre comme handler auprès de `apiClient` (`registerMFAHandler`). |
| `ProductCreateSheetContext` | `src/contexts/ProductCreateSheetContext.tsx` | Simple `isOpen`/`setIsOpen` pour ouvrir la sheet de création produit depuis n'importe où (ex. command palette). |
| `OrganizeModalContext` | `src/contexts/OrganizeModalContext.tsx` | Idem, pour une modale d'organisation/réorganisation. |
| `CommandPaletteProvider` | `src/components/command-palette/` | État de la palette de commandes (⌘K). |

Tous les providers sont montés dans `src/App.tsx`, imbriqués autour de `<BrowserRouter>`.

### 6.2 Global state vs query cache

- **Contexte global (React Context)** : uniquement des données transverses non liées à une ressource API paginée/listée — session utilisateur (`authData`), état d'UI partagé (ouverture de modales globales, MFA).
- **React Query cache** : **toute donnée venant du serveur** (listes, détails, ressources CRUD) — imprimantes, clients, produits, employés, etc. Aucun store Zustand/Redux dans le projet ; React Query fait office de "store serveur".

### 6.3 Propagation du contexte merchant/user

`AuthContext` expose `authData: AuthData | null`, lu via le hook `useAuth()` (export de `src/hooks/useAuth.ts`, wrapper de `useContext(AuthContext)`). `authData` contient `session.merchant_id`, `session.token`, le `user`, le `merchant` actif et ses capacités/modules (`AuthMerchant`, `ModuleCapability`). C'est `hasModuleAccess(authData, module)` (`src/lib/moduleAccess.ts`) qui centralise la vérification d'accès à une fonctionnalité — utilisé à la fois par `ProtectedRoute` (routing) et `getVisibleNavItems` (navigation).

---

## 7. Composants UI — patterns

### 7.1 Structure d'une page

Ordre observé de façon constante (`PrintersTable.tsx`, et la majorité des pages `pages/*Table.tsx`) :
1. Imports : hooks React, React Query, layout (`DashboardLayout`, `PageContainer`), composants `ui/*`, icônes lucide, `useToast`, `qk`, le service du domaine, les composants spécifiques à la feature, les types du domaine.
2. État local (`useState`) pour piloter les sheets/dialogs (open/closed + entité en cours d'édition/suppression).
3. `useQuery` pour charger les données.
4. `useMutation` pour chaque action d'écriture, avec `onSuccess`/`onError` standardisés.
5. Handlers (`handleAdd`, `handleEdit`, `handleDelete`, `handleDeleteConfirm`).
6. JSX : `<DashboardLayout><PageContainer header=... description=...>{...}</PageContainer></DashboardLayout>`, avec états `isLoading` / liste vide / liste remplie gérés explicitement (pas de composant `<EmptyState>` générique — re-codé à chaque page).
7. Composants de formulaire (`*FormSheet`) et de confirmation (`<ConfirmDialog>`) montés en dehors de `<PageContainer>`, pilotés par l'état local de la page.
8. `export default function NomDeLaPage() { ... }`.

### 7.2 Organisation des composants

- `components/ui/` : primitives shadcn/ui génériques, jamais liées à un domaine métier.
- `components/shared/` : composants génériques réutilisables entre features mais pas purement "design system" (`ProtectedRoute`, `PageContainer`, `ConfirmDialog`).
- `components/<domaine>/` : composants spécifiques à une feature (`components/settings/printers/PrinterFormSheet.tsx`, `components/menu/*`, `components/locations/*`).

### 7.3 Pattern de composition

Majoritairement **props drilling explicite** sur des composants contrôlés (`open`, `onOpenChange`, `printer`/entité en props) — pas de pattern de "slots" généralisé, peu de `children` composables hors des primitives shadcn/ui elles-mêmes (qui, elles, utilisent `Slot` de Radix en interne).

### 7.4 Formulaires

**react-hook-form + zod (`zodResolver`)** systématiquement. Schéma Zod déclaré en haut du fichier composant, avec `superRefine` pour les validations conditionnelles inter-champs (ex. : IP requise si connexion Wi-Fi, adresse Bluetooth requise sinon). Le formulaire est rendu via les composants `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` de `components/ui/form.tsx` (wrapper shadcn autour de react-hook-form).

### 7.5 Tableaux de données

Composant `Table`/`TableHeader`/`TableRow`/`TableCell` de shadcn/ui (`components/ui/table.tsx`), pas de DataTable générique avec tri/pagination/filtre intégrés — chaque page qui a besoin de tri/pagination/recherche les réimplémente à la main (cf. `CustomersList.tsx`). **Pour une nouvelle feature simple (Kiosk), suivre le pattern Printers (table statique sans tri/pagination) sauf si le volume de données l'exige.**

### 7.6 Modals / dialogs

Deux patterns selon le besoin :
- **`Sheet`** (panneau latéral, `components/ui/sheet.tsx`) pour les formulaires de création/édition — ex. `PrinterFormSheet`.
- **`ConfirmDialog`** (`components/shared/ConfirmDialog.tsx`, basé sur `AlertDialog` de Radix) pour les confirmations destructives, avec props `open`, `onOpenChange`, `title`, `description`, `isDangerous`, `isLoading`, `onConfirm`.

### 7.7 Toasts / notifications

`useToast()` (`src/hooks/use-toast.ts`) → `toast({ title, description?, variant?: 'destructive' })`. Rendu par `<Toaster />` (shadcn) monté une seule fois dans `App.tsx`. C'est le canal standard utilisé par tous les services/mutations.

### 7.8 Exemple de page complète (structure)

`src/pages/PrintersTable.tsx` (167 lignes, copié intégralement en section 9.3) est **le meilleur exemple représentatif et le plus proche du besoin Kiosk** — table + sheet de formulaire + dialog de confirmation de suppression, entièrement piloté par React Query.

---

## 8. Typage TypeScript

### 8.1 Emplacement des types

`src/types/<domaine>.ts` — un fichier par domaine fonctionnel, **co-localisation par domaine, pas par composant**. Pas de génération automatique de types depuis l'API (pas d'OpenAPI/swagger codegen détecté) — les types sont écrits à la main en miroir du contrat backend.

### 8.2 Convention de nommage

- Entité retournée par l'API : `<Domaine>Entry` (`PrinterEntry`) — pas `<Domaine>` seul, pour distinguer l'entité persistée des payloads.
- Payload de création : `Create<Domaine>Request`.
- Payload de mise à jour : `Update<Domaine>Request` (souvent un simple alias du `Create...Request` si la forme est identique : `export type UpdatePrinterRequest = CreatePrinterRequest;`).
- Enums métier : type union de chaînes (pas d'`enum` TS), valeurs alignées sur les valeurs renvoyées par l'API (snake_case) : `export type PrinterRole = "caisse" | "production" | ...`.
- Labels d'affichage français pour chaque valeur d'enum, dans un `Record<EnumType, string>` exporté à côté du type : `printerRoleLabels`, `printerConnectionTypeLabels`.

### 8.3 Typage des réponses API

Toute réponse passe par l'enveloppe générique `WelloApiResponse<T>` (`{ id: string; data: T }`) définie dans `apiClient.ts`, et chaque méthode de service type explicitement son retour :

```ts
async getPrinters(): Promise<PrinterEntry[]> {
  const response = await apiClient.get<WelloApiResponse<PrinterEntry[]>>("/printers");
  return response.data;
}
```

---

## 9. Feature de référence pour le module Kiosk : **Printers**

C'est, dans la base de code actuelle, la feature la plus proche de ce que sera Kiosk : **gestion d'appareils** rattachés à l'établissement (liste, création, édition, suppression, configuration de connexion). Elle constitue le **template direct** à suivre.

### 9.1 Fichiers impliqués (liste exhaustive)

| Fichier | Rôle |
|---|---|
| `src/types/printers.ts` | Types (`PrinterEntry`, `CreatePrinterRequest`, `UpdatePrinterRequest`), enums (`PrinterConnectionType`, `PrinterRole`, `PrinterLanguage`), labels (`printerRoleLabels`, `printerConnectionTypeLabels`) |
| `src/services/printerService.ts` | Appels API (`getPrinters`, `createPrinter`, `updatePrinter`, `deletePrinter`) |
| `src/pages/PrintersTable.tsx` | Page liste — query + mutations + table + orchestration des sheets/dialogs |
| `src/components/settings/printers/PrinterFormSheet.tsx` | Sheet de création/édition — react-hook-form + zod + mutation create/update |
| `src/lib/queryKeys.ts` (entrée `printers`) | Clés de cache React Query |
| `src/config/navConfig.ts` (entrée `printers` sous `settings`) | Entrée de navigation latérale |
| `src/App.tsx` (route `/settings/printers`) | Déclaration de route |
| `src/components/shared/ConfirmDialog.tsx` (réutilisé, pas spécifique) | Confirmation de suppression |

### 9.2 Types — `src/types/printers.ts` (intégral)

```ts
export type PrinterConnectionType = "wifi" | "bluetooth";

export type PrinterRole =
  | "caisse"
  | "production"
  | "caisse_et_production"
  | "label_haccp"
  | "label_production"
  | "label_haccp_et_production";

export type PrinterLanguage = "escpos" | "zpl";

export const printerRoleLabels: Record<PrinterRole, string> = {
  caisse: "Caisse",
  production: "Production",
  caisse_et_production: "Caisse + Production",
  label_haccp: "Étiquettes HACCP",
  label_production: "Étiquettes Production",
  label_haccp_et_production: "Étiquettes HACCP + Production",
};

export const printerConnectionTypeLabels: Record<PrinterConnectionType, string> = {
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
};

export interface PrinterEntry {
  id: string;
  name: string;
  connection_type: PrinterConnectionType;
  ip_address: string | null;
  port: number | null;
  bluetooth_address: string | null;
  language: PrinterLanguage;
  role: PrinterRole;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePrinterRequest {
  name: string;
  connection_type: PrinterConnectionType;
  ip_address?: string;
  port?: number;
  bluetooth_address?: string;
  role: PrinterRole;
}

export type UpdatePrinterRequest = CreatePrinterRequest;
```

### 9.3 Service — `src/services/printerService.ts` (intégral)

```ts
import { apiClient, WelloApiResponse } from "@/services/apiClient";
import type { CreatePrinterRequest, PrinterEntry, UpdatePrinterRequest } from "@/types/printers";

export const printerService = {
  async getPrinters(): Promise<PrinterEntry[]> {
    const response = await apiClient.get<WelloApiResponse<PrinterEntry[]>>("/printers");
    return response.data;
  },

  async createPrinter(data: CreatePrinterRequest): Promise<PrinterEntry> {
    const response = await apiClient.post<WelloApiResponse<PrinterEntry>>("/printers", data);
    return response.data;
  },

  async updatePrinter(id: string, data: UpdatePrinterRequest): Promise<PrinterEntry> {
    const response = await apiClient.patch<WelloApiResponse<PrinterEntry>>(`/printers/${id}`, data);
    return response.data;
  },

  async deletePrinter(id: string): Promise<void> {
    await apiClient.delete<void>(`/printers/${id}`);
  },
};
```

### 9.4 Page liste — `src/pages/PrintersTable.tsx` (intégral)

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Printer as PrinterIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { printerService } from '@/services/printerService';
import { PrinterFormSheet } from '@/components/settings/printers/PrinterFormSheet';
import { printerRoleLabels, type PrinterEntry } from '@/types/printers';

export default function PrintersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterEntry | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState<PrinterEntry | undefined>(undefined);

  const { data: printers = [], isLoading } = useQuery({
    queryKey: qk.printers.all,
    queryFn: () => printerService.getPrinters(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => printerService.deletePrinter(id),
    onSuccess: () => {
      toast({ title: 'Imprimante supprimée' });
      queryClient.invalidateQueries({ queryKey: qk.printers.all });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer l'imprimante.",
        variant: 'destructive',
      });
    },
  });

  const handleAdd = () => {
    setEditingPrinter(undefined);
    setFormOpen(true);
  };

  const handleEdit = (printer: PrinterEntry) => {
    setEditingPrinter(printer);
    setFormOpen(true);
  };

  const handleDelete = (printer: PrinterEntry) => {
    setPrinterToDelete(printer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!printerToDelete) return;
    await deleteMutation.mutateAsync(printerToDelete.id);
    setDeleteDialogOpen(false);
    setPrinterToDelete(undefined);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Imprimantes</h1>
            <Button className="bg-gradient-primary" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une imprimante
            </Button>
          </div>
        }
        description="Gérez les imprimantes de votre établissement"
      >
        {isLoading ? (
          <p className="text-muted-foreground">Chargement des imprimantes...</p>
        ) : printers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <PrinterIcon className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune imprimante configurée pour le moment</p>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une imprimante
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Connexion</TableHead>
                  <TableHead>Langue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((printer) => (
                  <TableRow key={printer.id}>
                    <TableCell className="font-medium">{printer.name}</TableCell>
                    <TableCell>{printerRoleLabels[printer.role]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {printer.connection_type === 'wifi'
                        ? `Wi-Fi · ${printer.ip_address}:${printer.port}`
                        : `Bluetooth · ${printer.bluetooth_address}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {printer.language === 'zpl' ? 'ZPL' : 'ESC/POS'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(printer)} title="Éditer l'imprimante">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(printer)} title="Supprimer l'imprimante">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContainer>

      <PrinterFormSheet open={formOpen} onOpenChange={setFormOpen} printer={editingPrinter} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer une imprimante"
        description={`Supprimer l'imprimante "${printerToDelete?.name}" ?`}
        isDangerous
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}
```

### 9.5 Composant formulaire — `src/components/settings/printers/PrinterFormSheet.tsx` (intégral)

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { printerService } from '@/services/printerService';
import {
  printerConnectionTypeLabels, printerRoleLabels,
  type CreatePrinterRequest, type PrinterEntry, type PrinterRole,
} from '@/types/printers';

const LABEL_ROLES: PrinterRole[] = ['label_haccp', 'label_production', 'label_haccp_et_production'];

const formSchema = z
  .object({
    name: z.string().min(1, 'Le nom est requis'),
    connection_type: z.enum(['wifi', 'bluetooth']),
    ip_address: z.string().optional(),
    port: z.coerce.number().optional(),
    bluetooth_address: z.string().optional(),
    role: z.enum(['caisse', 'production', 'caisse_et_production', 'label_haccp', 'label_production', 'label_haccp_et_production']),
  })
  .superRefine((values, ctx) => {
    if (values.connection_type === 'wifi' && !values.ip_address?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ip_address'], message: "L'adresse IP est requise" });
    }
    if (values.connection_type === 'bluetooth' && !values.bluetooth_address?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bluetooth_address'], message: "L'adresse MAC est requise" });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface PrinterFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printer?: PrinterEntry;
}

export function PrinterFormSheet({ open, onOpenChange, printer }: PrinterFormSheetProps) {
  const isEditMode = Boolean(printer);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', connection_type: 'wifi', ip_address: '', port: 9100, bluetooth_address: '', role: 'caisse' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: printer?.name ?? '',
        connection_type: printer?.connection_type ?? 'wifi',
        ip_address: printer?.ip_address ?? '',
        port: printer?.port ?? 9100,
        bluetooth_address: printer?.bluetooth_address ?? '',
        role: printer?.role ?? 'caisse',
      });
    }
  }, [open, printer, form]);

  const connectionType = form.watch('connection_type');
  const role = form.watch('role');
  const isLabelRole = LABEL_ROLES.includes(role);

  const mutation = useMutation({
    mutationFn: (payload: CreatePrinterRequest) =>
      isEditMode ? printerService.updatePrinter(printer!.id, payload) : printerService.createPrinter(payload),
    onSuccess: () => {
      toast({ title: isEditMode ? 'Imprimante mise à jour' : 'Imprimante ajoutée' });
      queryClient.invalidateQueries({ queryKey: qk.printers.all });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: isEditMode ? "Impossible de mettre à jour l'imprimante." : "Impossible d'ajouter l'imprimante.",
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: CreatePrinterRequest = {
      name: values.name.trim(),
      connection_type: values.connection_type,
      role: values.role,
      ...(values.connection_type === 'wifi'
        ? { ip_address: values.ip_address?.trim(), port: values.port }
        : { bluetooth_address: values.bluetooth_address?.trim() }),
    };
    mutation.mutate(payload);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Modifier l'imprimante" : 'Nouvelle imprimante'}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Modifiez les informations de l'imprimante." : 'Ajoutez une imprimante à votre établissement.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl><Input placeholder="Imprimante caisse 1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="connection_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de connexion</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(printerConnectionTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {connectionType === 'wifi' ? (
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="ip_address" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Adresse IP</FormLabel>
                      <FormControl><Input placeholder="192.168.1.50" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="port" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <FormField control={form.control} name="bluetooth_address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse MAC</FormLabel>
                    <FormControl><Input placeholder="00:11:22:33:44:55" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(printerRoleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {isLabelRole ? 'Cette imprimante utilisera le protocole ZPL (étiquettes)' : "Cette imprimante utilisera le protocole ESC/POS (tickets thermiques)"}
                  </p>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 9.6 Comment les actions sont implémentées

- **Créer/Éditer** : un seul composant `PrinterFormSheet`, contrôlé en `open`/`onOpenChange`, recevant l'entité à éditer en prop optionnelle (`printer?: PrinterEntry`). `isEditMode = Boolean(printer)` détermine si la mutation appelle `create` ou `update`. Le formulaire se réinitialise (`form.reset(...)`) à chaque ouverture via `useEffect([open, printer])`.
- **Activer/Désactiver** (pattern à transposer pour Kiosk — pas présent tel quel sur Printers mais déductible) : suivre exactement le pattern de `deleteMutation` — une `useMutation` dédiée appelant `printerService.updatePrinter(id, { enabled: !current })` (ou un endpoint `PATCH /kiosks/:id/enable`), avec invalidation de `qk.kiosks.all` dans `onSuccess`.
- **Supprimer** : flux en deux temps — `handleDelete(entity)` ouvre `ConfirmDialog` en stockant l'entité ciblée dans un state local (`printerToDelete`), puis `handleDeleteConfirm` appelle `mutateAsync` et ferme le dialog. Aucune suppression directe au clic — toujours confirmation.

---

## 10. Règles à respecter pour le module Kiosk

### 10.1 Convention de nommage
- Type entité : `KioskEntry` (pas `Kiosk` seul).
- Payloads : `CreateKioskRequest`, `UpdateKioskRequest` (alias de `CreateKioskRequest` si même forme).
- Enums métier : type union string (snake_case), pas d'`enum` TypeScript natif.
- Labels d'affichage : `Record<EnumType, string>` exporté à côté de l'enum, dans le même fichier de types.
- Service : `kioskService` (objet), fichier `src/services/kioskService.ts`, méthodes `getKiosks`, `createKiosk`, `updateKiosk`, `deleteKiosk` (+ `toggleKioskEnabled` ou équivalent si l'API expose une action dédiée d'activation).
- Page : `src/pages/KiosksTable.tsx`, export default nommé après le fichier.
- Composant formulaire : `src/components/settings/kiosks/KioskFormSheet.tsx`.

### 10.2 Structure d'un nouveau fichier de page
1. Imports dans l'ordre : React/hooks → React Query → layout (`DashboardLayout`, `PageContainer` depuis `@/components/shared`) → composants `ui/*` → icônes lucide → `useToast` → `qk` → service du domaine → composants spécifiques → types du domaine.
2. `useState` pour piloter sheets/dialogs (open + entité courante).
3. `useQuery({ queryKey: qk.kiosks.all, queryFn: () => kioskService.getKiosks() })`.
4. Une `useMutation` par action d'écriture, chacune avec `onSuccess` → toast + `queryClient.invalidateQueries({ queryKey: qk.kiosks.all })`, et `onError` → toast `variant: 'destructive'`.
5. JSX dans `<DashboardLayout><PageContainer header={...} description={...}>`, avec gestion explicite de `isLoading` / liste vide / liste pleine.
6. Sheet de formulaire + `ConfirmDialog` de suppression montés après `</PageContainer>`, pilotés par l'état local.

### 10.3 Structure d'un nouveau hook de data fetching
Pour une ressource CRUD simple comme Kiosk, **ne pas créer de hook dédié** — déclarer `useQuery`/`useMutation` directement dans la page, comme Printers. Ne créer un hook séparé (`useKioskData.ts` dans `src/hooks/`) que si plusieurs pages partagent exactement la même requête, ou si la donnée agrège plusieurs appels API (cf. `useMenuData.ts`).

### 10.4 Déclarer une nouvelle route
Dans `src/App.tsx` :
1. Ajouter l'import de la page en haut du fichier, dans le bloc d'imports de pages (regroupé par section commentée, ex. `{/* Administration */}`).
2. Ajouter la route dans le bloc `<Routes>` existant, enveloppée dans `<ProtectedRoute>` :
   ```tsx
   <Route path="/settings/kiosks" element={<ProtectedRoute><KiosksTable /></ProtectedRoute>} />
   ```
3. Si Kiosk doit être conditionné à une capacité merchant, ajouter la valeur au type `ModuleCapability` (`src/types/auth.ts`) et passer `requiredModule="kiosk"`.

### 10.5 Ajouter une entrée dans la navigation latérale
Dans `src/config/navConfig.ts`, ajouter un `NavChild` dans le tableau `children` de l'item `settings` (id `'settings'`) :
```ts
{
  id: 'kiosks',
  title: 'Kiosks',
  icon: <IconeLucideAppropriee>, // importer depuis 'lucide-react' en haut du fichier
  href: '/settings/kiosks',
},
```
Ne pas oublier d'importer l'icône choisie dans le bloc d'import lucide-react en tête de fichier. Vérifier aussi `src/config/navigationConfig.ts` (fichier de config de navigation alternatif détecté) pour s'assurer qu'il n'est pas la source réellement consommée par le composant Sidebar avant de dupliquer l'entrée au mauvais endroit.

### 10.6 Typer une réponse API
- Toujours typer le retour de service via l'enveloppe générique : `apiClient.get<WelloApiResponse<KioskEntry[]>>("/kiosks")`, puis retourner `response.data`.
- Ne jamais retourner le type enveloppe brut (`WelloApiResponse<T>`) depuis un service — toujours déballer `.data` dans le service, pour que les pages consomment directement `KioskEntry[]` / `KioskEntry`.
- Ajouter l'entrée correspondante dans `qk` (`src/lib/queryKeys.ts`) avant d'écrire la page : `kiosks: { all: ["kiosks"] as const, detail: (id: string) => ["kiosks", "detail", id] as const }`.

### 10.7 Anti-patterns observés à ne pas reproduire
- ❌ Query keys en chaînes inline (`useQuery({ queryKey: ['kiosks'], ... })`) — toujours passer par `qk`.
- ❌ Appeler `fetch`/`axios` directement depuis une page ou un composant — toujours passer par un service dédié qui utilise `apiClient`.
- ❌ Gérer le fetching avec `useState` + `useEffect` + appel direct au service (pattern legacy visible dans `CustomersList.tsx`) — pour toute nouvelle feature, **utiliser React Query**, pas ce pattern.
- ❌ Dupliquer la logique de toast d'erreur dans chaque composant au lieu de laisser `apiClient`/`handleApiError` gérer le cas générique — ne personnaliser le toast d'erreur dans la mutation que pour un message métier plus précis que le message HTTP générique.
- ❌ Oublier d'invalider `qk.kiosks.all` après une mutation d'écriture — la liste resterait périmée jusqu'au prochain remount/refetch manuel.
- ❌ Créer un store Zustand/Redux pour des données serveur — ce projet n'a aucun store de ce type ; toute donnée serveur doit vivre dans le cache React Query.
- ❌ Mélanger les responsabilités entité/payload dans un seul type (`KioskEntry` utilisé aussi comme corps de requête) — toujours distinguer `KioskEntry` (lecture) de `CreateKioskRequest`/`UpdateKioskRequest` (écriture), même si leur forme est proche.
- ❌ Importer des icônes depuis une autre lib que `lucide-react`, ou utiliser une lib de composants autre que les primitives shadcn/ui déjà présentes dans `components/ui/`.

---

**Sections complétées : 10 / 10**
**Fichier généré : `docs/ARCHITECTURE_BACKOFFICE.md`**
