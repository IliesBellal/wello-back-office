# Phase 8 — Écran de vérification et commit (back-office)

Phase 8 de la feature « Importer des produits ». Elle transforme le récapitulatif stub de la phase 7 en
**écran de vérification éditable** qui construit l'`ImportDecisions` et déclenche `POST /menu/import/commit`.

Amont : [phase 7](import-produits-phase7-hub.md) (hub, upload, prévisualisation en état). La saisie en masse
(phase 9) n'est pas dans ce lot.

## 1. Un bug de contrat corrigé côté API d'abord

`ImportDecisions` n'avait **aucun tag JSON** côté Go : l'API émettait `decisions.TagClassification` en
PascalCase, alors que tout le reste du contrat d'import est en snake_case. Le type TS de la phase 7 déclarait
snake_case — c'était faux, mais invisible tant que le front ne lisait que `summary` et `warnings`.

Corrigé par un commit distinct sur `ib-welloresto-api` (`fix(menu): tags JSON snake_case sur
ImportDecisions`), avec un test qui verrouille les quatre clés et l'aller-retour complet. Sans risque :
`encoding/json` ignore la casse au démarshalage, les snapshots Redis déjà posés restent lisibles.

## 2. Livrables

```
src/lib/importDecisions.ts                 logique pure — dérivation, pré-check, payload
src/types/import.ts                        + DTO du commit, canaux de TVA, clé du mapping
src/services/menuImportService.ts          + commitImport, readCommitBlockers, describeCommitError
src/hooks/useProductImport.ts              + décisions éditables, pré-check, commit, étape 'done'
src/components/menu/import/
├── ImportReviewStep.tsx                   assemble les cinq sections (remplace le stub)
├── ImportDoneStep.tsx                     résumé post-commit
└── review/
    ├── ImportTagClassification.tsx
    ├── ImportTvaResolution.tsx
    ├── ImportMissingCategories.tsx
    ├── ImportNameCollisions.tsx
    └── ImportWarningsPanel.tsx
src/hooks/useMenuData.ts                   expose loadData
src/lib/queryKeys.ts                       + qk.menuTvaRates
```

`ImportPreviewSummary.tsx` disparaît : ses compteurs deviennent le bandeau de tête d'`ImportReviewStep`.

## 3. `src/lib/importDecisions.ts` — miroir de `BuildCommitPlan`

Toute la logique de décision est là, en fonctions pures exportées. Elle reproduit les règles de
`BuildCommitPlan` (API, `commit_plan.go`) pour que l'écran sache dire **à l'avance** ce qui manque, au lieu
de laisser l'utilisateur découvrir les problèmes un par un à chaque tentative. Le backend reste juge.

| Fonction | Règle reproduite |
|---|---|
| `categoryLabelIds` | catégories explicites ∪ libellés classés `category` |
| `resolveProductCategory` | décision forcée → catégorie de la source → **premier libellé du produit classé catégorie** → `null` |
| `isMaterializable` | un produit `already_imported`, ou tranché en **`skip`, ne sera pas créé** |
| `productsNeedingCategory` | seulement parmi les produits matérialisables — **c'est ce qui évite de bloquer sur des lignes qu'on a choisi d'ignorer** |
| `unresolvedTvaRates` | un couple est résolu dès qu'il a une entrée dans `tva_mapping` |
| `importPrecheck` | les trois conditions de rejet réunies |
| `buildImportDecisions` | corps envoyé au commit |

`buildImportDecisions` **purge les catégories forcées devenues invalides** : reclasser en tag un libellé
déjà affecté à un produit laisserait sinon une décision que l'API refuserait en
`invalid_category_decision`, avec un message que l'utilisateur ne pourrait pas relier à son geste.

Elle renvoie aussi la classification **de tous** les libellés, y compris ceux laissés au défaut. L'API les
compléterait, mais être explicite garantit que la valeur affichée et la valeur appliquée ne peuvent pas
diverger.

## 4. Les cinq sections

| Section | Rendu |
|---|---|
| **Catégories et tags** | Table dense : libellé, badge « absent du fichier » pour les synthétiques, nombre de produits, `ToggleGroup` Catégorie / Tag, colonne « existant ». Reclasser recalcule en direct les catégories disponibles et ce dont chaque produit hérite |
| **TVA** | Les couples résolus en lecture seule ; les autres avec un `Select` **filtré sur le canal** (`delivery_type` `'0'`/`'3'`/`'1'`), alimenté par `GET /pos/tva_rates`. Encart expliquant qu'un taux à 0 % désactive le canal et hérite du taux le plus élevé. Si aucune TVA n'est configurée pour un canal, on le dit au lieu d'afficher une liste vide |
| **Produits sans catégorie** | **Affectation groupée en tête** — un select et « Tout affecter » sur les N produits concernés — puis le choix par produit en dessous. C'est ce qui évite quatre clics pour les lignes de frais d'un export réel. Les produits sans prix portent la mention « sera importé mais retiré de la carte » |
| **Noms déjà utilisés** | `ToggleGroup` Ne pas importer / Importer quand même, avec le nom du produit existant en regard |
| **Points d'attention** | Accordéon replié, groupé par famille, jamais bloquant |

Barre d'action collante en bas : le décompte de ce qui manque, et le bouton **« Importer N produit(s) »**
dont le N suit les arbitrages en direct.

## 5. Commit — pré-check, 422, 410, succès

**Pré-check client** (`importPrecheck`) : le bouton n'est actif que si plus aucun produit ne manque de
catégorie, plus aucun taux n'est non résolu, et toutes les collisions sont tranchées. Miroir des conditions
de l'API, pas un remplacement — le backend refuse en dernier ressort.

**422** → `readCommitBlockers` extrait `data.blockers[]`, `indexBlockersByRef` les indexe par `ref`, et
chaque section les rend **sur la ligne concernée** : fond `bg-destructive/5` et message sous le libellé,
patron des `rowErrors` d'`AllergensMatrixDialog`. Les `ref` de TVA sont au format `"<taux>:<canal>"`, la même
clé que le mapping — l'indexation tombe donc juste sans traitement particulier. Toute modification des
décisions **efface les blocages** : les garder afficherait des erreurs qui ne correspondent plus à l'écran.

**410** → bandeau « Cette vérification a expiré ou a déjà été validée » avec un bouton **Recommencer** qui
ramène à l'étape fichier en gardant le provider.

**Succès** → étape `done` : tableau créés / réutilisés / ignorés par entité, plus un rappel que les groupes
d'options ont été créés sans être rattachés. `onImported()` est appelé **dès le succès**, pas à la
fermeture : l'utilisateur peut enchaîner sur un second fichier et doit voir un état à jour derrière lui.

Le vocabulaire des trois colonnes est celui de l'API, et c'est ce qui rend un second import compréhensible :
tout y apparaît en « ignoré », et rien n'a été dupliqué.

## 6. Rafraîchissement du menu

`useMenuData` n'exposait pas `loadData`. Il l'expose désormais — le menu n'est pas sur react-query, il n'y a
donc pas d'invalidation de cache possible, et c'est à la page de relancer son chargement via la prop
`onImported`.

Une seule clé react-query a été ajoutée, `qk.menuTvaRates` : le référentiel de TVA est une vraie lecture,
stable et partagée, contrairement aux appels d'import qui sont des actions.

## 7. Vérification

`tsc --noEmit`, `eslint` et `vite build` verts, avant et après le commit.

Le repo n'a **aucune infrastructure de test** (ni vitest, ni testing-library) et je n'en ai pas ajouté — hors
périmètre. Le commit de bout en bout par l'interface n'a donc **pas** été exécuté : il faudrait lancer l'API
avec ses variables d'environnement, un marchand et un jeton d'authentification. C'est pour cette raison que
toute la logique de décision vit dans `src/lib/importDecisions.ts`, en fonctions pures et exportées :
relisible d'un bloc, et testable dès que le repo aura un harnais.

Ce qui **a** été vérifié côté API, en intégration réelle : le commit de bout en bout de la fixture 2026,
l'idempotence et l'atomicité (phase 5).
