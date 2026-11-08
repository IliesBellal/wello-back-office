# Zones de livraison : aperçu cartographique de la découpe

Paramètres > Établissement > onglet Livraison > « Zones de livraison ». Sous les
paramètres de zonage, une carte montre la découpe avec le libellé de chaque
zone (A1, NE2, F6…). Elle se met à jour à chaque modification, avant
l'enregistrement.

## Constat de départ (2026-11-08)

Les paramètres `zoning_type`, `cardinal_*`, `radial_*`, `grid_*` sont stockés
dans `merchant_parameters` (API : `PATCH /pos/settings`, bloc `delivery_zone`)
mais **aucun code ne les consomme** : ni l'API, ni le POS Flutter, ni
ScanNOrder ne calcule de zone pour une adresse. Il n'existait donc aucune
convention de nommage. Cet aperçu la fixe ; [src/lib/deliveryZones.ts](../src/lib/deliveryZones.ts)
en est la référence, et un futur moteur (API ou POS) doit reproduire
`zoneLabelForPoint` à l'identique — ses tests servent de cahier de recette.

## Convention (choisie par Ilies le 2026-11-08)

| Type | Secteurs | Plages / lignes | Exemple |
|---|---|---|---|
| RADIAL | lettres A, B, C… sens horaire ; A commence plein nord (0°) | chiffres 1, 2, 3… du centre vers l'extérieur | B2 = 45°–90°, 2ᵉ plage |
| CARDINAL | points cardinaux ; chaque secteur est **centré** sur sa direction (N = −45°…+45° avec 4 secteurs) | idem | NE2 |
| GRID | colonnes A, B, C… d'ouest en est | lignes 1, 2, 3… du nord au sud | F6 |

Détails :

- **Plages** : la chaîne `"0-3,3-5,5-999"` est triée par borne min ; les plages
  illisibles ou vides (max ≤ min) sont ignorées. La numérotation suit l'ordre
  trié. Une borne max ≥ 100 km vaut « sans limite » (le défaut en base est
  `5-999`) : la plage est dessinée tronquée (rayon `max(1,5 × min, min + 2)`)
  et affichée « au-delà de X km ». Bornes : min incluse, max exclue.
- **Cardinal** : seuls 4, 8 et 16 secteurs ont des noms (N/E/S/O,
  N/NE/…/NO, N/NNE/…/NNO, en français : O = ouest). Le champ est passé d'un
  nombre libre (2–16) à une liste 4 / 8 / 16 ; une valeur non standard déjà en
  base reste affichée dans la liste et ses secteurs retombent sur des lettres.
- **Grille** : centrée sur le point d'origine, qui vaut par défaut les
  coordonnées de l'établissement quand `grid_origin_lat/lng` sont vides (choix
  d'Ilies). La grille est bornée pour que les lettres existent : elle couvre au
  moins 10 km (`GRID_RADIUS_KM`) autour de l'origine, avec au plus 12 cases de
  chaque côté (25 colonnes, A à Y) et au moins 1. Nombre de cases par côté =
  `2 × max(1, ceil(10 / taille − 0,5)) + 1` : 21 avec des cases de 1 km
  (centre K11), 11 avec 2 km (centre F6). Changer la taille des cases renomme
  donc les cases — inévitable avec une grille centrée et lettrée. Une adresse
  hors grille n'a pas de zone.
- **Géométrie** : projection plane locale (1° de latitude = 111,32 km), exacte
  à quelques mètres près sur les distances de livraison.

## Implémentation

- [src/lib/deliveryZones.ts](../src/lib/deliveryZones.ts) — logique pure :
  `buildZonePreview` (polygones + position des libellés) et
  `zoneLabelForPoint` (zone d'un point). Testée dans
  [src/lib/deliveryZones.test.ts](../src/lib/deliveryZones.test.ts), dont un
  test de cohérence : le libellé de chaque zone dessinée retombe, via
  `zoneLabelForPoint`, sur cette même zone.
- [src/components/settings/DeliveryZoneMap.tsx](../src/components/settings/DeliveryZoneMap.tsx)
  — carte Google Maps. Réutilise le script déjà chargé pour l'autocomplétion
  d'adresse (`loadGooglePlacesLibrary`, même clé `VITE_GOOGLE_PLACES_API_KEY`,
  aucune dépendance ajoutée). Zones = `google.maps.Polygon` ; libellés et point
  d'origine = `OverlayView` HTML (pas de `google.maps.Marker`, déprécié, ni
  d'`AdvancedMarkerElement`, qui exige un Map ID). Couleur par secteur,
  opacité décroissante par plage ; grille en damier.
- [src/components/settings/DeliveryZoneSettings.tsx](../src/components/settings/DeliveryZoneSettings.tsx)
  — bloc « Aperçu de la découpe » + légende (exemple de lecture, liste des
  plages ou étendue de la grille) ; sélecteur 4/8/16 pour le Cardinal.

Sans adresse géolocalisée (et, en grille, sans origine saisie), l'aperçu
affiche « Renseignez l'adresse de l'établissement… ». Si Google Maps ne charge
pas, un message neutre remplace la carte.

## Reste à faire

- Recette visuelle dans le back-office (non faite : pas lancée en local).
- Moteur d'attribution d'une zone à une commande (API ou POS) : à construire
  sur `zoneLabelForPoint`, si la fonctionnalité doit servir au-delà de
  l'aperçu.
