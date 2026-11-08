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
- **Cardinal** : seuls 4 et 8 secteurs sont proposés (N/E/S/O, N/NE/…/NO, en
  français : O = ouest). 16 a été retiré le 2026-11-08 (48 zones avec 3 plages,
  noms NNE/ESE peu lisibles en livraison) ; ses noms restent connus pour qu'une
  valeur 16 déjà en base s'affiche correctement. Toute autre valeur non standard
  reste affichée dans la liste et ses secteurs retombent sur des lettres.
- **Origine** : seule la grille a un point d'origine. Radial et Cardinal
  restent centrés sur l'établissement, car leurs plages sont des distances au
  restaurant (décision du 2026-11-08).
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

Mise en page : deux colonnes à partir de `lg` (paramètres à gauche, aperçu
collant à droite), empilées en dessous.

### Origine de la grille (2026-11-08)

- « Utiliser l'adresse de l'établissement » ne renseignait que la longitude :
  les deux `onChange` successifs partaient du même `formData` (fermeture) et le
  second écrasait le premier. `EstablishmentTab.handleFieldChange` passe en mise
  à jour fonctionnelle (`setFormData(prev => …)`), ce qui corrige aussi tout
  autre appel enchaîné du formulaire.
- « Sélectionner sur la carte » : bascule la carte en mode pointage (curseur en
  croix, bandeau « Cliquez sur la carte… » + Annuler) ; le clic renseigne
  latitude et longitude (6 décimales) et quitte le mode. Désactivé tant que la
  carte n'est pas affichable.
- Limite API connue : `PATCH /pos/settings` ignore un `grid_origin_lat/lng`
  nul (pointeur `nil` = champ absent). Vider l'origine pour revenir à
  l'établissement n'est donc pas enregistré ; l'ancienne origine revient au
  rechargement.

## Données héritées et affichage (constat du 2026-11-08)

- `customer.customer_zone_code` (varchar(4)) existe, est lu par l'API
  (`orders_fetcher_builder.go`) et renvoyé avec les commandes, mais **plus aucun
  code ne l'écrit** ; ni le POS ni le back-office ne l'affichent. Sur staging,
  10 clients sur 26 226 en ont un, tous chez des marchands en CARDINAL à
  4 secteurs : N1, N3, S2, W1, W2, W3.
- Ces codes ont été recalculés contre les positions : l'ancien moteur
  (vraisemblablement l'API PHP) utilisait des secteurs **centrés**, les lettres
  anglaises **N/E/S/W**, des plages numérotées à partir de 1, et un cap calculé
  sur les écarts bruts en degrés (sans correction `cos(latitude)`, ce qui élargit
  les secteurs E/W). 9 codes sur 10 tombent juste ; le 10ᵉ (N1 à 51 km) a une
  adresse modifiée depuis. La convention actuelle reprend le principe mais avec
  O (ouest) et une géométrie exacte.
- La fiche client du back-office (`CustomerDetailsSheet.tsx`) affiche en dur
  « Distance: ~2.5km » et « Zone de Livraison A » pour tout client géolocalisé :
  valeurs factices.
- Coordonnées à 0 : sur staging, 3 665 clients ont `customer_lat = 0` au lieu
  de NULL (Uber Eats 2 285, import EXPORT_226 662, Deliveroo 473, Wello Resto
  245). Côté code, Deliveroo enregistre `0,0` pour les commandes sans adresse
  (à emporter, livrées par Deliveroo) — `deliveroo_orders/customer.go`. Un futur
  moteur doit traiter `0,0` comme « pas de position ».

## Moteur côté API (2026-11-08)

L'API calcule et enregistre désormais la zone du client à chaque commande en
livraison (`customer.customer_zone_code`), avec un portage Go de
`zoneLabelForPoint` (`ib-welloresto-api/internal/modules/deliveryzone`, mêmes
cas de test) ; le POS l'affiche dans la production à droite de l'adresse.
Ouest = **O** (décision du 2026-11-08). Détails :
`ib-welloresto-api/docs/zones-livraison.md`. Toute évolution de la convention
se fait dans les deux implémentations.

## Reste à faire

- Recette visuelle dans le back-office (non faite : pas lancée en local).
- Fiche client : remplacer l'encart factice par la vraie zone.
