# Phase 7 — Hub d'import de produits (back-office)

Phase 7 de la feature « Importer des produits », côté back-office. Elle construit **l'entrée et le parcours
jusqu'à la réception de la prévisualisation**. L'écran de vérification détaillé (phase 8) et le formulaire de
saisie en masse (phase 9) ne sont pas dans ce lot.

Backend consommé (terminé) : `POST /menu/import/preview` (multipart | JSON) · `POST /menu/import/commit` ·
`GET /menu/import/template?provider=wello-generic`.

## 1. Livrables

```
src/types/import.ts                        miroir du PreviewResult de l'API + IMPORT_PROVIDERS
src/services/menuImportService.ts          previewFromFile · downloadTemplate · describeImportError
src/hooks/useProductImport.ts              machine à états + mutations
src/components/menu/import/
├── ProductImportDialog.tsx                conteneur : surface + aiguillage d'étape
├── ImportDoorPicker.tsx                   étape 1 — les trois portes
├── ImportProviderStep.tsx                 étape 2 — provider + fichier + erreurs
├── ImportPreviewSummary.tsx               étape 3 — récap (la phase 8 remplace ce corps)
└── ImportManualStub.tsx                   porte 3 — en attente de la phase 9
src/services/apiClient.ts                  export de ApiHttpError et isApiHttpError
```

## 2. Surface : modale large, pas une route

Le repo a trois calibres établis : `max-w-6xl max-h-[90vh]` pour les dialogs denses (les trois
`*MatrixDialog`), `max-w-7xl h-[90vh]` pour `OrganizeModal`, et le plein écran
`!h-screen !w-screen !rounded-none` réservé au **mobile** dans `ProductCreateSheet` / `SimpleProductSheet`,
choisi par `useIsMobile()`.

Le hub reprend le calibre d'`OrganizeModal`, avec bascule plein écran sur mobile.

**Pourquoi pas une route :** le parcours part de la liste des produits, y revient, et dure le temps d'un
fichier. Une route imposerait de gérer la persistance du jeton entre navigations, le retour arrière en plein
milieu, et la perte d'état au rafraîchissement — pour un gain nul. Le tableau de la phase 8 y tiendra : les
matrices produits × attributs tiennent déjà en `max-w-6xl`.

Si la phase 8 montre que c'est trop à l'étroit, le passage en route reste local : les quatre composants
d'étape sont autonomes, seul `ProductImportDialog` change.

## 3. Les trois portes

| Porte | Ce qu'elle fait |
|---|---|
| **« J'importe depuis ma caisse actuelle »** | `Select` provider + fichier `.xlsx` → `POST /menu/import/preview` en multipart |
| **« Je pars d'un modèle vierge »** | Télécharge le modèle, puis explique le trajet : le remplir, revenir par la première porte |
| **« Je saisis mes produits à la main »** | Stub identifié (`Bientôt`), écran explicatif, aucun code de la phase 9 |

`wello-generic` figure dans le select sous le libellé **« Modèle Wello Resto rempli »** : un modèle complété se
ré-importe exactement comme un export tiers, c'est le même endpoint et seul le parser diffère. Sans cette
entrée, la deuxième porte serait un cul-de-sac.

Les libellés sont écrits du point de vue du restaurateur — « ma caisse actuelle », pas « provider ».

## 4. État et appels

```ts
type ImportStep = 'choose' | 'provider' | 'preview' | 'manual-stub';

interface ProductImportState {
  step: ImportStep;
  provider: ImportProviderSlug;
  file: File | null;
  preview: ImportPreviewResult | null;   // jeton, résumé, avertissements, décisions
  error: string | null;
}
```

`useProductImport()` expose l'état et `goToDoor · back · reset · setProvider · setFile · submitFile ·
downloadTemplate`. L'étape `preview` n'est atteignable qu'avec un résultat en main : **la phase 8 n'aura
qu'à remplacer le corps d'`ImportPreviewSummary`**, sans toucher à la machine à états.

`useMutation` et non `useQuery` : ce sont des actions déclenchées, sans rien à mettre en cache. **Aucune clé
`qk` ajoutée.**

**Note pour la phase 8** : le rafraîchissement de la liste après un commit ne passera pas par
`invalidateQueries` — `useMenuData` est en `useState`/`useEffect` et le menu n'est pas sur react-query. Il
faudra une prop `onImported` branchée sur son `loadData`.

## 5. Deux détails d'infrastructure

**Multipart** : `apiClient.request` gère déjà `FormData` (il détecte `body instanceof FormData` et laisse le
navigateur poser le boundary). L'upload passe donc par `apiClient.post`. À noter, `menuService` court-circuite
`apiClient` pour ses uploads d'images et refait un `fetch` brut — ce n'est pas nécessaire.

**Téléchargement binaire** : `apiClient` parse systématiquement la réponse en JSON, il est donc inutilisable
pour le `.xlsx`. `downloadTemplate` passe par `fetch` + `blob()` + `createObjectURL`, sur le patron de
`cashRegisterHistoryService.exportRegisterPdf`. Le nom de fichier est lu dans `Content-Disposition`, avec un
repli si l'en-tête manque.

**`isApiHttpError` exporté** : il était privé, comme le type `ApiHttpError`. Les deux sont désormais
exportés. Les codes d'erreur métier de l'API vivent sous `data.error` dans l'enveloppe `{ id, data }`, et
`parseErrorResponse` ne lit que le niveau racine — il faut donc extraire le code soi-même, ce qui suppose
l'accès au `responseBody` typé. Un garde local dupliqué aurait dérivé dès la première évolution du type, et
les phases 8 et 9 en auront besoin aussi.

## 6. Erreurs

Codes vérifiés contre `sendImportError` et `previewFromMultipart` de l'API — la table correspond exactement à
ce que le handler émet.

| Code API | Message affiché |
|---|---|
| `missing_provider`, `unknown_provider` | « Choisissez d'abord le logiciel d'origine du fichier. » |
| `missing_file` | « Sélectionnez un fichier à importer. » |
| `file_too_large_or_invalid`, HTTP 413 | « Fichier trop volumineux ou illisible (5 Mo maximum, format .xlsx). » |
| `no_products` | « Aucun produit trouvé dans ce fichier — vérifiez le fichier et le logiciel sélectionné. » |
| `invalid_file` | message générique **+ le détail du serveur** |
| `invalid_file_content` | message générique **+ le détail du serveur**, qui porte la ligne et la colonne fautives |
| `template_unavailable` | « Ce logiciel n'a pas de modèle à télécharger. » |
| HTTP 403 | « Vous n'avez pas les droits pour importer des produits. » |
| autre | message du serveur, sinon repli générique |

Le dépassement des 5 Mo est aussi refusé **côté client** avant l'envoi : inutile de faire monter 20 Mo pour
se voir répondre que c'est trop.

## 7. Rendu

**Étape 1** — trois cartes côte à côte (empilées sous `md`), chacune avec son icône, son titre à la première
personne, deux phrases d'explication et son bouton. La troisième porte porte un badge « Bientôt ».

**Étape 2** — colonne centrée `max-w-2xl` : le select du provider avec la description du format choisi
dessous, puis une zone de dépôt en pointillés (`<input type="file">` masqué piloté par un bouton — le design
system n'a pas de dropzone, et c'est le patron déjà utilisé pour les images). Fichier choisi : carte avec
icône, nom, taille et bouton de retrait. Erreurs en `Alert variant="destructive"`. Rappel explicite que rien
n'est enregistré à cette étape. Bouton d'analyse avec spinner.

**Étape 3** — bandeau « Fichier analysé, rien n'a encore été enregistré », quatre compteurs (produits à créer,
catégories, tags, groupes d'options) avec leur sous-ligne « X existants réutilisés », un encart listant les
points à vérifier (produits sans catégorie, taux non reconnus, noms déjà pris), la liste des avertissements
(50 max puis « … et N autres »), le jeton en `font-mono` avec son heure d'expiration, et le bouton
**« Valider l'import » désactivé** — « Écran de vérification à venir ».

**Réouverture** : l'état est remis à zéro à chaque fermeture. Réutiliser une prévisualisation d'une session
précédente exposerait un jeton peut-être expiré.
