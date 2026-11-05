# Plan de salle — éditeur en brouillon

L'éditeur (`/locations`) ne modifie pas le plan route par route. Tout ce que fait
l'utilisateur (poser une table, déplacer un mur, supprimer un étage…) agit sur un
**brouillon local** annulable ; **« Publier »** envoie le différentiel complet en une
transaction (`POST /locations/plan/publish`, tout ou rien). Contrat de l'API :
`docs/plan-de-salle-publication.md` dans `ib-welloresto-api`.

## Architecture

| Couche | Fichiers | Rôle |
|---|---|---|
| Modèle pur | `src/lib/floorplan/` | Sans React ni Konva, entièrement testé (`__tests__/`) |
| ↳ `reducer.ts` | | État du brouillon : ids temporaires `tmp_…`, annuler/rétablir (100 niveaux, frappes fusionnées), duplication, cascade à la suppression d'un étage |
| ↳ `diff.ts` | | Brouillon vs publié → payload de l'API (mises à jour seulement si un champ a changé, tolérance 0,05) |
| ↳ `validation.ts` | | Mêmes bornes que l'API (nom de table ≤ 20, d'étage ≤ 50, tailles…) ; bloque « Publier » avec un message précis |
| ↳ `geometry.ts` | | Emprises après rotation, chevauchement exact (SAT), accrochage porte/fenêtre sur un mur, segments de mur |
| ↳ `tools.ts`, `viewport.ts`, `align.ts` | | Où un outil pose son élément ; zoom/déplacement ; alignement/répartition |
| ↳ `obstacleCatalog.ts` | | Catalogue : mur, porte, fenêtre, escalier, plante, bar, pilier |
| Service | `src/services/locationsService.ts` | Frontière avec l'API : snake_case ↔ camelCase, ids numériques → chaînes, valeurs par défaut des champs `omitempty`, erreurs de publication en français ; mode mock |
| Hook | `src/hooks/useFloorPlan.ts`, `useFloorPlanShortcuts.ts` | Reducer + chargement + publication + conflit + presse-papiers |
| UI | `src/components/locations/` | `FloorPlanEditor` (assemblage), `FloorPlanCanvas` (Konva), formes, barre d'outils, panneaux |

Coordonnées (canvas virtuel 1000×1000, inchangé) : une **table** a pour `x`/`y` son coin
haut-gauche, un **obstacle** son centre ; les deux pivotent autour de leur centre.

## Points d'attention

- **Contrat avec l'API.** `GET /locations` renvoie `x`, `y`, `angle`, `width`, `height`, `shape`
  en `omitempty` (une table à l'angle 0 arrive sans `angle`) et aucun `enabled`. Le service
  comble ces valeurs ; le test `locationsService.test.ts` lit la **sortie réelle du Go**
  (`__tests__/fixtures/locationsResponse.json`) et vérifie qu'un plan fraîchement chargé n'a
  aucune modification. Dans l'autre sens, l'API décode strictement un payload produit par ce
  front (`internal/modules/locations/testdata/publish_request_from_front.json`).
- **Conflit de révision.** `GET /locations` renvoie `revision` ; la publication la renvoie en
  `base_revision`. Si quelqu'un a publié entre-temps : 409, boîte « Le plan a été modifié
  entre-temps » (recharger ou garder le brouillon).
- **Double-clic.** Le `dblclick` de Konva ne regarde que le temps ; la fin d'un mur / d'une zone
  exige deux clics rapprochés dans le temps **et** l'espace (`FloorPlanCanvas`).
- **Zones** : conservées et masquées (`SHOW_ZONES` dans `ToolBar.tsx`) ; les obstacles sont actifs.
- **Le POS Flutter** n'affiche pas les obstacles : à adapter (types `wall`, `door`, `window`,
  `stairs`, `plant`, `bar`, `pillar`).

## Raccourcis

Ctrl+Z / Ctrl+Maj+Z annuler/rétablir · Ctrl+S publier · Suppr · Ctrl+D dupliquer · Ctrl+C/V ·
Ctrl+A · flèches (grille ; Maj : 1 unité) · Maj+clic · Alt+glisser (sans grille) · glisser sur le
fond (sélection au rectangle) · Espace+glisser ou molette-clic (déplacer) · molette ou +/− (zoom) ·
0 (ajuster) · Échap. Aide dans l'éditeur (icône clavier).

## Tests

`npx vitest run src/lib/floorplan src/services/__tests__/locationsService.test.ts`
