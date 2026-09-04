# Retrait de l'onglet Tags — PROMPT 09 lot 3 (C4)

## Raison du retrait

L'onglet Tags de la page Analyses (`DashboardAnalysis.tsx`) n'a jamais été branché à
une donnée réelle — `getTagsAnalytics()` (`analyticsService.ts`) était un mock, comme
6 des 11 onglets restants (Produits, Options, Annulations, Remises, Clients,
Restaurants). Ce qui distingue Tags des 6 autres, justifiant un retrait plutôt qu'un
simple maintien en l'état : **la donnée réelle sous-jacente est structurellement
absente sur le périmètre PROD**, pas seulement pas-encore-branchée.

Constat (`AUDIT.md` P17, `PERIMETRE.md` §... — chiffré avant ce lot, revérifié pour ce
lot) :
- 20 lignes `tags`, 192 associations `product_tags`, au total sur toute la base ;
- ces 192 associations appartiennent à **2 établissements sur 29** au total, et
  **0 sur les 8 établissements PROD** : l'un des deux porteurs est un établissement de
  test, l'autre (237) est inactif.
- aucun établissement PROD n'a donc la moindre chance d'afficher un chiffre réel dans
  cet onglet — un restaurateur PROD qui l'ouvrirait verrait soit un tableau vide, soit
  (avant ce lot, puisque le composant était un mock indépendant de toute donnée réelle)
  des chiffres inventés sans rapport avec son établissement.

Ce n'est donc pas un problème de priorisation (« pas encore fait ») mais un problème de
pertinence (« rien à montrer, même une fois fait ») — d'où le retrait plutôt que la
mise en attente aux côtés des 6 autres onglets mock.

## Ce qui a été retiré

- L'entrée `tags` de la navigation (`tabs` dans `DashboardAnalysis.tsx`) et du type
  `TabType`.
- `renderTagsTab()` et son rendu (2 PieChart + tableau détaillé + export CSV).
- L'état de filtre `selectedTags`/`setSelectedTags`, initialisé à
  `['Végétarien', 'Vegan', 'Sans gluten']` — un référentiel qui ne correspondait déjà à
  aucune donnée réelle (`AUDIT.md` I6 : le mock renvoyait
  `Signature du Chef / Végétarien / Bio / Sans gluten / Nouveauté`, `Vegan` n'existant
  dans aucun mock).
- `analyticsService.getTagsAnalytics()` et `analyticsService.exportTagsCSV()`, et les
  types `TagsAnalyticsResponse`/`TagsMetrics`/`TagAnalysis` qui n'étaient utilisés que
  par ces deux fonctions.

## Ce qui n'a PAS été retiré

Les tables `tags`/`product_tags` et la gestion des tags produit ailleurs dans le
produit (assignation de tags à un produit, filtrage par tag dans l'organisation du
menu — `src/components/menu/BulkAssignTagsDialog.tsx`, `OrganizeModal.tsx`,
`src/components/analytics/TagFilter.tsx` réutilisé par ce dernier malgré son
emplacement sous `components/analytics/`) : ce lot retire un écran d'**analyse** sans
donnée, pas la fonctionnalité d'étiquetage elle-même, qui reste utilisable et
utile indépendamment de cet onglet.

## Condition de retour

Le jour où un ou plusieurs établissements PROD étiquettent réellement leurs produits
(en volume suffisant pour que la couverture ne soit pas elle-même un nouveau P17), la
question redevient pertinente. À ce moment-là :
- vérifier la couverture réelle (part des produits PROD avec au moins un tag, part des
  établissements PROD concernés) avant de rebrancher l'onglet — même logique de seuil
  de matérialité que les couverts (`coversCoverageThreshold`, 20 %, `service.go`) ;
- **le mock aura été perdu** (ce lot le supprime, il n'est pas commenté/désactivé) : la
  ré-implémentation partira de zéro, côté backend (pas d'équivalent
  `GetTagsAnalytics` dans `internal/modules/analytics` aujourd'hui — les tags n'ont
  jamais fait partie des « 4 onglets » branchés en SQL direct) comme côté frontend.
