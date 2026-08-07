# Phase 9 — Saisie de masse (3ᵉ porte)

Dernière phase de la feature « Importer des produits ». La porte « saisie manuelle », laissée en stub
désactivé par la phase 7, devient une **grille éditable** qui produit le même canonique que les deux autres
portes.

Aucun endpoint nouveau : la porte JSON de `POST /menu/import/preview` existe depuis la phase 4, et l'écran
de vérification de la phase 8 s'applique **sans une ligne de modification**.

## 1. Livrables

```
src/lib/manualImport.ts                          PUR : lignes → payload, validation, conversion
src/types/import.ts                              + ImportManualProductPayload
src/services/menuImportService.ts                + previewFromManual
src/hooks/useProductImport.ts                    étape 'manual', lignes en état, door, submitManual
src/components/menu/import/
├── ImportManualStep.tsx                         la grille + barre d'actions
└── manual/ImportManualRow.tsx                   une ligne éditable
```

`ImportManualStub.tsx` disparaît ; la carte de la troisième porte perd son badge « Bientôt ».

## 2. Contrat, au champ près

```jsonc
POST /menu/import/preview          Content-Type: application/json
{ "products": [ {
    "name", "description", "category",              // category = un NOM, pas un identifiant
    "price", "price_take_away", "price_delivery",   // CENTIMES
    "tva_in", "tva_take_away", "tva_delivery",      // TAUX %, null si non saisi
    "tags": []
} ] }
```

**`provider` n'est pas envoyé.** Le défaut serveur est `"manual"`. L'envoyer explicitement donnerait le même
résultat, mais seulement en retombant dans la branche d'erreur de `registry.Get` — « manual » n'étant pas un
slug du registre. S'appuyer sur ce chemin serait fragile.

## 3. Conversion d'unités — le point à ne pas rater

Le repo a déjà `src/utils/priceInputUtils.ts`, utilisé par `PriceGrid` :

| Fonction | Comportement |
|---|---|
| `parsePriceInput("9,50")` | → **950 centimes**, accepte virgule et point |
| `parseDecimalInput("5,5")` | → `5.5`, **`undefined` si vide** — exactement la sémantique attendue pour un taux nullable |
| `priceToDisplayValue(950)` | → `"9,50"` |

Réutilisées telles quelles : même comportement que la grille de prix existante, et **la conversion se fait à
un seul endroit**, dans `buildManualPayload`, au moment de construire le payload.

À garder en tête, parce que c'est contre-intuitif : **les deux portes fichier et saisie ne convertissent pas
au même endroit.** Le modèle `.xlsx` est rempli en euros et converti par le parser Go ; la grille est
remplie en euros et convertie par le front. C'est voulu — chaque porte convertit là où elle lit.

Un taux laissé vide part à `null`, jamais à `0` : l'absence de taux réclame une décision dans l'écran
suivant, un taux nul **désactive le canal**. Les confondre fermerait des canaux que personne n'a demandé de
fermer.

## 4. Les lignes vivent dans l'état du wizard

`manualRows` entre dans `ProductImportState`, symétriquement à `file`. Ce n'est pas un détail : la grille est
démontée quand on passe à l'écran de vérification, et y perdre trente produits saisis à la main serait
inacceptable. Revenir en arrière les retrouve intacts.

`door: 'provider' | 'manual'` complète l'état : sans elle, `back()` depuis la vérification ramènerait
toujours à l'envoi de fichier, y compris après une saisie.

`submitManual()` passe par le **même `applyPreview`** que `submitFile()` — les deux mutations partagent leur
gestionnaire de succès. L'écran de vérification ne sait pas, et n'a pas besoin de savoir, d'où vient le
`PreviewResult` qu'il rend.

## 5. La grille

Patron `PriceGrid` : `<Table>` avec un `<Input>` par cellule, dans un conteneur `overflow-x-auto`.

| Colonne | Saisie |
|---|---|
| # | numéro de ligne — celui que citent les messages d'erreur du serveur |
| Nom \* | texte |
| Description | texte |
| Catégorie \* | texte + autocomplétion |
| Prix sur place / emporté / livraison | **euros**, alignés à droite en police fixe |
| TVA sur place / emporté / livraison | **%** + autocomplétion des taux du marchand |
| Tags | séparés par des virgules |
| — | dupliquer · supprimer |

- **`Entrée` sur la dernière ligne ajoute une ligne.** C'est ce qui rend la saisie de trente produits
  supportable au clavier.
- **Dupliquer** insère la copie juste sous l'originale, garde catégorie, prix, TVA et tags, et vide le nom :
  le geste exact pour saisir douze pizzas.
- **Supprimer la dernière ligne la vide** au lieu de laisser une grille sans rien.
- Les valeurs restent des **chaînes** jusqu'à l'envoi : convertir à chaque frappe ferait sauter le curseur et
  interdirait les états intermédiaires — on ne peut pas taper « 9,50 » sans passer par « 9, ».
- L'autocomplétion des catégories combine celles déjà saisies dans la grille et celles du menu (prop
  `existingCategories`). Une faute de frappe créerait une catégorie jumelle, la prévisualisation
  dédoublonnant par nom.
- L'autocomplétion des taux réutilise la requête `qk.menuTvaRates` posée en phase 8 : saisir un taux qui
  existe évite un aller-retour « TVA non reconnue » à l'écran suivant.

## 6. Validation client

Dans `src/lib/manualImport.ts`, en fonctions pures, miroir de ce que refuse `BuildManualImport` :

- **nom requis** et **unique** — deux lignes homonymes produiraient le même identifiant externe, que l'API
  refuse. Le message pointe l'autre ligne : « Déjà utilisé ligne 3 » ;
- **catégorie requise**, cohérent avec la règle « catégorie obligatoire » de toute la feature ;
- prix et taux numériques, taux non négatifs.

Les erreurs s'affichent sous la cellule fautive, ligne teintée — patron des `rowErrors`.

**Les lignes entièrement vides sont ignorées à l'envoi**, pas signalées : la dernière ligne d'une grille est
presque toujours vierge, et la refuser bloquerait chaque envoi.

Tout le reste — existence de la catégorie, résolution des taux, collisions de noms — reste au backend via la
prévisualisation, exactement comme pour un fichier.

## 7. Vérification

`tsc --noEmit`, `eslint` et `vite build` verts, avant et après le commit, arbre complet inclus.

Le repo n'a toujours aucune infrastructure de test et je n'en ai pas ajouté. C'est pourquoi la conversion et
la validation vivent dans `src/lib/manualImport.ts`, en fonctions pures exportées, comme `importDecisions.ts`
en phase 8 : relisibles d'un bloc, testables dès qu'un harnais existera.

Le parcours complet saisie → prévisualisation → vérification → enregistrement n'a **pas** été exécuté par
l'interface, faute d'API lancée avec ses variables d'environnement et d'un marchand authentifié. Ce qui a
été vérifié en conditions réelles reste la moitié serveur : commit de bout en bout, idempotence et atomicité
(phase 5, contre Postgres).
