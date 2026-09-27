# Promotions & Disponibilités : explications, listes vides (2026-09-27)

Référence complète (cause, contrat API, décisions) :
`ib-welloresto-api/docs/AVAILABILITIES_EMPTY_LISTS.md`.

## Problème

Retirer le dernier produit (ou le dernier créneau) d'une disponibilité
affichait « Disponibilité mise à jour » mais rien n'était enregistré :
`transformAvailabilityForAPI` envoyait `product_ids: null` et omettait
`schedules`, deux cas que l'API interprétait comme « ne pas modifier ».

## Règle métier

- Disponibilité **sans produit** : autorisée, sans effet.
- Disponibilité **sans créneau** : autorisée ; active, elle masque ses produits
  en permanence sur la borne et le Scan & Order.
- Les deux cas affichent un avertissement et demandent confirmation.

## Changements

`src/services/promotionsService.ts` — `transformAvailabilityForAPI` :
- `product_ids` défini → envoyé tel quel, `[]` si vide (était `null`) ;
- `time_slots` défini → `schedules` envoyé, `[]` si vide (était omis) ;
- champ non défini (ex. toggle actif/inactif qui n'envoie que `active`) →
  non envoyé = inchangé côté API.

`src/pages/PromotionsAvailabilities.tsx` :
- `ToolExplainer` : encart « À quoi servent… » en tête des onglets Promotions
  et Disponibilités. Message clé : une promotion change le prix et ne masque
  jamais un produit ; une disponibilité masque ses produits hors créneaux sur
  la borne et le Scan & Order (pas la caisse).
- `getAvailabilityWarnings` / `AvailabilityWarnings` : avertissements
  « Aucun produit associé » et « Aucun créneau horaire » (texte adapté selon
  que la disponibilité est active ou non).
- Formulaire : un créneau n'est plus obligatoire ; les avertissements sont
  affichés au-dessus des boutons ; s'il y en a, « Enregistrer / Créer » ouvre
  une confirmation qui décrit ce qui va se passer (« … quand même » /
  « Revenir au formulaire »).
- Cartes : rappel en orange (« Aucun produit : sans effet », « Aucun créneau :
  produits masqués en permanence »).

## Décisions

- Confirmation en plus du bandeau : le cas « sans créneau » masque des
  produits en permanence, un bandeau seul se rate facilement.
- Pas de confirmation sur le toggle actif/inactif d'une carte (hors
  périmètre) ; le rappel sur la carte garde l'état visible.

## Statut

`npm run build` OK ; `tsc` sans erreur sur les fichiers modifiés (erreurs
préexistantes ailleurs dans le projet). Pas testé visuellement. Non commité.
