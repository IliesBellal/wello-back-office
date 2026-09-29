# Phase 10 — Import de carte par photo (back-office)

Étape 4 du chantier « import de carte par photo » : le parcours côté back-office. Le cadrage et les étapes API sont dans le dépôt `ib-welloresto-api` :
- `docs/cadrage-import-carte-photo-ia.md` ;
- `docs/import-carte-ia-02-couche-ia.md` ;
- `docs/import-carte-ia-03-porte-ia.md` : endpoints et codes d'erreur.

Amont back-office : [phase 8](import-produits-phase8-wizard.md) (écran de vérification) et [phase 9](import-produits-phase9-saisie-masse.md) (saisie de masse).

**Statut :** implémenté le 2026-09-30 sur la branche `feature/import-carte-photo` (worktree séparé, pour ne pas mêler ce travail aux modifications en cours sur `main`). Commité, non poussé. **Le test de bout en bout dans un navigateur reste à faire** (§ 5).

**Objectif immédiat :** permettre un test de bout en bout, de la photo au produit créé.

---

## 1. Parcours

```
Choix de la porte ── « J'ai des photos de ma carte »
  │
  ▼  étape photo : 1 à 10 photos, normalisées dans le navigateur ; brouillons en cours et crédits affichés
POST /menu/import/ai
  │
  ▼  étape lecture : progression photo par photo (GET /menu/import/ai/{id}, toutes les 2,5 s)
  │   photo en échec → « Relancer » (POST …/retry), ou continuer avec les photos lues
  ▼
Vérification : l'écran existant, plus les sections propres aux photos
  │   photos lues · produits lus (inclure, groupe, nature → TVA proposée) · confirmation TVA
  ▼
POST /menu/import/commit (decisions.tva_confirmed = true) → étape « terminé » existante
```

## 2. Décisions

### D1 — Photos préparées dans le navigateur
`src/lib/menuPhotos.ts` redessine chaque photo sur un canvas avant l'envoi :
- **orientation appliquée** : le modèle ne lit pas l'EXIF ;
- **grand côté à 2576 px** au plus : c'est la définition lue par le modèle ;
- **JPEG** (qualité 0,9, puis 0,8 et 0,7 si la photo dépasse 7 Mo), fond blanc pour les PNG transparents.

Détails :
- **Passage par un `<img>`** plutôt que `createImageBitmap` : les navigateurs appliquent l'orientation EXIF à l'affichage d'une image, et le dessin conserve ce sens, Safari compris.
- **Champ `accept="image/jpeg,image/png"`** : Safari convertit alors le HEIC de l'iPhone en JPEG. Un bouton « Prendre une photo » (`capture="environment"`) ouvre l'appareil photo sur mobile.
- **Les limites de l'API sont reproduites** (10 photos, 7 Mo par photo, 20 Mo au total) pour refuser avant l'envoi plutôt qu'après.

### D2 — Suivi de la lecture
- **Interrogation** : `GET /menu/import/ai/{id}` toutes les 2,5 s via react-query (`refetchInterval`), arrêtée dès que la lecture n'est plus en cours.
- **Toutes les photos lues** : passage direct à la vérification.
- **Photos en échec** : l'écran laisse choisir entre « Relancer » (gratuit) et « Vérifier avec les N photos lues ».
- **Quitter l'écran est sans risque**, la lecture continue côté serveur. L'étape photo liste les brouillons ouverts (« Reprendre », « Abandonner ») et le solde de crédits.

### D3 — Relecture : une section « Produits lus sur vos photos »
Un seul tableau dense plutôt que plusieurs écrans. Pour chaque ligne :
- case d'inclusion (`excluded_products`, pour écarter une ligne mal lue) ;
- numéro de photo, avec un lien vers la photo ;
- nom, avec la mention « À vérifier » et les problèmes signalés par la lecture ;
- prix ;
- groupe (`group_per_product`) ;
- nature (`kind_per_product`), avec la **TVA proposée affichée à côté** (sur place · à emporter · en livraison).

Au-dessus du tableau : les liens vers les photos, le nombre de lignes à relire de près, et l'état des groupes (« ne sera pas créé » sous deux déclinaisons, règle de l'API). En dessous : **la case de confirmation de la TVA** (`tva_confirmed`), avec le rappel des règles de taux.

**Les sections communes restent :** TVA (résolution des couples), produits sans catégorie, homonymes, déjà importés, points d'attention. « Catégories et tags » est masquée quand la lecture n'a produit aucun libellé, ce qui est toujours le cas pour une photo.

### D4 — Logique de décision, miroir de l'API
Dans `src/lib/importDecisions.ts`, en fonctions pures :
- `effectiveKind` / `effectiveParent` : la décision, sinon la proposition de la lecture ;
- `groupVariants` / `createdGroupIds` : miroir de `resolveGroups`. Un groupe n'est créé qu'avec au moins deux déclinaisons créées, et le bouton « Importer N produits » ne compte pas un groupe qui ne sera pas créé ;
- `importPrecheck` : ajoute `needsKind` (nature « À préciser », donc sans taux) et `tvaNotConfirmed` aux conditions de blocage ;
- `buildImportDecisions` : envoie explicitement la nature et le groupe de **chaque** produit, avec `""` pour la racine, ainsi que `tva_confirmed`. Comme pour la classification, ce qui est affiché est exactement ce qui est appliqué.

### D5 — Points d'entrée (Q11 du cadrage)
- **Tableau de bord :** encart « Créez votre carte en quelques minutes », affiché **seulement si la carte ne contient aucun produit**. Il est masqué aussi en cas d'erreur de lecture de la carte : un encart d'onboarding ne doit jamais afficher d'erreur. Il mène à `/menu/products?import=photo`.
- **Page produits :** `?import=photo` ouvre directement la porte photo, puis le paramètre est retiré. Nouvelle entrée « Importer ma carte en photos » dans le menu du bouton de création.
- **Choix de la porte :** la carte « J'ai des photos de ma carte » passe en premier (badge « Nouveau »).

### D6 — Messages d'erreur
Les codes de l'API (`missing_photos`, `too_many_photos`, `photo_too_large`, `photo_not_jpeg`, `import_ai_no_credits`, `import_ai_already_running`, `import_ai_disabled`, `import_ai_draft_not_found`, `import_ai_draft_not_retryable`) sont traduits dans `describeImportError`. Les avertissements de la lecture (`ai_*`) ont leur intitulé dans le panneau « Points d'attention ».

## 3. Implémentation

| Fichier | Contenu |
|---|---|
| `src/types/import.ts` | Champs photo de la preview et des décisions ; `PRODUCT_KINDS` (natures et taux, miroir de `KindTvaRates`) ; brouillons, crédits ; codes de blocage `tva_not_confirmed`, `invalid_kind_decision`, `invalid_group_decision` |
| `src/lib/menuPhotos.ts` (nouveau) | Préparation des photos (D1) |
| `src/lib/importDecisions.ts` | Logique de la porte photo (D4) |
| `src/services/menuImportService.ts` | `startPhotoImport`, `getPhotoDraft`, `retryPhotoDraft`, `listPhotoDrafts`, `abandonPhotoDraft` ; normalisation des champs photo ; messages (D6) |
| `src/hooks/useProductImport.ts` | Étapes `photo` et `photo_reading`, porte `photo`, envoi, suivi, reprise, relance, décisions nature / groupe / TVA |
| `src/components/menu/import/ImportPhotoStep.tsx` (nouveau) | Choix des photos, brouillons ouverts, crédits |
| `src/components/menu/import/ImportPhotoReadingStep.tsx` (nouveau) | Progression de la lecture, relance |
| `src/components/menu/import/review/ImportPhotoProducts.tsx` (nouveau) | Section de relecture (D3) |
| `ImportReviewStep.tsx`, `ImportDoorPicker.tsx`, `ProductImportDialog.tsx`, `review/ImportWarningsPanel.tsx` | Branchement |
| `src/components/dashboard/MenuPhotoImportBanner.tsx` (nouveau), `src/pages/Index.tsx`, `src/pages/Menu.tsx` | Points d'entrée (D5) |

## 4. Vérifications

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` (`tsconfig.check.json` et `tsconfig.app.json`) | Aucune erreur dans les fichiers touchés. Le total reste celui de `main` avant ce travail, 11 et 81 erreurs préexistantes (`src/types/auth.ts`, etc.) |
| `eslint` sur les fichiers touchés | 0 erreur, 0 avertissement |
| `vite build` | OK |
| **Logique de décision contre une preview réelle de l'API** | La preview a été produite par le code Go (`BuildAIMenuImport` + `BuildPreview`), puis passée aux fonctions de `importDecisions.ts`, empaquetées avec esbuild. **21 vérifications OK** : présence des champs photo ; nature « À préciser » et TVA non confirmée bloquent ; commit possible une fois réglées ; 8 produits comptés ; corps du commit (nature et groupe de chaque produit, racine en `""`, `tva_confirmed`) ; groupe non compté sous deux déclinaisons ; dégroupage |
| **Décisions du back-office relues par l'API** | Le corps construit par `buildImportDecisions` a été passé à `BuildCommitPlan` (Go) : **plan accepté sans blocage**, groupe créé, dégroupage appliqué, TVA résolue. C'est la vérification du contrat JSON dans les deux sens |
| Parcours dans un navigateur | **Non fait** : il faut une API déployée avec la porte IA (clé Anthropic, R2 privé, tâche ouverte). C'est le test de bout en bout du § 5 |
| Préparation des photos (`menuPhotos.ts`) sur de vrais appareils | **Non testée** : conversion HEIC par Safari, orientation EXIF, poids après compression. À observer pendant le test |

Le dépôt n'a toujours pas de harnais de test (voir phase 8). Les scripts de vérification ci-dessus sont restés hors du dépôt.

## 5. Test de bout en bout

**Côté API (dépôt `ib-welloresto-api`, branche `staging`) :**
1. Pousser et déployer sur staging. La migration 161 y est déjà appliquée.
2. Sur staging : `AI_TASK_MENU_OCR_ENABLED=true`, `ANTHROPIC_API_KEY` présente, bucket R2 privé configuré. Au démarrage, une ligne `tâche IA` des journaux doit montrer `menu_ocr` active sur `claude-opus-5-5`.

**Côté back-office (cette branche) :**
3. Lancer `npm run dev` depuis le worktree `wello-back-office-import-photo`, avec **`VITE_API_BASE_URL` pointé sur l'API de staging** (fichier `.env.local`). Sans cette variable, le back-office vise l'API de **production** par défaut (`apiClient.ts`).
4. Se connecter avec un compte de staging ayant la permission catalogue. De préférence, prendre un établissement sans produit, pour voir aussi l'encart du tableau de bord.

**Parcours à dérouler :**
5. Tableau de bord → encart → porte photo, ou Produits → menu de création → « Importer ma carte en photos ».
6. Envoyer 1 ou 2 photos réelles d'une carte. Idéalement une prise avec un iPhone (HEIC, orientation) et une page contenant des déclinaisons (sodas, tailles de pizza).
7. Suivre la lecture (≈ 1 min par photo), puis vérifier :
   - les groupes proposés ;
   - les natures et les taux affichés ;
   - les lignes « À vérifier » ;
   - les formules signalées dans « Points d'attention ».
8. Préciser les natures « À préciser », cocher la confirmation de TVA, importer.
9. Contrôler dans la page produits :
   - les produits, les prix et les catégories ;
   - un groupe avec ses déclinaisons ;
   - les options rattachées.
10. **Mesures à relever :** durée par photo, jetons et coût. On les trouve dans les journaux de l'API (`llm_call succeeded`, tâche `menu_ocr`) et dans `menu_import_drafts.pages`.
