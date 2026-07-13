# Phase 0 — État des lieux wello-back-office

## Axe 2 — Éditeur back-office (react-konva)

> Rapport factuel, lecture seule. Aucun code n'a été modifié pour produire ce document.
> Repo audité : `wello-back-office` (racine `d:\Desktop\DTL\Project\git-projects\wello-back-office`).
> Backend cross-référencé en lecture seule : `ib-welloresto-api` (routes/handler/service/repository du module `locations`), pour vérifier l'existence et le comportement réel des endpoints appelés par le front.

---

### 1. Localisation

Deux générations de composants coexistent dans `src/components/locations/` et `src/pages/Locations.tsx`. Une seule est câblée sur la route active.

**Génération active (react-konva)** — importée par [src/pages/Locations.tsx](src/pages/Locations.tsx), route `/locations` déclarée dans [src/App.tsx:82](src/App.tsx#L82) :

| Fichier | Rôle | Imports konva |
|---|---|---|
| [src/components/locations/FloorPlanCanvas.tsx](src/components/locations/FloorPlanCanvas.tsx) | Stage/Layer principal, grille, boucle de rendu des tables | `import { Stage, Layer, Rect } from 'react-konva'` — [FloorPlanCanvas.tsx:2](src/components/locations/FloorPlanCanvas.tsx#L2) |
| [src/components/locations/TableShape.tsx](src/components/locations/TableShape.tsx) | Rendu d'une table (forme, couleur, drag) | `import { Circle, Rect, Group, Text } from 'react-konva'` — [TableShape.tsx:2](src/components/locations/TableShape.tsx#L2) |
| [src/components/locations/ToolBar.tsx](src/components/locations/ToolBar.tsx) | Boutons "Ajouter une table" (3 formes) | — |
| [src/components/locations/FloorSelector.tsx](src/components/locations/FloorSelector.tsx) | Dropdown étage + création d'étage | — |
| [src/components/locations/TablePropertiesPanel.tsx](src/components/locations/TablePropertiesPanel.tsx) | Panneau propriétés (nom, étage, places, forme, largeur/hauteur, rotation, suppression) | — |
| [src/hooks/useFloorPlan.ts](src/hooks/useFloorPlan.ts) | State machine : chargement, dirty-tracking, save/cancel | — |
| [src/services/locationsService.ts](src/services/locationsService.ts) | Appels API + mock data | — |

Aucun de ces fichiers n'importe `Transformer` de `react-konva` — confirmé par recherche exhaustive des imports konva dans le repo (seuls `Stage`, `Layer`, `Rect`, `Circle`, `Group`, `Text` sont utilisés).

**Génération legacy (react-rnd, non konva) — code mort** : ces fichiers existent mais ne sont importés par aucune page ni par la génération active (vérifié par recherche des imports de chaque nom de composant/fonction sur tout `src/`) :

| Fichier | Constat |
|---|---|
| [src/components/locations/FloorCanvas.tsx](src/components/locations/FloorCanvas.tsx) | Utilise `react-rnd` (`import { Rnd } from 'react-rnd'` — [FloorCanvas.tsx:2](src/components/locations/FloorCanvas.tsx#L2)), pas Konva. Opère sur des champs en pourcentage (`current_x`, `current_y`, `current_width`, `current_height`) absents du type `Location` actuel ([src/services/locationsService.ts:12-25](src/services/locationsService.ts#L12-L25)). Formes attendues `'Ellipse'` capitalisée ([FloorCanvas.tsx:104](src/components/locations/FloorCanvas.tsx#L104)), incompatible avec le type `TableShape = 'circle' \| 'rectangle' \| 'square'` ([locationsService.ts:10](src/services/locationsService.ts#L10)). |
| [src/components/locations/PropertiesPanel.tsx](src/components/locations/PropertiesPanel.tsx) | Panneau propriétés alternatif, lit `current_width`/`current_height`/`Ellipse`/`Rectangle` ([PropertiesPanel.tsx:80-122](src/components/locations/PropertiesPanel.tsx#L80-L122)) — même modèle de données obsolète. |
| [src/components/locations/FloorSidebar.tsx](src/components/locations/FloorSidebar.tsx) | Sidebar CRUD étages/tables alternative, appelle directement `createFloor`, `updateFloor`, `deleteFloor`, `createLocation`, `deleteLocation` du service ([FloorSidebar.tsx:6](src/components/locations/FloorSidebar.tsx#L6)) — c'est le **seul point du repo** qui appelle `updateFloor`/`deleteFloor` côté UI. |

`git log` confirme la chronologie : `FloorCanvas.tsx`/`PropertiesPanel.tsx`/`FloorSidebar.tsx` datent d'un commit "Changes" (2025-12-01), tandis que `FloorPlanCanvas.tsx`/`useFloorPlan.ts` proviennent du commit "feature: plan de salle" (2026-05-22) qui les a remplacés sans les supprimer.

---

### 2. Ce que l'éditeur actif permet aujourd'hui

- **Créer une table** : oui. Bouton dans [ToolBar.tsx:34-66](src/components/locations/ToolBar.tsx#L34-L66) (Ronde / Carrée / Rectangulaire) → `onAddTable` → `addLocation()` dans [useFloorPlan.ts:114-138](src/hooks/useFloorPlan.ts#L114-L138) → `createLocation()` service, appel réseau immédiat (pas de dirty state pour la création).

- **Déplacer une table** : oui, mais seulement si la table est déjà sélectionnée. `draggable={isSelected}` — [TableShape.tsx:133](src/components/locations/TableShape.tsx#L133). Le drag met à jour localement `x`/`y` via `onDragMove` → `handleDragMove` ([TableShape.tsx:44-51](src/components/locations/TableShape.tsx#L44-L51)) → `onLocationMove` prop → `updateLocationState(locationId, { x, y })` ([Locations.tsx:152-154](src/pages/Locations.tsx#L152-L154)). Aucun appel API pendant le drag ; la position est seulement marquée "dirty" ([useFloorPlan.ts:140-164](src/hooks/useFloorPlan.ts#L140-L164)). Clampage aux bornes du canvas 1000×1000 via `clampCoordinates` ([useFloorPlan.ts:50-55](src/hooks/useFloorPlan.ts#L50-L55)) et `dragBoundFunc` côté Konva ([TableShape.tsx:53-67](src/components/locations/TableShape.tsx#L53-L67)). Pas de snap-to-grid appliqué malgré la constante `GRID_SNAP = 20` déclarée ([useFloorPlan.ts:44](src/hooks/useFloorPlan.ts#L44)) — la fonction `snapToGrid` ([useFloorPlan.ts:46-48](src/hooks/useFloorPlan.ts#L46-L48)) est définie mais jamais appelée dans le fichier.

- **Redimensionner une table** : pas de poignées Konva (aucun `Transformer`). Le resize se fait uniquement via deux `Slider` (largeur, hauteur) dans le panneau de propriétés — [TablePropertiesPanel.tsx:187-217](src/components/locations/TablePropertiesPanel.tsx#L187-L217), bornés 40–300, pas de 10. Champs modifiés : `width`, `height`.

- **Pivoter une table** : oui, via `Slider` 0–359° (pas de 5), uniquement affiché si la forme n'est pas `circle` — [TablePropertiesPanel.tsx:220-234](src/components/locations/TablePropertiesPanel.tsx#L220-L234). Champ modifié : `angle`. Pas de poignée de rotation sur le canvas — la rotation est appliquée au rendu via la prop `rotation={location.angle}` du `Rect` Konva ([TableShape.tsx:108](src/components/locations/TableShape.tsx#L108) et [TableShape.tsx:122](src/components/locations/TableShape.tsx#L122)), jamais manipulée directement à la souris.

- **Éditer le nom** : oui, `Input` texte lié à `location_name` — [TablePropertiesPanel.tsx:84-92](src/components/locations/TablePropertiesPanel.tsx#L84-L92).

- **Éditer le nombre de places (`seats`)** : oui, stepper +/- borné 1–20 — [TablePropertiesPanel.tsx:76-79](src/components/locations/TablePropertiesPanel.tsx#L76-L79) et [113-150](src/components/locations/TablePropertiesPanel.tsx#L113-L150).

- **Choisir la forme (`shape`)** : oui, via `ToggleGroup` à 3 valeurs exclusives : `circle`, `square`, `rectangle` — [TablePropertiesPanel.tsx:155-183](src/components/locations/TablePropertiesPanel.tsx#L155-L183). Aucune valeur "ovale" n'est proposée. Changer de forme réinitialise `width`/`height` à des valeurs par défaut codées en dur (80×80 pour circle/square, 120×80 pour rectangle) — [TablePropertiesPanel.tsx:159-169](src/components/locations/TablePropertiesPanel.tsx#L159-L169).

- **`floor_areas`** : ni rendues, ni éditables. Aucune occurrence de `floor_areas`/`Area` côté front (recherche exhaustive sur `src/`, seules correspondances fortuites : placeholders texte "Terrasse" dans [FloorSidebar.tsx:264](src/components/locations/FloorSidebar.tsx#L264) et [FloorSelector.tsx:109](src/components/locations/FloorSelector.tsx#L109)). Le type `LocationsData` du service ne modélise que `floors` et `locations` — [locationsService.ts:27-33](src/services/locationsService.ts#L27-L33) — sans champ `areas`/`floor_areas`.

- **Créer/renommer/supprimer un étage (`floor`)** :
  - Créer : oui, via [FloorSelector.tsx:46-62](src/components/locations/FloorSelector.tsx#L46-L62) → `createFloor()` → `useFloorPlan.ts:92-101`.
  - Renommer / supprimer : les fonctions service existent (`updateFloor`, `deleteFloor` — [locationsService.ts:133-157](src/services/locationsService.ts#L133-L157)) mais **ne sont appelées par aucun composant actif**. Le seul appelant est [FloorSidebar.tsx](src/components/locations/FloorSidebar.tsx) (code mort, §1). Le hook `useFloorPlan` n'expose ni `updateFloor` ni `deleteFloor` dans son retour ([useFloorPlan.ts:242-261](src/hooks/useFloorPlan.ts#L242-L261)). **Dans l'UI réellement chargée sur `/locations`, il n'existe aucun moyen de renommer ou supprimer un étage.**

---

### 3. Appels API effectivement émis

Toutes les requêtes passent par `apiClient` avec bascule mock via `USE_MOCK_DATA` ([src/services/apiClient.ts:5](src/services/apiClient.ts#L5)). En local (`.env.local`) et en staging, `VITE_USE_MOCK=false` : les appels ci-dessous partent réellement vers l'API (`VITE_API_BASE_URL`, ex. `https://welloresto-api-staging.onrender.com`).

| Action UI | Méthode + URL | Source front | Endpoint backend correspondant |
|---|---|---|---|
| Charger le plan | `GET /locations` | [locationsService.ts:101-114](src/services/locationsService.ts#L101-L114) | `r.Get("/", locationsH.GetLocations)` sous `/locations` — [routes.go:921-924](../ib-welloresto-api/cmd/api/routes.go#L921-L924) |
| Créer étage | `POST /floors` | [locationsService.ts:116-131](src/services/locationsService.ts#L116-L131) | `r.Post("/", locationsH.CreateFloor)` — [routes.go:912-915](../ib-welloresto-api/cmd/api/routes.go#L912-L915) |
| Renommer étage | `PATCH /floors/{floorId}` | [locationsService.ts:133-145](src/services/locationsService.ts#L133-L145) (non utilisé par l'UI active, §2) | `r.Patch("/{floor_id}", ...)` — [routes.go:916](../ib-welloresto-api/cmd/api/routes.go#L916) |
| Supprimer étage | `DELETE /floors/{floorId}` | [locationsService.ts:147-157](src/services/locationsService.ts#L147-L157) (non utilisé par l'UI active, §2) | `r.Delete("/{floor_id}", ...)` — [routes.go:917](../ib-welloresto-api/cmd/api/routes.go#L917) |
| Créer table | `POST /locations/floors/{floor_id}/tables` | [locationsService.ts:159-182](src/services/locationsService.ts#L159-L182) | `r.Post("/floors/{floor_id}/tables", ...)` — [routes.go:927](../ib-welloresto-api/cmd/api/routes.go#L927) |
| Déplacer / redimensionner / pivoter / renommer / seats / forme (save) | `PATCH /locations/tables/{locationId}` — payload unique `{ location_name, seats, floor_id, shape, angle, x, y, width, height, enabled }` | [locationsService.ts:184-196](src/services/locationsService.ts#L184-L196), déclenché par `saveChanges()` — [useFloorPlan.ts:184-224](src/hooks/useFloorPlan.ts#L184-L224) | `r.Patch("/tables/{location_id}", ...)` — [routes.go:928](../ib-welloresto-api/cmd/api/routes.go#L928) |
| Supprimer table | `DELETE /locations/tables/{locationId}` | [locationsService.ts:198-207](src/services/locationsService.ts#L198-L207) | `r.Delete("/tables/{location_id}", ...)` — [routes.go:929](../ib-welloresto-api/cmd/api/routes.go#L929) |

**`PATCH /locations/{id}/coordinates` distinct** : n'existe pas. Ni le front ni le back n'exposent de route dédiée aux coordonnées seules — le déplacement passe par le même `PATCH /locations/tables/{locationId}` généraliste que le reste des propriétés (nom, forme, places…), confirmé par `updateLocation()` unique dans [locationsService.ts:184-196](src/services/locationsService.ts#L184-L196) et par la table de routes complète du module `locations` dans [routes.go:921-930](../ib-welloresto-api/cmd/api/routes.go#L921-L930) (aucune route `/coordinates`).

**`PATCH`/`DELETE /floors/{id}`** : les routes existent et sont câblées côté backend jusqu'au repository ([internal/modules/locations/repository.go:247-303](../ib-welloresto-api/internal/modules/locations/repository.go#L247-L303)) :
- `UpdateFloor` retourne `models.ErrFloorNotFound` si l'étage n'existe pas pour le marchand (0 ligne affectée après vérification) — [repository.go:258-270](../ib-welloresto-api/internal/modules/locations/repository.go#L258-L270).
- `DeleteFloor` retourne `models.ErrFloorNotEmpty` si des tables actives y sont encore rattachées, sinon `models.ErrFloorNotFound` si l'étage n'existe pas — [repository.go:275-303](../ib-welloresto-api/internal/modules/locations/repository.go#L275-L303).
- Ces routes ne semblent donc pas être des stubs cassés côté backend ; elles sont simplement **inatteignables depuis l'UI active du BO** (§2), puisque seul le composant mort `FloorSidebar.tsx` les appelle.

**Aucun appel commenté ou visiblement mort trouvé** dans le chemin actif (`Locations.tsx` → `useFloorPlan.ts` → `locationsService.ts`). Le seul TODO relevé concerne l'état d'occupation, non l'API de sauvegarde : `isOccupied={false} // TODO: Get from orders API` — [FloorPlanCanvas.tsx:132](src/components/locations/FloorPlanCanvas.tsx#L132) (la disponibilité réelle des tables, pourtant renvoyée par le backend via `available`/`open_order_id`, n'est pas consommée par le canvas actuel).

---

### 4. Ce qui manque pour la refonte (constat factuel)

- **UI de combinaisons de tables** (sélection multiple → groupe nommé) : absente. Aucune sélection multiple sur le canvas (`onLocationSelect` ne gère qu'un seul `selectedLocationId: string | null` — [useFloorPlan.ts:16](src/hooks/useFloorPlan.ts#L16)), aucune notion de groupe dans le type `Location` ([locationsService.ts:12-25](src/services/locationsService.ts#L12-L25)).
- **Palette d'obstacles** (mur, bar, escaliers, porte) : absente. `ToolBar.tsx` ne propose que 3 formes de table ([ToolBar.tsx:34-66](src/components/locations/ToolBar.tsx#L34-L66)), aucun autre type d'élément.
- **Sélecteur de forme enrichi (ovale)** : absent. `TableShape` du service ([locationsService.ts:10](src/services/locationsService.ts#L10)) et le `ToggleGroup` de propriétés ([TablePropertiesPanel.tsx:155-183](src/components/locations/TablePropertiesPanel.tsx#L155-L183)) se limitent à `circle`/`square`/`rectangle`.
- **Checkboxes d'attributs** (PMR, terrasse, VIP, fenêtre) : absentes. Le type `Location` n'a aucun champ attribut au-delà de `enabled` (booléen d'activation, pas un attribut métier) — [locationsService.ts:12-25](src/services/locationsService.ts#L12-L25).
- **Édition des `floor_areas`** (nom, règles) : absente, cf. §2 — aucune donnée `Area`/`floor_areas` n'est chargée ni affichée côté front.

---

### 5. Gestion du "dirty state"

- Pas d'auto-save. Sauvegarde explicite par bouton "Sauvegarder" dans le header de la page — [Locations.tsx:69-81](src/pages/Locations.tsx#L69-L81), désactivé si `!hasUnsavedChanges()`.
- Bouton "Annuler" symétrique qui restaure l'état d'origine — [Locations.tsx:60-68](src/pages/Locations.tsx#L60-L68) → `cancelChanges()` — [useFloorPlan.ts:226-231](src/hooks/useFloorPlan.ts#L226-L231).
- Tracking : `dirtyLocations: Set<string>` dans le hook — toute mutation locale (déplacement, resize, rotation, renommage, changement de forme/places) passe par `updateLocationState()` qui ajoute l'id à ce Set — [useFloorPlan.ts:140-164](src/hooks/useFloorPlan.ts#L140-L164). Une copie profonde de l'état d'origine est conservée dans `originalLocations` pour permettre l'annulation — [useFloorPlan.ts:67](src/hooks/useFloorPlan.ts#L67), [useFloorPlan.ts:75](src/hooks/useFloorPlan.ts#L75).
- `saveChanges()` envoie un `PATCH /locations/tables/{id}` par table "dirty" en parallèle (`Promise.all`), puis réinitialise `dirtyLocations` et `originalLocations` — [useFloorPlan.ts:184-224](src/hooks/useFloorPlan.ts#L184-L224). Un compteur de modifications non enregistrées est affiché dans l'en-tête — [Locations.tsx:76-80](src/pages/Locations.tsx#L76-L80) et [Locations.tsx:86-90](src/pages/Locations.tsx#L86-L90).
- Exception au dirty-tracking : la **création** (`addLocation`) et la **suppression** (`deleteLocationAction`) de table appellent l'API immédiatement, sans passer par le bouton "Sauvegarder" — [useFloorPlan.ts:114-138](src/hooks/useFloorPlan.ts#L114-L138) et [useFloorPlan.ts:166-182](src/hooks/useFloorPlan.ts#L166-L182). Seules les modifications de propriétés d'une table existante (position, forme, dimensions, rotation, nom, places, étage) sont différées.

---

### 6. Dépendances et versions

Depuis [package.json](package.json) :

- `react-konva`: `^18.2.14` — [package.json:62](package.json#L62)
- `konva`: `^10.2.3` — [package.json:55](package.json#L55)
- `react-rnd`: `^10.5.2` — [package.json:65](package.json#L65) (utilisé uniquement par la génération legacy morte, §1)
- Pas de `react-dnd`/`@dnd-kit` utilisé par l'éditeur de plan de salle : `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` sont bien présents ([package.json:14-16](package.json#L14-L16)) mais servent à d'autres écrans (aucune référence à ces packages dans `src/components/locations/` ou `src/hooks/useFloorPlan.ts`).
- Autres libs UI utilisées par l'éditeur : `@radix-ui/react-slider` (rotation/dimensions), `@radix-ui/react-toggle-group` (sélecteur de forme), `@radix-ui/react-select` (étage), `sonner` (toasts) — toutes visibles dans les imports de [TablePropertiesPanel.tsx](src/components/locations/TablePropertiesPanel.tsx) et [FloorSelector.tsx](src/components/locations/FloorSelector.tsx).
