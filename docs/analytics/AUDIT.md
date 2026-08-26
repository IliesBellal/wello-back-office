# Audit analytics — Welloresto

> Session d'audit **lecture seule**. Aucun code modifié, aucune écriture en base.
> Base interrogée : `welloresto_staging` (PostgreSQL 18.4, Render Frankfurt), utilisateur
> `welloresto_api`, connexion forcée en transaction `READ ONLY`.
> Date des mesures : **2026-08-24**. Toutes les requêtes citées ont été réellement exécutées.

---

## 0. Résumé exécutable

| Question | Réponse mesurée |
|---|---|
| La page Analyses est-elle branchée ? | Non. **11 onglets, 10 entièrement mockés** en dur dans le frontend. Le 11ᵉ (Vente additionnelle) appelle un vrai endpoint. |
| Volumétrie staging | 33 842 commandes / 77 406 lignes / 33 576 paiements. Plus grosse table de faits : `orderitems` (11 MB). |
| Coût d'une agrégation naïve 12 mois | 426 ms (CA/jour/canal) → 1 347 ms (mix produits) → 1 157 ms (options, **avec spill disque**), cache chaud, 29 établissements. |
| Blocage n°1 | `orderitems.is_upsell` = **0 ligne** : le seul onglet branché renvoie des zéros. |
| Blocage n°2 | `orders.ht` = 0 sur **18,2 %** du périmètre CA → le CA HT n'est pas fiable tel quel. |
| Blocage n°3 | Un utilisateur = **un seul établissement** (`users.merchant_id`). L'onglet « Restaurants » n'a pas de modèle d'habilitation. |

---

## 1. Cartographie de la page d'analyses (frontend)

Repo : `wello-back-office` (React 18 + Vite + TS, TanStack Query, Recharts, shadcn/ui).

| Élément | Chemin |
|---|---|
| Route | `src/App.tsx:117` → `/dashboard/analysis` (sous `ProtectedRoute`) |
| Page | `src/pages/DashboardAnalysis.tsx` (1 612 lignes) |
| Service / mocks | `src/services/analyticsService.ts` (1 547 lignes) |
| Onglet upsell | `src/components/analytics/UpsellAnalyticsTab.tsx` |
| Composants annexes | `src/components/analytics/{AnalyticsTabs,ChannelFilter,ExportButton,KeyMetrics,PeriodComparisonCards,TagFilter}.tsx` |
| Filtre période | `src/components/shared/AdvancedDatePicker.tsx` |

> `AnalyticsTabs.tsx` est **du code mort** : la page utilise `TabSystem` (`src/components/shared/TabSystem.tsx`), pas `AnalyticsTabs`. Le commentaire d'`AnalyticsTabs` promet une « persistance dans l'URL » qui n'existe nulle part — l'onglet actif est un `useState` local (`DashboardAnalysis.tsx:181`), perdu au rechargement.

### 1.1 Mécanique d'alimentation

Toutes les données de la page sont produites par un `useMemo` unique (`DashboardAnalysis.tsx:206-250`) qui appelle **11 méthodes synchrones** d'`analyticsService`. Ces méthodes :

- ne font **aucun appel réseau** (elles ne sont même pas `async`, sauf `getUpsellStats` / `getOrderHistory`) ;
- **ignorent tous leurs paramètres** (`startDate`, `endDate`, `channels`, `category`, `sortBy`, `tags`, `reasons`…) : les constantes retournées sont identiques quelle que soit la période ;
- utilisent `Math.random()` pour les séries temporelles → **les graphiques changent à chaque re-render**.

Conséquence directe : le sélecteur de période global est purement décoratif sur 10 onglets sur 11. Les `ExportButton` produisent la chaîne littérale `'Date,Canal,CA\nMock CSV export'` (`analyticsService.ts:583-616`).

Le mécanisme `withMock(mockFn, realFn)` (`src/services/apiClient.ts:551-578`) existe et bascule sur `VITE_USE_MOCK`, mais **seuls `getUpsellStats` et `getOrderHistory` l'utilisent**. Les 10 autres méthodes n'ont pas de branche `realFn` du tout : brancher les vraies données demande de les réécrire, pas de basculer un flag.

### 1.2 Détail par onglet

Grain implicite commun : **jour** pour les timelines, **période entière** pour les KPI. Aucun onglet n'expose de grain horaire.

#### Onglet 1 — « CA » (`renderCATab`, ligne 252)
- **Question métier** : combien j'ai encaissé, comment ça évolue, quelle part par canal.
- **KPI** : CA Actuel · Période Préc. (+%) · Année Passée (+%).
- **Viz** : `AreaChart` empilé 7 séries canal ; `PieChart` répartition par canal.
- **Mock** : `analyticsService.getRevenueAnalytics()` (ligne 492).
  ```ts
  { timeline: {date, restaurant, takeaway, delivery}[]   // 30 pts, Math.random()
    current_period: { total: 14420, by_channel: {restaurant, takeaway, delivery, ubereats, deliveroo} }
    previous_period: { total: 14200, change: 1.5 }
    year_ago:        { total: 12880, change: 11.9 } }
  ```
- **Incohérence majeure** : la timeline ne porte que 3 séries (`restaurant/takeaway/delivery`) mais le graphique en trace **7** (`ubereats_takeaway`, `deliveroo_delivery`…). Les 4 séries supplémentaires sont plates à zéro. Le camembert, lui, est fabriqué dans le composant par des coefficients codés en dur (25/18/12/15/12/10/8 %, lignes 254-262) appliqués au total — ce n'est pas une répartition, c'est une constante.
- **Filtres** : période globale (ignorée). Aucun filtre canal/établissement.
- **Unité** : `current_period.total` est en **euros** (affiché via `toLocaleString('EUR')`) mais le `formatter` du camembert divise par 100 (ligne 331) — mélange euros / centimes dans le même onglet.

#### Onglet 2 — « Commandes » (`renderOrdersTab`, ligne 355)
- **Question métier** : combien de commandes, quel panier, combien de couverts.
- **KPI** : Nombre de commandes (2600) · Panier moyen (12,3 €) · Couverts (215) · Panier/couvert (12,1 €).
- **Viz** : `LineChart` 7 séries canal ; `PieChart` répartition (mêmes coefficients en dur, lignes 357-365).
- **Mock** : `getOrdersAnalytics()` (ligne 534) — `{ metrics, by_mode[], payment_methods{}, timeline[], comparisons }`.
- **Incohérences** : `timeline` expose `{date, orders, revenue}` alors que le `LineChart` lit `dine_in`/`takeaway`/… → **les 7 courbes sont vides**. `by_mode` et `payment_methods` ne sont affichés nulle part. Le canal est nommé `restaurant` dans l'onglet CA et `dine_in` ici, pour la même chose (`CHANNEL_COLORS` maintient les deux alias, lignes 41-42).

#### Onglet 3 — « Produits » (`renderProductsTab`, ligne 462)
- **Question métier** : quels produits vendent, lesquels marginent.
- **KPI** : Nb produits vendus · CA total produits · Marge contributive totale · Taux de marge moyen.
- **Viz** : tableau (`name, category, quantity, revenue, cost, margin, margin_percent, evolution_percent`), tronqué à **10 lignes en dur** (`DataTable`, ligne 138 `.slice(0, 10)`).
- **Mock** : `getProductsAnalytics()` (ligne 621) — 6 produits fictifs.
- **Filtres** : catégorie (`entrees/plats/desserts/boissons` — liste **codée en dur**, lignes 478-482) et tri (quantité/CA/marge). Tous deux passés au service qui les ignore. Le tri réel est fait côté client par `DataTable`.
- **Grain** : produit × période.

#### Onglet 4 — « Options » (`renderOptionsTab`, ligne 580)
- **Question métier** : les suppléments rapportent-ils, à quel taux d'adoption, avec quelle marge.
- **KPI** (7) : Nb total d'options · CA généré · Coût total · Bénéfice total · Taux d'ajout moyen · Marge moyenne % · Impact panier moyen.
- **Viz** : `BarChart` « Top 10 options — Coût vs Bénéfice » ; tableau détaillé.
- **Mock** : `getOptionsAnalytics()` (ligne 714) — 5 options.
  ```ts
  { id, name, product_name, count, revenue, adoption_rate, avg_price,
    basket_impact, cost_per_unit, total_cost, profit, margin_percent }
  ```
- **Unité** : c'est le **seul onglet où les montants sont documentés en centimes** (`// Coût unitaire (centimes)`, `analyticsService.ts:110-121`). Tous les autres onglets sont en euros. Aucune conversion n'est faite à l'affichage.
- **Filtres** : `optionTypes` (`paid`/`free`/`removed`) via `MultiFilter` — passé au service, ignoré.

#### Onglet 5 — « Tags » (`renderTagsTab`, ligne 725)
- **Question métier** : les gammes étiquetées (Végétarien, Bio…) performent-elles.
- **Viz** : `PieChart` part de quantité par tag ; `BarChart` « avec tags vs sans tags » ; tableau par tag.
- **Mock** : `getTagsAnalytics()` (ligne 818) — 5 tags.
- **Incohérence** : le state initial des tags sélectionnés est `['Végétarien','Vegan','Sans gluten']` (ligne 197) alors que le mock renvoie `Signature du Chef / Végétarien / Bio / Sans gluten / Nouveauté` — le filtre et les données ne partagent pas le même référentiel. `Vegan` n'existe dans aucun mock.

#### Onglet 6 — « Annulations » (`renderCancellationsTab`, ligne 843)
- **Question métier** : combien je perds en annulations, pourquoi, et qui annule.
- **KPI** : Nb annulations (85) · Taux (3,1 %) · Montant perdu (1 452) · Annulation moyenne (17,08).
- **Viz** : `PieChart` par motif ; `LineChart` évolution du taux (5 séries canal) ; tableau par serveur.
- **Mock** : `getCancellationsAnalytics()` (ligne 901) — motifs et serveurs en français, en dur.
- **Filtres** : motifs (`ordering_error`, `customer_wait`, `kitchen_issue`, `payment_issue` — **slugs anglais**) alors que `by_reason` renvoie des libellés français (« Erreur de commande »…). Le filtre ne peut structurellement pas matcher les données.

#### Onglet 7 — « Vente additionnelle » (`UpsellAnalyticsTab.tsx`) — **seul onglet branché**
- **KPI** : Lignes upsell · CA upsell HT · Taux de commandes avec upsell.
- **Viz** : `BarChart` horizontal CA par serveur ; tableau classement.
- **Source réelle** : `GET /stats/upsell?from=&to=` via `withMock` (`analyticsService.ts:1466-1508`). Conversion centimes → euros faite côté client (`/100`).
- **Filtre période** : réellement transmis au serveur (`YYYY-MM-DD`).

#### Onglet 8 — « Remises » (`renderDiscountsTab`, ligne 1023)
- **KPI** : Volume remises · Taux moyen · Impact marge · Commandes avec remise.
- **Viz** : `BarChart` par type ; bloc « Impact sur la marge » ; tableau par type.
- **Mock** : `getDiscountsAnalytics()` (ligne 981) — 5 types : Promotion, Happy Hour, Geste Commercial, Fidélité, Codes Promo.
- **Filtres** : `discountTypes` en slugs (`promotion`, `happy_hour`, `gesture`, `loyalty`, `promo_code`) vs libellés français dans les données → même défaut que l'onglet Annulations.

#### Onglet 9 — « Clients » (`renderClientsTab`, ligne 1143)
- **KPI** : Nouveaux Clients · Taux de Récurrence · AOV Nouveau vs Récurrent · Fréquence d'achat.
- **Viz** : 4 cartes segment ; « Évolution du mix Client » ; « Santé Base Client » ; tableau **Top Clients** (extensible : dernière visite, lifetime value, panier moyen, statut).
- **Mock** : `getCustomersAnalytics()` (ligne 1059) — `{metrics, new_vs_recurring, by_segment[], timeline[], comparisons}`.
- **Bug actif** : le tableau Top Clients lit `analyticsData.clients.top_clients` (ligne 1318) — **cette clé n'existe pas** dans la réponse du mock (`grep top_clients` ne la trouve que côté page). Le tableau est donc toujours vide, et la ligne dépliée référencerait `client.lifetime_value` / `client.last_visit` qui n'existent nulle part.

#### Onglet 10 — « Règlements » (`renderPaymentsTab`, ligne 1363)
- **KPI** : Montant total · Carte bancaire · Espèces · Paiement mobile.
- **Viz** : évolution des règlements ; répartition ; tableau détail (5 lignes).
- **Mock** : **inliné directement dans la page** (`DashboardAnalysis.tsx:220-249`), pas dans le service — seul onglet dans ce cas.
- **Incohérence** : le référentiel moyens de paiement est `card / cash / mobile`. La base connaît 14 valeurs de `payments.mop` et **aucune ne s'appelle « mobile »**.

#### Onglet 11 — « Restaurants » (`renderRestaurantsTab`, ligne 1518)
- **Viz** : 3 `MetricCard` comparatives (Paris 8ᵉ / Marseille / Lyon).
- **Mock** : `getRestaurantsAnalytics()` (ligne 1203).
- **Filtres** : aucun. `timeline` et `breakdown` sont produits par le mock mais **jamais affichés**.

### 1.3 Synthèse des incohérences inter-onglets

| # | Incohérence | Emplacement |
|---|---|---|
| I1 | `restaurant` (onglet CA) vs `dine_in` (onglet Commandes) = même canal, deux noms | `CHANNEL_COLORS`, `DashboardAnalysis.tsx:40-52` |
| I2 | Montants en **euros** partout sauf onglet Options en **centimes** | `analyticsService.ts:110-121` vs reste |
| I3 | Camembert CA : `/100` appliqué à une valeur déjà en euros | `DashboardAnalysis.tsx:331` |
| I4 | `timeline` à 3 séries, graphiques à 7 séries (CA) ; `timeline` à `{orders,revenue}`, graphique à 7 séries canal (Commandes) | lignes 288-306, 396-414 |
| I5 | Filtres en slugs anglais, données en libellés français (Annulations, Remises) | lignes 199-201, 855-866 |
| I6 | Référentiel tags du filtre ≠ référentiel tags des données | ligne 197 vs `analyticsService.ts:823` |
| I7 | `top_clients` consommé mais jamais produit → tableau mort | ligne 1318 |
| I8 | Répartitions par canal fabriquées par coefficients en dur, pas calculées | lignes 254-262, 357-365 |
| I9 | Tableaux tronqués à 10 lignes en dur, sans pagination ni indication | ligne 138 |
| I10 | « CA » désigne du TTC (onglets CA/Produits) et du HT (onglet Upsell) sans distinction affichée | transverse |
| I11 | Mock Règlements dans la page, les 10 autres dans le service | ligne 220 |

---

## 2. Cartographie du modèle de données réel (staging)

### 2.1 Tables pertinentes

Requête d'inventaire :
```sql
SELECT c.relname, c.reltuples::bigint, pg_size_pretty(pg_total_relation_size(c.oid))
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY pg_total_relation_size(c.oid) DESC;
```
194 tables au total. Les tables utiles à l'analytique :

| Table | Rôle | PK | Date de fait (type) | Tenant | Suppression | Statuts |
|---|---|---|---|---|---|---|
| `orders` | Commande (fait central) | `order_id` int | `creation_date` **timestamptz**, `datecall`, `last_update`, `delivery_start`, `delivered_on`, `estimated_ready` | `merchant_id` varchar | *aucune* — `brand_status IN ('DELETED','CANCELED')` fait office | `state`, `brand_status`, `merchant_approval`, `status` int |
| `orderitems` | Ligne de commande | `(order_item_id, order_id, product_id)` | `ordered_on` timestamptz, `distributed_on` | `merchant_id` | *aucune* | `production_status`, `ispaid`, `isdistributed`, `is_upsell` |
| `extra` | Supplément d'ingrédient sur une ligne | `id` | *aucune* (hérite de la commande) | `merchant_id` | *aucune* | — |
| `order_item_configuration` | Option de configuration choisie | `id` | *aucune* | *aucune* (via `order_item_id`) | *aucune* | — |
| `payments` | Encaissement | `payment_id` | `payment_date` timestamptz | `merchant_id` | **soft** : `enabled` bool | `mop`, `operation_type`, `status_check` |
| `receipts` | Ticket scellé (chaînage de hash) | `receipt_id` varchar | `created_at` timestamptz | `merchant_id` | *aucune* | — |
| `products` | Produit | `product_id` int | `creation_date` | `merchant_id` | **soft** : `enabled` | `status`, `available` |
| `productcateg` | Catégorie produit | `categ_id` | — | `merchant_id` | **soft** : `enabled` | `available` |
| `tags` / `product_tags` | Étiquetage produit | `tag_id` varchar / `(product_id, tag_id)` | — | `merchant_id` (sur `tags`) | *aucune* | — |
| `tva_categories` | Taux de TVA par mode de service | `tva_id` int | — | **global (non tenant)** | **soft** : `enabled` | `show_in_report` |
| `customer` | Client | `customer_id` int | `creation_date`, `last_order_date` | `merchant_id` (nullable) | **soft** : `enabled` | — |
| `merchant` | Établissement | `id` int | `creation_date` | — | **soft** : `is_active` | — |
| `users` | Utilisateur / serveur | `user_id` varchar | `creationdate` | `merchant_id` | **soft** : `enabled` | `admin`, `access_id` |
| `discounts` | Catalogue de remises | `discount_id` **varchar** | `valid_from`, `valid_to` | `merchant_id` | **soft** : `enabled` | `available`, `discount_scope` |
| `discount_redemptions` | Utilisation de remise | `id` bigint | `created_at` | `merchant_id` | *aucune* | — |
| `deletion_reasons` | Référentiel motifs d'annulation | `deletion_reason_id` int | `creation_date` | **global** | **soft** : `enabled` | `deletion_reason_type`, `_object` |
| `recipes` / `requires` / `components` | Recette → ingrédients → coût | `recipe_id` / `id` / `component_id` | — | `merchant_id` | **soft** : `enabled` | — |
| `configurable_attributes` / `_options` | Options configurables produit | `id` | — | `merchant_id` | **soft** : `enabled` | — |
| `upsell_suggestions` | Suggestions générées (market basket) | — | — | — | — | — |

### 2.2 Volumétrie mesurée

```sql
SELECT 'orders', COUNT(*), MIN(creation_date)::text, MAX(creation_date)::text FROM orders
UNION ALL SELECT 'orderitems', COUNT(*), MIN(ordered_on)::text, MAX(ordered_on)::text FROM orderitems
UNION ALL SELECT 'payments', COUNT(*), MIN(payment_date)::text, MAX(payment_date)::text FROM payments
UNION ALL ... ;
```

| Table | `COUNT(*)` | Taille totale | Plus ancienne | Plus récente |
|---|---:|---:|---|---|
| `api_request_logs` | 207 218 | **51 MB** | — | — |
| `orderitems` | 77 406 | 11 MB | 2022-12-23 17:26:59+00 | 2026-08-20 15:19:06+00 |
| `order_item_configuration` | 34 796 | 3 632 kB | — | — |
| `orders` | 33 842 | 10 MB | 2022-12-23 18:26:59+00 | 2026-08-20 15:19:06+00 |
| `payments` | 33 576 | 5 416 kB | 2023-08-11 15:02:55+00 | 2026-08-20 08:25:32+00 |
| `customer` | 26 224 | 8 944 kB | 2022-03-17 | 2026-08-13 |
| `audit_logs` | 10 500 | **56 MB** | — | — |
| `extra` | 6 395 | 576 kB | — | — |
| `receipts` | 5 840 | 4 408 kB | **2026-03-21** | 2026-08-20 |
| `products` | 2 780 | 9 120 kB | 2021-05-06 | 2026-08-10 |
| `requires` | 2 286 | 280 kB | — | — |
| `recipes` | 1 192 | 136 kB | — | — |
| `components` | 1 090 | 200 kB | — | — |
| `upsell_suggestions` | 284 | 864 kB | — | — |
| `product_tags` | 192 | 88 kB | — | — |
| `deletion_reasons` | 52 | 24 kB | — | — |
| `users` | 46 | 408 kB | — | — |
| `merchant` | 29 (dont **16 actifs**) | 184 kB | 2021-04-19 | 2026-08-02 |
| `tags` | 20 | 24 kB | — | — |
| `discounts` | 19 | 24 kB | — | — |
| `tva_categories` | 10 | 24 kB | — | — |
| `discount_redemptions` | **0** | 24 kB | — | — |

> Les deux plus grosses tables du schéma (`audit_logs` 56 MB, `api_request_logs` 51 MB) sont des tables de logs applicatifs, pas de la donnée métier. Elles pèsent **plus que toutes les tables de faits réunies**.

### 2.3 Distribution temporelle (12 derniers mois)

```sql
WITH o AS (SELECT to_char(date_trunc('month',creation_date),'YYYY-MM') m, COUNT(*) n FROM orders
           WHERE creation_date >= now()-interval '12 months' GROUP BY 1), ...
```

| Mois | `orders` | `orderitems` | `payments` | `receipts` | Établissements actifs |
|---|---:|---:|---:|---:|---:|
| 2025-08 | 272 | 860 | 278 | — | 5 |
| 2025-09 | 1 720 | 4 090 | 1 637 | — | 8 |
| 2025-10 | 2 214 | 5 258 | 2 903 | — | 8 |
| 2025-11 | 1 873 | 4 113 | 1 811 | — | 8 |
| 2025-12 | 2 313 | 5 406 | 2 356 | — | 9 |
| 2026-01 | 1 943 | 4 015 | 1 817 | — | 7 |
| 2026-02 | 1 812 | 3 457 | 1 619 | — | 6 |
| 2026-03 | 1 529 | 2 885 | 1 628 | 403 | 6 |
| 2026-04 | 1 382 | 2 676 | 1 221 | 997 | 5 |
| 2026-05 | 1 533 | 2 933 | 1 390 | 1 298 | 7 |
| 2026-06 | 1 644 | 3 508 | 1 472 | 1 309 | 8 |
| 2026-07 | 1 754 | 3 811 | 1 552 | 1 505 | 8 |
| 2026-08 (partiel) | 374 | 824 | 361 | 328 | 8 |

Régime de croisière staging : **~1 700 commandes / mois**, ~3 500 lignes / mois, ~2,1 lignes par commande.
`receipts` ne démarre qu'en **mars 2026** : la table de tickets scellés est récente et ne couvre pas l'historique.

### 2.4 Index existants

```sql
SELECT tablename, indexdef FROM pg_indexes WHERE schemaname='public'
AND tablename IN ('orders','orderitems','payments','extra','receipts');
```

| Table | Index | Définition | `idx_scan` |
|---|---|---|---:|
| `orders` | `orders_pkey` | UNIQUE btree (`order_id`) | 8 894 505 |
| `orders` | `idx_orders_idx_orders_merchant_id` | btree (`merchant_id`) | 4 731 |
| `orders` | `idx_orders_idx_orders_brand_status` | btree (`brand_status`) | 14 602 |
| `orders` | `idx_orders_idx_orders_state` | btree (`state`) | 118 |
| `orderitems` | `orderitems_pkey` | UNIQUE btree (`order_item_id`, `order_id`, `product_id`) | 144 910 |
| `orderitems` | `idx_orderitems_idx_orderitems_product_id` | btree (`product_id`) | 2 816 274 |
| `payments` | `payments_pkey` | UNIQUE btree (`payment_id`) | 3 913 |
| `extra` | `extra_pkey` | UNIQUE btree (`id`) | 0 |
| `receipts` | `receipts_pkey` | UNIQUE btree (`receipt_id`) | 0 |

**Ce qui manque, et qui conditionne tout le reste :**

| Manque | Conséquence mesurée |
|---|---|
| Aucun index sur `orders.creation_date` | Toute requête bornée en date fait un **Seq Scan** de 33 842 lignes (cf. §5, M1) |
| Aucun index composite `(merchant_id, creation_date)` | Le filtre mono-établissement lit 18 974 lignes pour en garder 9 864 (§5, M1bis) |
| `orderitems.order_id` n'est pas colonne de tête de la PK | Impossible de remonter les lignes d'une commande par index → Hash Join sur Seq Scan (§5, M2) |
| Aucun index sur `payments.order_id`, `.merchant_id`, `.payment_date` | Onglet Règlements = Seq Scan systématique |
| Aucun index sur `extra.order_item_id` | Sous-requête d'agrégat des suppléments = Seq Scan (§5, M2) |
| `extra_pkey` et `receipts_pkey` à **0 scan** | Index jamais utilisés : personne ne lit ces tables par leur clé |

### 2.5 Pièges identifiés (tous mesurés)

```sql
SELECT COUNT(*) total_orders,
  COUNT(*) FILTER (WHERE order_type IS NULL) order_type_null,
  COUNT(*) FILTER (WHERE brand_status <> upper(brand_status)) brand_status_lowercase,
  COUNT(*) FILTER (WHERE customer_id IS NULL) customer_null,
  COUNT(*) FILTER (WHERE ht = 0 AND price <> 0) ht_zero_price_nonzero,
  COUNT(*) FILTER (WHERE price < 0) price_negative,
  COUNT(*) FILTER (WHERE places_settings = 0) covers_zero,
  COUNT(*) FILTER (WHERE cart_discount_amount > 0) with_cart_discount,
  COUNT(*) FILTER (WHERE deletion_reason_id IS NOT NULL) with_deletion_reason
FROM orders;
```

| Piège | Mesure | Impact |
|---|---|---|
| **P1 — `orders.ht` non fiable** | Sur le périmètre CA (31 437 cmdes) : **5 718 avec `ht = 0`** soit **18,2 %** ; et **6 050 (19,2 %) où `price <> ht + tva`** | Le CA HT calculé depuis `orders.ht` est faux d'un cinquième. Il faut le recalculer depuis les lignes × taux de TVA. |
| **P2 — `is_upsell` jamais renseigné** | `SELECT COUNT(*) FROM orderitems WHERE is_upsell` → **0** | L'onglet Vente additionnelle, seul branché, affiche 0 partout. |
| **P3 — Couverts quasi absents** | `places_settings = 0` sur **31 985 / 33 842 (94,5 %)** ; sur les commandes sur place : **1 820 / 14 507 renseignées (12,5 %)**, somme = 5 606 couverts | KPI « Couverts » et « Panier/couvert » non produisibles. |
| **P4 — Client inconnu sur 70 % des commandes** | `customer_id IS NULL` sur **23 703 / 33 842 (70,0 %)** | Toute analyse client porte sur 30 % du volume. Segmentation biaisée par construction. |
| **P5 — `brand_status` en casse mixte** | **36 lignes** avec une valeur non-majuscule (`canceled`, `accepted`…) | Le filtre canonique `brand_status NOT IN ('DELETED','CANCELED')` **laisse passer des commandes annulées** dans le CA. |
| **P6 — `order_type` NULL** | **2 749 / 33 842 (8,1 %)** | Ces commandes basculent sur la branche `ELSE p.tva_in_id` du calcul TVA (taux « sur place ») même si elles sont en livraison → TVA potentiellement fausse. Et elles n'ont pas de canal. |
| **P7 — Aucune contrainte de clé étrangère** | `pg_constraint` sur `orders`/`orderitems`/`payments`/`extra`/`receipts` ne contient **que** des `NOT NULL` et des `PRIMARY KEY` | Rien ne garantit l'intégrité référentielle : les orphelins sont possibles et présents (cf. P8). |
| **P8 — Remises orphelines / types incompatibles** | `orderitems.discount_id` est **integer**, `discounts.discount_id` est **varchar**. 4 609 lignes remisées ; les ids `81, 83, 84, 89, 90` (**17 lignes**) ne matchent aucune remise. Les remises modernes (`discount-<uuid>`) **ne peuvent pas être stockées** dans une colonne integer. | Le rattachement ligne → remise est cassé pour tout le catalogue récent. |
| **P9 — Compteurs client dénormalisés désynchronisés** | Sur 5 992 clients ayant des commandes : `customer_nb_orders` faux pour **1 976 (33 %)**, `customer_total_spent` faux pour **1 961**, `last_order_date` faux pour **3 049 (51 %)** | `customer.*` ne peut pas servir de source pour l'onglet Clients — il faut recalculer depuis `orders`. |
| **P10 — Montants négatifs** | **23 commandes** avec `price < 0` | Avoirs implicites, non modélisés comme tels. |
| **P11 — `monnaie` en `real`** | `orders.monnaie` est en flottant alors que tous les autres montants sont en centimes entiers | Seule colonne monétaire en flottant. Non utilisée en analytique mais à ne pas réintroduire. |
| **P12 — JSON métier** | `receipts.tax_details`, `.items_snapshot`, `.payments_snapshot` sont des `jsonb` | Le détail TVA et le détail des lignes du ticket scellé ne sont accessibles qu'en JSON, non indexés. |
| **P13 — Paiements désactivés** | `payments.enabled = false` sur **1 142 lignes** (dont 562 CB, 312 ES) | Un `SUM(amount)` sans `WHERE enabled` surévalue les encaissements. |
| **P14 — `mop` non normalisé** | 14 valeurs distinctes dont `'1'` (1 ligne), `PERCENTAGE` (22), `DISCOUNT` (1), `STRIPE_WEB_HOOK` (14) | `PERCENTAGE`/`DISCOUNT` sont des **gestes commerciaux enregistrés comme moyens de paiement**. |
| **P15 — Pas de remboursement modélisé** | `payments.operation_type` = `'SALE'` sur **100 %** des lignes | Aucune trace de remboursement en base. |
| **P16 — `extra` orphelins** | 19 lignes avec `order_item_id IS NULL` | Suppléments non rattachables à une ligne. |
| **P17 — `tags` marginal** | 20 tags, 192 associations, sur **2 établissements seulement** ; 4 associations pointent vers un tag inexistant | L'onglet Tags n'a de sens que pour 2 merchants sur 29. |
| **P18 — Frais de livraison hors TVA active** | `tva_id = -1` (TVA frais de livraison 20 %) a `enabled = false` **et** `show_in_report = false`, mais `GetTVAReportData` le joint inconditionnellement (`pos/reports/repository.go:88`) | 1 847 commandes portent des frais de livraison comptabilisés via une catégorie désactivée. |
| **P19 — Aucune devise en base** | Aucune colonne `currency` sur `merchant`, `orders` ou `payments`. `"EUR"` est **codé en dur** dans `stats/service.go` | Monodevise de fait, non modélisée. |

### 2.6 Valeurs de statuts observées

`state` : `CLOSED` (majorité), `OPEN`. Aucune valeur en minuscules.
`brand_status` : `CLOSED, DONE, COMPLETED, COLLECTED, CANCELED, DELETED, DENIED, PENDING, ONLINE_PAYMENT_PENDING, PENDING_CARD_PAYMENT, READY_FOR_TAKE_AWAY` + variantes minuscules `canceled`, `accepted`.
`order_type` : `IN`, `TAKE_AWAY`, `DELIVERY`, `NULL`.
`brand` : `WELLO_RESTO`, `UBER_EATS`, `DELIVEROO`.
`fulfillment_type` : `DELIVERY_BY_RESTAURANT`, `DELIVERY_BY_UBER`, `DELIVEROO`, `TAKE_AWAY`, `DINE_IN`, `PICK_UP`, `UBER_EATS`.

> Le canal analytique attendu par le frontend (`ubereats_takeaway`, `deliveroo_delivery`…) est un **croisement `brand` × `order_type`**, qui n'existe comme tel dans aucune colonne. Il faut le dériver — et gérer les 2 749 `order_type NULL`.

---

## 3. Mapping mocks → données réelles

Convention : `Directe` = disponible par simple agrégation ; `Dérivable` = calcul non trivial décrit ; `Manquante` = rien en base ne permet de la produire.

| Onglet | Métrique | Définition métier précise | Source réelle | Calcul | Faisabilité |
|---|---|---|---|---|---|
| CA | CA période | Somme TTC des commandes valides | `orders.price` | `SUM(price)` sur `state IN ('CLOSED','DONE') AND upper(brand_status) NOT IN ('DELETED','CANCELED')` | **Directe** |
| CA | CA HT | Somme HT | `orders.ht` (18,2 % à 0) → recalcul via `orderitems`×`tva_categories` | `SUM(round((oi.price+extras)*qty*100/(100+tva_rate)))` | **Dérivable** (P1) |
| CA | Évolution vs période préc. / N-1 | Même calcul, fenêtre décalée | idem | 2ᵉ et 3ᵉ passes | **Directe** |
| CA | Timeline par jour | CA par jour **local** | `orders.creation_date` timestamptz | `to_char(creation_date AT TIME ZONE 'Europe/Paris','YYYY-MM-DD')` | **Directe** |
| CA | Répartition par canal (7 canaux) | CA par `brand`×`order_type` | `orders.brand`, `orders.order_type` | `CASE` de concaténation ; `order_type NULL` → canal inconnu | **Dérivable** (P6) |
| Commandes | Nombre de commandes | Cardinalité du périmètre CA | `orders` | `COUNT(*)` | **Directe** |
| Commandes | Panier moyen | CA / nb commandes | `orders.price` | `SUM(price)/COUNT(*)` | **Directe** |
| Commandes | **Couverts** | Nombre de personnes servies | `orders.places_settings` — renseigné sur 12,5 % du sur-place | — | **Manquante** (P3) |
| Commandes | **Panier / couvert** | CA / couverts | dérive de la précédente | — | **Manquante** (P3) |
| Commandes | Répartition par mode | Commandes par `order_type` | `orders.order_type` | `GROUP BY` | **Dérivable** (P6) |
| Produits | Quantité vendue | Unités vendues par produit | `orderitems.quantity` | `SUM(qty)` joint `orders` sur périmètre | **Directe** |
| Produits | CA produit | TTC ligne + suppléments | `orderitems.price`, `extra.price` | `SUM((oi.price+COALESCE(e.extra_price,0))*oi.quantity)` | **Directe** |
| Produits | **Coût produit** | Coût matière | `recipes`→`requires`→`components.purchase_price / purchase_price_quantity`, conversion via `unit_of_measure_convert` | Somme pondérée des ingrédients de la recette | **Dérivable** — mais **coût courant, non historisé** (cf. §7 R3) |
| Produits | Marge / Taux de marge | CA − coût | dérive des deux précédentes | — | **Dérivable** |
| Produits | Catégorie | Rattachement catégorie | `products.category` → `productcateg.categ_name` | jointure | **Directe** |
| Produits | Évolution % | Variation vs période préc. | idem | 2ᵉ passe | **Directe** |
| Options | Nb d'options / CA options | Options de configuration choisies | `order_item_configuration` × `configurable_attribute_options.extra_price` | `SUM(oic.quantity*oi.quantity*cao.extra_price)` | **Directe** |
| Options | Taux d'adoption | Part des lignes du produit portant l'option | `order_item_configuration`, `orderitems` | `qty_option / qty_produit` (cf. §5 M3) | **Dérivable** |
| Options | Coût / Bénéfice / Marge % | Coût de l'option | `configurable_attribute_options.component_id` → `components.purchase_price` | jointure ; **non historisé** | **Dérivable** |
| Options | Impact panier moyen | Δ panier avec/sans option | `orderitems`, `orders` | 2 agrégats comparés | **Dérivable** |
| Options | Options « removed » (retirées) | Ingrédients retirés | `without` (3 212 lignes) | `COUNT` par `component_id` | **Directe** |
| Tags | Quantité / CA par tag | Ventes des produits étiquetés | `product_tags` (cast `product_id::text`), `tags` | jointure + `GROUP BY tag` | **Directe** — pertinence limitée (P17) |
| Tags | Part de CA, évolution | idem | idem | — | **Directe** |
| Annulations | Nombre d'annulations | Commandes annulées / refusées | `orders.brand_status IN ('CANCELED','DELETED','DENIED')` | `COUNT(*)` — **2 638 lignes** | **Directe** (attention P5) |
| Annulations | Taux d'annulation | annulées / total | `orders` | ratio | **Directe** |
| Annulations | Montant perdu | TTC des annulées | `orders.price` | `SUM(price)` sur annulées | **Directe** |
| Annulations | Répartition par motif | Motif d'annulation | `orders.deletion_reason_id` → `deletion_reasons.deletion_reason_desc` — **2 232** commandes renseignées sur 2 638 (84,6 %) | jointure (cast) | **Directe** |
| Annulations | **Par serveur** | Qui a annulé | `orders.created_by` → `users` — **1 361 / 2 638 (51,6 %)** rattachables à un utilisateur réel | jointure | **Dérivable, partielle** |
| Annulations | Taux par canal | annulées par canal | `brand`×`order_type` | — | **Dérivable** |
| Upsell | Lignes upsell / CA upsell HT / taux | Lignes issues d'une suggestion | `orderitems.is_upsell` — **0 ligne** | SQL déjà écrit (`stats/repository.go:398-465`) | **Manquante en pratique** (P2) |
| Remises | Volume / Taux de remise | Montant remisé | `orderitems.base_price − orderitems.price` (**545 lignes** avec écart) ; `orders.cart_discount_amount` (**0 ligne**) | différence | **Dérivable, très partielle** |
| Remises | **Répartition par type** (Promotion / Happy Hour / Geste / Fidélité / Code promo) | Taxonomie de remise | Aucune colonne de type. `discounts.discount_name` est du texte libre ; `discount_unit` ∈ {`PERCENTAGE`,`NEWPRICE`} ; `discount_scope` = `PRODUCT` | — | **Manquante** |
| Remises | Commandes avec remise | Cardinalité | `orderitems.discount_id`, `orders.cart_discount_id` | `COUNT(DISTINCT order_id)` — rattachement cassé pour les remises UUID | **Dérivable, partielle** (P8) |
| Remises | Impact marge | Marge avec / sans remise | dérive coût produit + remise | — | **Dérivable** |
| Clients | Nouveaux clients | 1ʳᵉ commande dans la période | `orders.customer_id`, `MIN(creation_date)` par client | fenêtre analytique — **ne pas utiliser `customer.creation_date`** (date d'import ≠ 1ʳᵉ commande) | **Dérivable** (P4, P9) |
| Clients | Récurrents / Fidèles / Inactifs | Segmentation par nb de commandes | `orders` recalculé | `COUNT(*) per customer_id` bucketé | **Dérivable** (P9 : ne pas lire `customer_nb_orders`) |
| Clients | Fréquence d'achat | commandes / client / période | `orders` | ratio | **Dérivable** |
| Clients | Top clients (CA, LTV, dernière visite) | Classement | `orders` agrégé | `SUM(price)`, `MAX(creation_date)` | **Dérivable** |
| Clients | **Canal d'acquisition** (`acquisitionChannels`) | Comment le client est arrivé | Aucune colonne | — | **Manquante** |
| Règlements | Montant total / par méthode | Encaissements | `payments.amount`, `.mop`, `.enabled` | `SUM(amount) WHERE enabled GROUP BY mop` | **Directe** |
| Règlements | **« Paiement mobile »** | Encaissement sans contact / wallet | Aucun `mop` correspondant (14 valeurs, aucune « mobile ») | — | **Manquante** |
| Règlements | Détail des règlements | Liste transactionnelle | `payments` × `orders` | jointure | **Directe** |
| Règlements | Répartition par canal | Paiement par canal de commande | `payments.order_id` → `orders.brand/order_type` | jointure | **Directe** |
| TVA | Total TVA / base HT / TTC, par taux et par canal | Ventilation TVA | `orderitems`×`products`×`tva_categories` | déjà implémenté dans `pos/reports` | **Directe** |
| Restaurants | Comparatif par établissement | CA/commandes par merchant | `orders.merchant_id` × `merchant.fullname` | `GROUP BY merchant_id` | **Directe en SQL / Manquante en habilitation** (cf. §4.6) |

### 3.1 Données manquantes — le livrable principal

| # | Métrique impossible | Pourquoi | Ce qu'il faudrait capter |
|---|---|---|---|
| **M1** | **Vente additionnelle (tout l'onglet)** | `orderitems.is_upsell` = 0 sur 77 406 lignes. La colonne existe, le SQL existe, **personne ne l'écrit**. | Positionner `is_upsell = true` au moment de l'ajout au panier quand la ligne vient d'une suggestion. Vérifier les chemins POS / ScanNOrder / Kiosk. |
| **M2** | **Couverts et Panier/couvert** | `places_settings` renseigné sur 12,5 % du sur-place seulement. | Rendre la saisie du nombre de couverts obligatoire à l'ouverture d'une table, ou la dériver du plan de salle (`booked_location`, `locations`). |
| **M3** | **Typologie des remises** (Promotion / Happy Hour / Geste commercial / Fidélité / Code promo) | Aucune colonne de type. `discount_name` est du texte libre saisi par le restaurateur. | Ajouter un `discount_type` énuméré sur `discounts`, et l'historiser sur la ligne au moment de l'application. |
| **M4** | **Rattachement ligne ↔ remise moderne** | `orderitems.discount_id` **integer** vs `discounts.discount_id` **varchar** (`discount-<uuid>`). | Aligner les types, ou alimenter `discount_redemptions` (table prévue pour ça, **0 ligne**). |
| **M5** | **Remises panier** | `orders.cart_discount_amount > 0` : **0 ligne**. Les colonnes existent, ne sont jamais alimentées. | Écrire `cart_discount_id/_code/_amount` à l'application d'une remise panier. |
| **M6** | **« Paiement mobile »** | Aucun `mop` ne distingue Apple Pay / Google Pay / sans contact. `CB` et `STRIPE` agrègent tout. | Ajouter un sous-type de moyen de paiement, ou récupérer le `payment_method_details` Stripe. |
| **M7** | **Canal d'acquisition client** | Aucune colonne. Le paramètre `acquisitionChannels` du mock n'a aucune contrepartie. | Capter la source à la création du client (SNO / kiosk / POS / import). `customer.customer_brand` existe mais désigne la marque, pas l'acquisition. |
| **M8** | **Remboursements / avoirs** | `payments.operation_type` = `'SALE'` à 100 %. Les 23 commandes à `price < 0` sont le seul indice. | Modéliser `REFUND` avec référence à la vente d'origine. Sans ça, le « CA net » est indéfinissable. |
| **M9** | **Coût matière historisé** | `components.purchase_price` est le prix **courant**. Aucun historique. | Snapshoter le coût de revient sur `orderitems` à la vente. Sinon toute marge recalculée sur 12 mois utilise les prix d'aujourd'hui — et **change rétroactivement** à chaque mise à jour d'un prix d'achat. |
| **M10** | **Motif d'annulation sur 15 % des annulations** | 2 232 `deletion_reason_id` renseignés sur 2 638 annulations. | Rendre le motif obligatoire côté POS. |
| **M11** | **Serveur sur 48 % des annulations** | `created_by` ne correspond à aucun `users.user_id` (SCANNORDER, `-1`, utilisateurs supprimés). | Décider si les annulations self-service doivent apparaître dans le classement serveur. |
| **M12** | **Comparatif multi-établissements** | Techniquement calculable, mais `users.merchant_id` est **scalaire** : aucun utilisateur n'a le droit de voir 2 établissements. | Modéliser un groupe / une enseigne et une table d'habilitation `user × merchant`. |

---

## 4. Audit de l'API Go

Repo : `ib-welloresto-api`, Go 1.25, module `welloresto-api`.

### 4.1 Architecture

- **Router** : `go-chi/v5`, routes centralisées dans `cmd/api/routes.go` (~900 lignes), DI par constructeurs.
- **Découpage** : 42 modules sous `internal/modules/`, chacun en 3 couches `handler.go` → `service.go` → `repository.go` (+ `models.go`). Le pattern est **respecté uniformément**.
- **Accès base** : `database/sql`, **SQL brut écrit à la main**. Pas d'ORM, pas de sqlc, pas de query builder.
- **Bi-dialecte** : couche `internal/database/dbx` qui abstrait MySQL/PostgreSQL. Les requêtes sont écrites avec des placeholders `?` puis « rebind » ; les fonctions divergentes sont branchées sur `dbx.ActiveDialect()` (ex. `CONVERT_TZ` vs `AT TIME ZONE`, `ROUND` numeric, `DATE_FORMAT` vs `to_char`). **Une migration MySQL → PostgreSQL est en cours** (`docs/migration-postgres/`, `staging_schema_dump.sql`). Staging tourne déjà sur PostgreSQL 18.4.
- **Erreurs** : enveloppe maison `models.SendJSON(w, status, module, action, payload)`. Les erreurs internes sont renvoyées telles quelles au client (`map[string]interface{}{"error": err.Error()}`, `stats/handler.go:31`) — **fuite de détails d'implémentation**.
- **Pooling** :

| | `MaxOpenConns` | `MaxIdleConns` | `ConnMaxLifetime` | `ConnMaxIdleTime` |
|---|---:|---:|---|---|
| PostgreSQL (`postgres.go`) | **15** | 4 | 5 min | 1 min |
| MySQL (`mysql.go`) | **1** | 1 | 3 min | 30 s |

> Le commentaire du fichier Postgres dit encore « Maximum 1 connexion ouverte en même temps » alors que la valeur est 15 — commentaire copié de la config MySQL. La contrainte historique Hostinger (1 connexion) a disparu avec Render : **le pool n'est plus le goulot d'étranglement**, mais tout le code de tâches a été écrit en supposant qu'il l'était.

### 4.2 Endpoints d'analytics existants

| Endpoint | Handler | Nature |
|---|---|---|
| `GET /stats/dashboard/summary` | `stats.GetDashboardSummary` | KPI du tableau de bord (CA jour/semaine/mois + N-1, commandes, panier moyen, série horaire) |
| `GET /stats/upsell?from=&to=` | `stats.GetUpsellStats` | Statistiques vente additionnelle |
| `POST /pos/reports/tva` | `posReports.GetTVAReport` | Rapport TVA par jour × mode de service |
| `POST /pos/reports/payments` | `posReports.GetPaymentsReport` | Rapport encaissements |
| `POST /pos/reports/tva/export`, `/payments/export`, `/pos/accounting/export` | — | Exports (Excel via `excelize`, PDF via `gofpdf`) |

**Qualité / performance :**

- `GetDashboardSummary` est **fortement bavard** : il enchaîne 6 requêtes de CA (jour, veille, semaine, semaine-1, mois, mois-1), 2 comptages de commandes, 2 paniers moyens, plus les séries horaires — **une requête par borne temporelle**, chacune refaisant un scan de `orders` (§2.4 : pas d'index sur `creation_date`). C'est le pattern exact qu'il ne faut pas reproduire pour la page Analyses.
- `GetUpsellStats` est propre : requêtes uniques, agrégation en SQL, expression HT partagée (`upsellLineHTExpr`) et cohérente avec le rapport TVA. C'est **le bon modèle de référence** pour la suite.
- Le rapport TVA fait un `UNION ALL` de deux scans complets de `orders` (lignes + frais de livraison), avec un `LEFT JOIN` sur un agrégat de `extra` non indexé.

### 4.3 ⚠️ Deux définitions du chiffre d'affaires coexistent

C'est le point le plus structurant de cet audit.

| | Module `stats` (`repository.go:502-510`) | Module `pos/reports` (`repository.go:72-93`) |
|---|---|---|
| `state` | `IN ('CLOSED','DONE')` | `= 'CLOSED'` |
| `brand_status` | `NOT IN ('DELETED','CANCELED')` | `NOT IN ('DELETED','CANCELED')` |
| `brand` | **toutes marques** | **`= 'WELLO_RESTO'` uniquement** → Uber Eats et Deliveroo **exclus** |
| `created_by` | inclus | **`NOT IN ('-1','SCANNORDER')`** → ScanNOrder exclu |
| Frais de livraison | non comptés | comptés (`tva_id = -1`) |
| TVA | filtre absent | `tva.show_in_report` |
| Fuseau du regroupement journalier | `AT TIME ZONE` du merchant (`ListRevenueHTByLocalDay`) | **aucun** — `to_char(creation_date, 'YYYY-MM-DD')` en `TimeZone` de session = **UTC** |
| Borne de fin de journée | `< end` (exclusive) | `<= date + 23:59:59` → **la dernière seconde de la journée est perdue** |

Chiffrage de l'écart, sur 33 842 commandes : le périmètre `stats` retient **31 437** commandes ; le périmètre `pos/reports` exclut à lui seul les **5 356** commandes Uber Eats/Deliveroo closes et les **2 095** commandes `created_by IN ('-1','SCANNORDER')`.

> **Tant que cette définition n'est pas arbitrée, deux écrans du produit afficheront deux CA différents pour la même journée.**

### 4.4 Infrastructure de tâches planifiées

`cmd/api/tasks.go`, `robfig/cron/v3`, démarré **inconditionnellement** depuis `SetupRoutes` (aucun garde `ENV`) — donc actif sur staging **et** production.

```go
c := cron.New(cron.WithChain(
    cron.SkipIfStillRunning(cronLog),   // pas deux exécutions parallèles du même job
    cron.Recover(cronLog),              // un panic ne tue pas le process
))
```

12 tâches enregistrées :

| Spec | Tâche |
|---|---|
| `@hourly` | `ExpirePendingBookings`, `CloseOrders`, `SendLoyaltyProgrammReminder` (no-op), `CapturePayments`, `CancelPayments` |
| `@every 1m` | `DenyOrders` |
| `@every 5m` | `ExpireWaitlistNotifications` |
| `@every 15m` | `UpdateAverageDistributionTime` |
| `@every 30m` | `SendBookingReminders` |
| `0 2 * * *` | `UpdatePopularProducts` — **fenêtre glissante 30 jours, recalcul quotidien** |
| `0 3 * * *` | `RecomputeUpsellPatterns` |
| `0 4 1 * *` | `CleanupOldUpsellSuggestions` |
| `0 5 * * *` | `CleanupExpiredPasswordResets` |

**Garanties réellement offertes :**

| Garantie | État |
|---|---|
| Anti-concurrence **intra-processus** | ✅ `SkipIfStillRunning` |
| Anti-concurrence **inter-instances** | ❌ Aucun verrou distribué. `redis.SetNX` existe (`infrastructure/redis/client.go:79`) mais n'est **pas** utilisé par le cron. Deux instances API = double exécution. |
| Résistance au panic | ✅ `Recover` |
| **Retry** en cas d'échec | ❌ Aucun. Un job qui échoue est simplement loggé et perdu jusqu'au prochain tick. |
| **Idempotence** | ⚠️ Non garantie par le framework ; dépend de chaque tâche. `UpdatePopularProducts` (recalcul complet sur fenêtre glissante) l'est par construction — **c'est le précédent à suivre**. |
| **Observabilité** | ⚠️ Logs zap uniquement (`cron.VerbosePrintfLogger`). Aucune table d'exécution, aucune métrique, aucune durée persistée. Impossible de savoir *a posteriori* si l'agrégation de la nuit dernière a tourné. |

> **Bonne nouvelle** : l'infrastructure existe, et le pattern « recalcul nocturne sur fenêtre glissante » est déjà en production avec `UpdatePopularProducts`. Il manque le verrou distribué, le retry et la traçabilité d'exécution.

### 4.5 Cache

- **Redis** : `internal/infrastructure/redis/client.go` — `Get`, `Set(ttl)`, `SetNX(ttl)`, `Delete`, `ScanDeleteByPattern`, plus des invalidations ciblées (`InvalidateMerchantMenuCaches`, `InvalidateMerchantStatusCache`).
- **Utilisé par** : `menu`, `orders`, `order_life_cycle`, `auth`, `scannorder`, `kiosk`, `integrations`, `ubereats`, `reservation`, `users`, webhooks Stripe/Deliveroo/UberEats, et `internal/ai/cache` (cache de réponses LLM).
- **Non utilisé par** : `stats`, `pos/reports`. **Aucun endpoint analytique n'est mis en cache aujourd'hui.**
- **Cache HTTP** : aucun `Cache-Control` / `ETag` émis par `models.SendJSON`.
- **Cache in-memory** : aucun.

### 4.6 Authentification, multi-établissement, permissions

- **Auth** : token porteur validé **contre Redis** (`middleware/auth.go`), utilisateur injecté en contexte, récupéré via `middleware.UserFromContext(ctx)`. MFA (SMS/email) et vérification d'email supportées.
- **Scoping tenant** : `user.MerchantID` — **une chaîne, un seul établissement**. Toutes les requêtes des repositories filtrent sur ce `merchant_id`.
- **RBAC** : `middleware.RequirePermission(...)` avec 18 prédicats (`internal/middleware/permissions.go`), combinables par `AnyOf` / `AllOf`. Existent notamment :
  `HasReportsViewAccess`, `HasReportsExportAccess`, `HasFinancialsViewAccess`, `HasFinancialsExportAccess`.

**🔴 Constat de sécurité** : les routes analytiques **n'utilisent aucune de ces permissions**.

```go
// cmd/api/routes.go:589
r.Route("/stats", func(r chi.Router) {
    r.Use(authMiddleware)                       // ← authentification seule
    r.Route("/dashboard", func(r chi.Router) {
        r.Get("/summary", statsH.GetDashboardSummary)
    })
    r.Get("/upsell", statsH.GetUpsellStats)
})
// cmd/api/routes.go:635 — idem pour /pos/reports : aucun RequirePermission
```

Périmètre effectif : **tout utilisateur authentifié d'un établissement voit tous les chiffres de cet établissement** — CA, marges, encaissements, performance individuelle des serveurs — quel que soit son rôle. Un commis avec un compte POS a le même accès qu'un gérant. Les permissions `HasFinancialsViewAccess` / `HasReportsViewAccess` ont été écrites pour ça mais ne sont câblées nulle part sur ces routes.

**Conséquence pour une table pré-agrégée** : la granularité minimale de sécurité est `merchant_id`. Il n'existe **aucun concept de groupe d'établissements** exploitable :
- `merchant.brand_id` : renseigné sur **3 merchants sur 29**, avec **1 seul `brand_id` distinct** ;
- table `brands` : **1 ligne** ;
- `users.merchant_id` : non nul pour les 46 utilisateurs, scalaire.

L'onglet « Restaurants » est donc **calculable en SQL mais non exposable** en l'état.

### 4.7 Observabilité

| Dimension | État |
|---|---|
| Logs applicatifs | ✅ `go.uber.org/zap`, structurés, niveau piloté par `ENV` |
| Log des requêtes HTTP | ✅ `middleware/request_logger` → table `api_request_logs` (`user_id, merchant_id, method, url, payload jsonb, status_code, ip`) — **207 218 lignes, 51 MB** |
| **Durée des requêtes** | ❌ **Aucune colonne de latence** dans `api_request_logs`. Une durée n'est loggée que pour le *flush* du logger lui-même (`logger.go:141`). |
| Audit métier | ✅ `audit_logs` (10 500 lignes, 56 MB) |
| Métriques (Prometheus/OTel) | ❌ Aucune |
| Traces distribuées | ❌ Aucune |
| **Slow query log** | ❌ `pg_stat_statements` **non installé** (`SELECT extname FROM pg_extension` → `plpgsql` seul). Impossible de savoir quelles requêtes coûtent cher en production. |
| Rétention des logs | ❌ Aucun job de purge (§6.6) |

---

## 5. Coût actuel d'une agrégation naïve

Les 3 métriques les plus lourdes de §3, mesurées sur staging. **Cache chaud** (`Buffers: shared hit` quasi exclusif) — les temps ci-dessous sont donc des **planchers**, pas des pires cas.

### M1 — CA par jour local × canal × établissement, 12 mois

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT to_char(o.creation_date AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS local_day,
       o.merchant_id,
       CASE WHEN o.brand <> 'WELLO_RESTO' THEN lower(o.brand)||'_'||lower(COALESCE(o.order_type,'unknown'))
            ELSE lower(COALESCE(o.order_type,'unknown')) END AS channel,
       COUNT(*) AS orders, SUM(o.price) AS ttc_cents, SUM(o.ht) AS ht_cents, SUM(o.tva) AS tva_cents
FROM orders o
WHERE o.creation_date >= now() - interval '12 months'
  AND o.state IN ('CLOSED','DONE')
  AND o.brand_status NOT IN ('DELETED','CANCELED')
GROUP BY 1,2,3;
```

```
HashAggregate  (cost=2612.05..3177.52 rows=18849) (actual time=424.733..425.517 rows=3370 loops=1)
  Batches: 1  Memory Usage: 665kB
  Buffers: shared hit=1143
  ->  Seq Scan on orders o  (cost=0.00..2281.77) (actual time=22.145..416.018 rows=18630 loops=1)
        Filter: (state = ANY ('{CLOSED,DONE}') AND brand_status <> ALL ('{DELETED,CANCELED}')
                 AND creation_date >= (now() - '1 year'))
        Rows Removed by Filter: 15212
        Buffers: shared hit=1143
Execution Time: 425.993 ms
```

| | |
|---|---|
| **Temps** | **425,99 ms** |
| Nœud coûteux | **Seq Scan** sur `orders` — 416 ms sur 426, soit 98 % du temps |
| Lignes scannées | **33 842** (18 630 retenues, **15 212 rejetées par le filtre**) |
| Buffers | 1 143 blocs, 100 % en cache |
| Tri sur disque | non |
| Cause racine | Absence d'index sur `creation_date` : Postgres ne peut pas éliminer les 15 212 lignes hors période avant de les lire |

### M1bis — Même métrique, un seul établissement

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT to_char(o.creation_date AT TIME ZONE 'Europe/Paris','YYYY-MM-DD') d,
       SUM(o.price), COUNT(*)
FROM orders o
WHERE o.merchant_id = '212' AND o.creation_date >= now() - interval '12 months'
  AND o.state IN ('CLOSED','DONE') AND o.brand_status NOT IN ('DELETED','CANCELED')
GROUP BY 1;
```

```
HashAggregate  (actual time=202.833..202.932 rows=348 loops=1)
  Buffers: shared hit=1096 read=16
  ->  Index Scan using idx_orders_idx_orders_merchant_id on orders o  (actual time=3.785..201.022 rows=9864 loops=1)
        Index Cond: (merchant_id = '212')
        Filter: (state = ANY (...) AND brand_status <> ALL (...) AND creation_date >= (now() - '1 year'))
        Rows Removed by Filter: 9110
Execution Time: 203.195 ms
```

**203,20 ms** pour un seul restaurant. L'index `merchant_id` est utilisé, mais **48 % des lignes lues sont jetées** faute de date dans l'index. Un index `(merchant_id, creation_date)` supprimerait ces 9 110 lectures inutiles.

### M2 — Mix produits avec CA HT et suppléments, 12 mois

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.merchant_id, p.product_id, p.name, p.category,
       SUM(oi.quantity) AS qty,
       SUM((oi.price + COALESCE(e.extra_price,0)) * oi.quantity) AS ttc_cents,
       SUM(ROUND(CAST(CASE WHEN tva.tva_rate = 0 THEN ((oi.price + COALESCE(e.extra_price,0)) * oi.quantity)
                 ELSE ((oi.price + COALESCE(e.extra_price,0)) * oi.quantity) * 100.0 / (100.0 + tva.tva_rate)
                 END AS numeric),0)) AS ht_cents
FROM orderitems oi
INNER JOIN orders o ON o.order_id = oi.order_id
INNER JOIN products p ON p.product_id = oi.product_id
INNER JOIN tva_categories tva ON tva.tva_id = (
  CASE WHEN o.order_type = 'DELIVERY' THEN p.tva_delivery_id
       WHEN o.order_type = 'TAKE_AWAY' THEN p.tva_take_away_id
       ELSE p.tva_in_id END)
LEFT JOIN (SELECT order_item_id, SUM(price) AS extra_price FROM extra GROUP BY order_item_id) e
       ON e.order_item_id = oi.order_item_id
WHERE o.creation_date >= now() - interval '12 months'
  AND o.state IN ('CLOSED','DONE') AND o.brand_status NOT IN ('DELETED','CANCELED')
GROUP BY 1,2,3,4;
```

```
HashAggregate  (actual time=1346.571..1347.020 rows=1239 loops=1)
  Planned Partitions: 8  Batches: 1  Memory Usage: 721kB
  ->  Hash Left Join  (actual time=244.686..1015.440 rows=40057 loops=1)
        ->  Hash Join  (actual time=152.077..734.581 rows=40057 loops=1)          -- TVA
              ->  Hash Join  (actual time=152.032..544.075 rows=40057 loops=1)    -- products
                    ->  Hash Join  (actual time=150.860..442.099 rows=40057 loops=1)  -- orders
                          ->  Seq Scan on orderitems oi  (actual time=0.012..94.970 rows=77406 loops=1)
                          ->  Seq Scan on orders o  (actual time=43.308..51.969 rows=18630 loops=1)
                                Rows Removed by Filter: 15212
                    ->  Seq Scan on products p  (rows=2780)
              ->  Seq Scan on tva_categories tva  (rows=10)
        ->  HashAggregate (extra)  (actual time=91.238..91.679 rows=4220 loops=1)
              ->  Seq Scan on extra  (actual time=89.171..89.507 rows=6395 loops=1)
Execution Time: 1347.488 ms
```

| | |
|---|---|
| **Temps** | **1 347,49 ms** |
| Nœuds coûteux | **5 Seq Scans** en cascade + 4 Hash Joins |
| Lignes scannées | `orderitems` **77 406** + `orders` **33 842** (15 212 jetées) + `products` 2 780 + `extra` 6 395 + `tva_categories` 10 = **120 433 lignes lues pour 1 239 lignes de résultat** |
| Buffers | 2 291 blocs |
| Tri sur disque | non (mais `Planned Partitions: 8` — l'agrégat a anticipé un débordement) |
| Cause racine | Aucun index exploitable pour la jointure `orderitems.order_id` (pas colonne de tête de la PK) ni pour `extra.order_item_id` |

### M3 — Options : taux d'adoption et marge, 12 mois

```sql
EXPLAIN (ANALYZE, BUFFERS)
WITH lines AS (
  SELECT oi.order_item_id, oi.product_id, oi.quantity, o.merchant_id
  FROM orderitems oi INNER JOIN orders o ON o.order_id = oi.order_id
  WHERE o.creation_date >= now() - interval '12 months'
    AND o.state IN ('CLOSED','DONE') AND o.brand_status NOT IN ('DELETED','CANCELED')
),
prod_base AS (SELECT merchant_id, product_id, SUM(quantity) AS product_qty FROM lines GROUP BY 1,2),
opt AS (
  SELECT l.merchant_id, l.product_id, cao.id AS option_id, cao.title,
         SUM(oic.quantity * l.quantity) AS option_qty,
         SUM(oic.quantity * l.quantity * cao.extra_price) AS option_revenue_cents,
         SUM(oic.quantity * l.quantity * COALESCE(c.purchase_price,0)) AS option_cost_cents
  FROM order_item_configuration oic
  INNER JOIN lines l ON l.order_item_id = oic.order_item_id
  INNER JOIN configurable_attribute_options cao ON cao.id = oic.configuration_attribute_option_id
  LEFT JOIN components c ON c.component_id = cao.component_id
  GROUP BY 1,2,3,4
)
SELECT opt.*, pb.product_qty, ROUND(100.0 * opt.option_qty / NULLIF(pb.product_qty,0), 1) AS adoption_rate
FROM opt JOIN prod_base pb ON pb.merchant_id = opt.merchant_id AND pb.product_id = opt.product_id;
```

```
Hash Join  (actual time=857.931..1155.905 rows=2718 loops=1)
  Buffers: shared hit=2422 read=41, temp read=127 written=127
  CTE lines
    ->  Hash Join  (actual time=163.352..357.764 rows=40057 loops=1)
          ->  Seq Scan on orderitems oi  (rows=77406)
          ->  Seq Scan on orders o  (rows=18630)  Rows Removed by Filter: 15212
  ->  GroupAggregate  (actual time=295.550..591.138 rows=2718 loops=1)
        ->  Incremental Sort  (actual time=295.539..494.889 rows=17940 loops=1)
              Full-sort Groups: 272  Pre-sorted Groups: 146
              ->  Merge Join  (actual time=295.460..394.760 rows=17940 loops=1)
                    ->  Sort (configurable_attribute_options)  Sort Method: quicksort  Memory: 212kB
                    ->  Materialize -> Sort  Sort Method: quicksort  Memory: 1322kB
                          ->  Hash Join
                                ->  CTE Scan on lines l  (actual time=0.019..182.623 rows=40057 loops=1)
                                      Storage: Disk  Maximum Storage: 1654kB      <-- SPILL DISQUE
                                ->  Seq Scan on order_item_configuration oic  (rows=34796)
  ->  Hash -> HashAggregate (prod_base)  (actual time=561.755..562.052 rows=1239 loops=1)
        ->  CTE Scan on lines  (actual time=163.359..370.821 rows=40057 loops=1)
              Storage: Disk  Maximum Storage: 1654kB      <-- relu depuis le disque
Execution Time: 1156.993 ms
```

| | |
|---|---|
| **Temps** | **1 156,99 ms** |
| Nœuds coûteux | **Matérialisation sur disque de la CTE `lines`** (`Storage: Disk, Maximum Storage: 1654kB`), lue **deux fois** ; `Incremental Sort` + `Merge Join` + `Materialize` |
| **Tri / spill sur disque** | ✅ **oui** — `temp read=127 written=127` blocs |
| Lignes scannées | `orderitems` 77 406 + `orders` 33 842 + `order_item_configuration` 34 796 + `configurable_attribute_options` 3 140 + `components` 1 090 = **150 274 lignes** pour **2 718 lignes de résultat** |
| Cause racine | La CTE `lines` (40 057 lignes) est matérialisée sur disque puis relue intégralement par les deux branches. Aucun index ne permet de la restreindre. |

### Récapitulatif

| Métrique | Temps | Lignes scannées | Lignes rendues | Spill disque |
|---|---:|---:|---:|:---:|
| M1 — CA/jour/canal (29 établissements) | **426 ms** | 33 842 | 3 370 | non |
| M1bis — CA/jour (1 établissement) | **203 ms** | 18 974 | 348 | non |
| M2 — Mix produits + HT + suppléments | **1 347 ms** | 120 433 | 1 239 | non |
| M3 — Options : adoption + marge | **1 157 ms** | 150 274 | 2 718 | **oui** |

**Coût d'un chargement complet de la page** (11 onglets, dont plusieurs demandent 3 fenêtres — période, période précédente, N-1) : en ordre de grandeur, **8 à 12 secondes de temps base**, cache chaud, sur un jeu de 33 842 commandes.

### Extrapolation staging → production

**Je ne peux pas produire ce ratio : je n'ai pas eu accès à la base de production.** Ce qui est mesurable côté staging :

- 29 établissements enregistrés, **16 actifs** (`merchant.is_active`), **8 produisant des commandes** sur le dernier mois ;
- un établissement concentre **56 %** du volume (`merchant_id = 212`, Croq'Pizzas : 18 974 des 33 842 commandes) ;
- régime de croisière : **~1 700 commandes / mois** tous établissements confondus.

**Ce qui est certain sans connaître la production** : les temps ci-dessus proviennent de **Seq Scans**, dont le coût est **linéaire en nombre de lignes de la table** et **indépendant de la fenêtre demandée**. Un facteur ×10 sur le volume production donne donc directement ~4 s (M1), ~13 s (M2), ~12 s (M3) — et M3 passerait d'un spill de 1,6 MB à ~16 MB, bien au-delà du `work_mem` par défaut, avec un tri sur disque massif.

> **Nuance importante et honnête** : à 33 842 lignes, **une pré-agrégation ne se justifie pas encore par le volume**. Les 426 ms de M1 s'expliquent à 98 % par l'absence d'index, pas par la quantité de données. Poser les index manquants (§7.2 QW1) ramènerait vraisemblablement M1 sous les 50 ms. **La question à trancher est donc : quelle est la volumétrie production ?** — c'est elle, et non staging, qui arbitre entre « indexer » et « pré-agréger ». La réponse conditionne toute l'architecture.

---

## 6. Contraintes transverses

### 6.1 Fuseau horaire

| Question | Réponse mesurée |
|---|---|
| Comment est-ce stocké ? | Toutes les colonnes de date des tables de faits sont en **`timestamp with time zone`** — donc en UTC en interne. |
| Fuseau de session Postgres | `SELECT current_setting('TimeZone')` → **`UTC`** |
| Fuseau des établissements | `merchant.timezone` existe et vaut **`Europe/Paris` pour les 29 établissements** (`SELECT timezone, COUNT(*) FROM merchant GROUP BY 1`) |
| Le code en tient-il compte ? | **Partiellement.** Le module `stats` charge `merchant.timezone`, construit les bornes en heure locale puis convertit en UTC (`GetRevenue`, `ListRevenueHTByLocalDay`). Le module `pos/reports` **ne convertit pas** : `to_char(o.creation_date, 'YYYY-MM-DD')` s'exécute en UTC. |

**Réponse** : « une journée » **doit** se calculer dans le fuseau de l'établissement. Le modèle le permet (`merchant.timezone`), le module `stats` le fait déjà correctement — c'est le pattern à généraliser. Le rapport TVA est à corriger.

Impact concret aujourd'hui : `Europe/Paris` est UTC+1/+2, donc le rapport TVA en UTC rattache **les commandes de 00h00–01h59 (heure d'hiver) ou 00h00–02h59 (heure d'été) à la veille**. Mesuré : **632 commandes du périmètre CA (2,0 %) sont passées entre 00h00 et 05h59 heure de Paris.**

### 6.2 Jour métier

**Aucune notion de jour métier n'existe dans le code.** `getWeekStart` (`stats/repository.go`) et toutes les bornes journalières utilisent minuit à minuit dans le fuseau du merchant. Aucune colonne `business_date`, aucune constante de clôture.

Distribution horaire réelle (heure de Paris), périmètre CA :

```sql
SELECT EXTRACT(hour FROM creation_date AT TIME ZONE 'Europe/Paris')::int, COUNT(*)
FROM orders WHERE state IN ('CLOSED','DONE') AND brand_status NOT IN ('DELETED','CANCELED') GROUP BY 1;
```

| Heure | 00 | 01 | 02 | 03 | 04 | 05 | … | 12 | … | 19 | 20 | 21 | 22 | 23 |
|---|---:|---:|---:|---:|---:|---:|---|---:|---|---:|---:|---:|---:|---:|
| Commandes | 234 | 135 | 101 | 60 | 59 | 43 | | 3 453 | | **4 965** | 4 686 | 4 039 | 3 202 | 1 409 |

**632 commandes (2,0 %) tombent entre minuit et 6h.** L'activité post-minuit est réelle mais minoritaire, et décroît régulièrement (234 → 43) : cela ressemble à une queue de service du soir, pas à un service de nuit distinct.

Une piste existe pour définir le jour métier sans convention arbitraire : la table **`cash_registers`** (`start_date`, `end_date`, `closed`, `enclosed`, `final_cash_fund`, `closed_by`) matérialise les sessions de caisse — **710 sessions** en staging.

**➡️ Question ouverte Q2** — c'est une décision métier, pas technique.

### 6.3 Rétroactivité

```sql
SELECT COUNT(*) total,
  COUNT(*) FILTER (WHERE last_update > creation_date + interval '1 day')  AS modif_apres_j1,
  COUNT(*) FILTER (WHERE last_update > creation_date + interval '7 days') AS modif_apres_j7,
  COUNT(*) FILTER (WHERE last_update > creation_date + interval '30 days') AS modif_apres_j30,
  MAX(EXTRACT(epoch FROM (last_update - creation_date))/86400)::int AS max_delta_jours
FROM orders;
```

| Total | Modifiée > J+1 | > J+7 | > J+30 | Écart max |
|---:|---:|---:|---:|---:|
| 33 842 | **3 713 (11,0 %)** | **778 (2,3 %)** | **161 (0,5 %)** | **541 jours** |

**Réponse : oui, massivement.** 11 % des commandes sont modifiées plus d'un jour après leur création, 2,3 % plus d'une semaine après, et une commande a été modifiée **541 jours** après.

**Conséquence architecturale directe : une agrégation nocturne qui ne recalcule que J-1 sera fausse.** Il faut une **fenêtre glissante de recalcul**. Sur ces chiffres, une fenêtre de **7 jours** rattraperait 79 % des modifications tardives ((3 713 − 778) / 3 713) ; une fenêtre de **30 jours** en rattraperait 96 %. Les 161 modifications au-delà de 30 jours nécessitent soit un recalcul mensuel complet, soit une invalidation événementielle sur `last_update`.

> Précaution : `last_update` bouge aussi pour des raisons non financières (changement d'état logistique). Ces chiffres majorent donc les vraies modifications de montant. Mais ils bornent correctement la fenêtre à prévoir.

### 6.4 Devises et TVA

| Question | Réponse |
|---|---|
| Plusieurs devises ? | **Non.** Aucune colonne `currency` sur `merchant`, `orders`, `payments` ou `receipts`. `"EUR"` est **codé en dur** dans `stats/service.go`. Monodevise de fait, non modélisée. |
| Montants HT ou TTC ? | **Les deux, sans convention claire.** `orders.price` = TTC, `orders.ht` = HT (**faux à 18,2 %**, cf. P1), `orders.tva`. `orderitems.price` = **TTC**, le HT étant recalculé à la volée par `TTC × 100/(100+taux)`. Côté frontend : les onglets CA/Produits/Règlements affichent du TTC sans le dire, l'onglet Upsell affiche explicitement du **HT**. |
| Taux de TVA | 10 catégories, **8 avec `show_in_report = true`**. Taux réels : **5,5 %, 10 %, 20 %**, déclinés par mode de service (`IN` / `TAKE_AWAY` / `DELIVERY`). Plus `tva_id = 0` (« TVA Undefined », 0 %, désactivée) et `tva_id = -1` (frais de livraison 20 %, **désactivée mais utilisée** — P18). |
| Table TVA multi-tenant ? | **Non** : `tva_categories` n'a pas de `merchant_id`. Référentiel global partagé. |

Détail des taux :

| `tva_id` | `delivery_type` | Libellé | Taux | `show_in_report` | `enabled` |
|---:|---|---|---:|:---:|:---:|
| -1 | DELIVERY | TVA Delivery fees 20% | 20,0 | ❌ | ❌ |
| 0 | IN | TVA Undefined | 0,0 | ❌ | ❌ |
| 1 | TAKE_AWAY | TVA 5.5% | 5,5 | ✅ | ✅ |
| 2 | TAKE_AWAY | TVA 10% | 10,0 | ✅ | ✅ |
| 3 | TAKE_AWAY | TVA 20% | 20,0 | ✅ | ✅ |
| 5 | IN | TVA 10% | 10,0 | ✅ | ✅ |
| 6 | IN | TVA 20% | 20,0 | ✅ | ✅ |
| 7 | DELIVERY | TVA 10% | 10,0 | ✅ | ✅ |
| 8 | DELIVERY | TVA 5.5% | 5,5 | ✅ | ✅ |
| 9 | DELIVERY | TVA 20% | 20,0 | ✅ | ✅ |

> Le mock frontend affiche `by_rate: [10, 5.5, 20]` — cohérent avec le référentiel réel. Bon point.

### 6.5 Périmètre

| Question | Réponse |
|---|---|
| Combien d'établissements en production ? | **Inconnu — pas d'accès production.** En staging : **29 enregistrés, 16 actifs, 8 avec des commandes sur les 30 derniers jours.** → **Question ouverte Q1** |
| Un utilisateur peut-il en consulter plusieurs ? | **Non.** `users.merchant_id` est scalaire, non nul pour les 46 utilisateurs. `user.MerchantID` est une `string` dans tout le code Go. |
| Existe-t-il un concept de groupe / enseigne ? | **Embryonnaire et inutilisé** : table `brands` = **1 ligne** ; `merchant.brand_id` renseigné sur **3 merchants sur 29**, avec **1 seul `brand_id` distinct**. |
| Comptes admin | 17 utilisateurs sur 46 ont `admin = true` — mais `IsAdmin` élargit les permissions **dans** l'établissement, il ne franchit pas la frontière tenant. |

**➡️ L'onglet « Restaurants » n'a pas de fondation.** C'est un prérequis produit, pas un travail d'agrégation.

### 6.6 Rétention

**Aucune politique de purge, ni sur la donnée transactionnelle, ni sur les logs.**

- `grep -rn "DELETE FROM api_request_logs\|DELETE FROM audit_logs\|retention"` sur `internal/` : **aucun résultat** hors commentaires.
- Les seuls jobs de nettoyage sont `CleanupOldUpsellSuggestions` (mensuel, suggestions d'upsell) et `CleanupExpiredPasswordResets` (quotidien).
- `orders` remonte à **2022-12-23**, `customer` à **2022-03-17** : rien n'a jamais été purgé.
- `api_request_logs` (207 218 lignes / **51 MB**) et `audit_logs` (10 500 lignes / **56 MB**) sont les **deux plus grosses tables de la base**, devant toutes les tables de faits.

**Conséquences pour l'analytique** : (1) aucune contrainte de rétention ne limite la profondeur d'historique — le N-1 est disponible depuis 2022 ; (2) mais la croissance non bornée des tables de logs finira par dominer la taille de la base et le temps de sauvegarde ; (3) une table pré-agrégée doit elle aussi prévoir sa propre rétention dès sa conception.

---

## 7. Synthèse

### 7.1 Top 5 des risques

| Rang | Risque | Impact | Preuve |
|---|---|---|---|
| **R1** | **Deux définitions du CA coexistent dans l'API.** `stats` inclut Uber Eats/Deliveroo/ScanNOrder et `state IN ('CLOSED','DONE')` ; `pos/reports` les exclut et impose `state = 'CLOSED'` + `brand = 'WELLO_RESTO'`. Fuseaux différents (merchant vs UTC), bornes différentes (`< end` vs `<= 23:59:59`). | **Critique.** Deux écrans afficheront deux CA différents pour la même journée. Toute pré-agrégation figera l'une des deux définitions — et **rendra l'incohérence permanente**. Un rapport TVA est un document opposable : l'écart est aussi un risque comptable. | §4.3 |
| **R2** | **Le socle de données ne supporte pas les métriques promises.** 4 onglets sur 11 s'appuient sur des données absentes : upsell (`is_upsell` = **0 ligne**), couverts (**94,5 %** à zéro), typologie de remises (**inexistante**), paiement mobile (**aucun `mop`**). | **Critique.** Construire la chaîne d'agrégation avant de capter la donnée produit des écrans vides. Le coût est en **instrumentation POS/SNO/Kiosk**, pas en SQL. | §3.1 |
| **R3** | **La marge n'est pas reproductible.** Le coût matière vient de `components.purchase_price` (prix **courant**, non historisé). Aucun snapshot sur `orderitems`. | **Élevé.** La marge d'octobre 2025 **change** si le restaurateur met à jour un prix d'achat aujourd'hui. Une table pré-agrégée et un calcul à la volée donneront des résultats différents — sans qu'on puisse dire lequel est juste. Les KPI « Marge contributive » et « Impact marge » sont concernés. | §3, M9 |
| **R4** | **Aucune permission sur les routes analytiques.** `/stats/*` et `/pos/reports/*` n'ont que `authMiddleware`. `HasReportsViewAccess` / `HasFinancialsViewAccess` existent et ne sont **câblées nulle part**. | **Élevé.** Tout compte POS voit CA, marges, encaissements et **performance individuelle nominative des serveurs** (`ListUpsellByServer`, annulations par serveur). Enjeu RGPD sur des données de performance salariée. Une table pré-agrégée héritera du trou si le contrôle n'est pas posé maintenant. | §4.6 |
| **R5** | **Le CA HT stocké est faux sur 18,2 % du périmètre.** `orders.ht = 0` sur **5 718 / 31 437** commandes ; `price <> ht + tva` sur **6 050 (19,2 %)**. | **Élevé.** Toute métrique HT lue depuis `orders.ht` sous-estime le CA d'environ un cinquième. Le recalcul depuis les lignes est possible (`pos/reports` et `stats/upsell` le font déjà) mais **coûte une jointure sur `orderitems`** — c'est-à-dire la différence entre M1 (426 ms) et M2 (1 347 ms). | §2.5 P1 |

### 7.2 Quick wins

Classés par (valeur ÷ effort). Aucun ne demande de refonte.

| # | Action | Effort | Gain |
|---|---|---|---|
| **QW1** | Créer `idx_orders_merchant_creation (merchant_id, creation_date)` et `idx_orderitems_order_id (order_id)`. | 2 index | Supprime le Seq Scan de M1 et le Hash Join de M2. M1bis lit aujourd'hui 18 974 lignes pour en garder 9 864 : **~9 100 lectures inutiles éliminées par requête**. Probablement M1 sous 50 ms. **À faire avant toute décision de pré-agrégation** — le vrai coût n'est mesurable qu'après. |
| **QW2** | Câbler `middleware.RequirePermission(middleware.HasReportsViewAccess)` sur `/stats/*` et `HasFinancialsViewAccess` sur `/pos/reports/*`. | 4 lignes dans `routes.go` | Ferme R4. Les prédicats existent déjà. |
| **QW3** | Normaliser `brand_status` en majuscules à l'écriture, et utiliser `upper(brand_status)` dans les filtres. | 1 correctif + 1 migration de 36 lignes | Ferme P5 : des commandes annulées cessent d'être comptées dans le CA. |
| **QW4** | Poser `is_upsell = true` là où la ligne provient d'une suggestion. | Ciblé (POS/SNO/Kiosk) | **Rend vivant le seul onglet déjà branché.** Tout le SQL et l'UI existent (`stats/repository.go:398-465`, `UpsellAnalyticsTab.tsx`). Meilleur ratio valeur/effort de la liste. |
| **QW5** | Corriger le fuseau du rapport TVA : `to_char(creation_date AT TIME ZONE m.timezone, 'YYYY-MM-DD')`, et remplacer `<= date + 23:59:59` par `< date + 1 day`. | 3 lignes | Aligne le rapport TVA sur `stats`. Récupère les 632 commandes de nuit mal rattachées et la dernière seconde de chaque journée. |
| **QW6** | Brancher les onglets **CA**, **Commandes**, **Règlements** et **TVA** sur du SQL direct, sans pré-agrégation. | 4 endpoints | Ces 4 onglets sont en faisabilité **Directe**. À 426 ms (M1) + index QW1, un calcul à la volée avec cache Redis 5–15 min suffit largement. **~40 % de la page devient réelle sans nouvelle table.** |
| **QW7** | Ajouter une colonne de durée dans `api_request_logs` et installer `pg_stat_statements`. | 1 migration + 1 extension | Sans ça, l'arbitrage « indexer vs pré-agréger » restera fondé sur staging seul (§5). |
| **QW8** | Supprimer `AnalyticsTabs.tsx` (code mort) et corriger le tableau Top Clients (`top_clients` jamais produit). | Petit | Nettoie deux pièges pour l'implémentation à venir. |
| **QW9** | Poser un `redis.SetNX` comme verrou distribué autour des tâches cron. | Petit | `SetNX` existe déjà. Prérequis si une agrégation nocturne est ajoutée et que l'API tourne sur plus d'une instance. |

### 7.3 Questions ouvertes

Formulées pour être tranchées par oui/non ou par un chiffre.

| # | Question | Pourquoi ça bloque |
|---|---|---|
| **Q1** | **Combien de commandes contient la table `orders` en production, et combien d'établissements y sont actifs ?** (un `COUNT(*)` suffit) | **Détermine l'architecture.** Staging = 33 842 commandes ; à ce volume les index (QW1) suffisent et une pré-agrégation serait prématurée. Au-delà de ~2–3 M de lignes, elle devient nécessaire. Sans ce chiffre, l'arbitrage n'est pas défendable. |
| **Q2** | **Une journée d'exploitation se termine-t-elle à minuit, ou à une heure de clôture (ex. 5h) ?** Si clôture : la même pour tous les établissements, ou paramétrable ? | 632 commandes (2,0 %) tombent entre 00h et 06h. La réponse change la **clé primaire** de toute table pré-agrégée. Rétroactif et coûteux à changer après coup. La table `cash_registers` (710 sessions) pourrait fournir la borne réelle. |
| **Q3** | **Quelle définition du CA fait foi : celle de `stats` (toutes marques, ScanNOrder inclus) ou celle de `pos/reports` (Wello Resto seul, hors ScanNOrder, avec frais de livraison) ?** | Sans arbitrage, la pré-agrégation fige une incohérence produit et comptable. **Aucune ligne de code d'agrégation ne devrait être écrite avant cette réponse.** |
| **Q4** | **Le nombre de couverts doit-il devenir une saisie obligatoire au POS ?** (oui / non) | Renseigné sur 12,5 % du sur-place. Si non, les KPI « Couverts » et « Panier/couvert » doivent être **retirés de la maquette** de l'onglet Commandes. |
| **Q5** | **Un utilisateur doit-il pouvoir consulter plusieurs établissements ?** (oui / non) | `users.merchant_id` est scalaire ; `brands` a 1 ligne. Si oui, il faut un modèle groupe + habilitation **avant** de concevoir la table pré-agrégée, dont la clé de partitionnement en dépend. Si non, l'onglet « Restaurants » est à supprimer. |
| **Q6** | **La marge doit-elle être figée au moment de la vente, ou refléter les coûts courants ?** | Détermine s'il faut snapshoter le coût de revient sur `orderitems` (changement de schéma sur une table de 77 406 lignes) ou accepter que l'historique de marge soit mouvant. |
| **Q7** | **Sous quel délai maximal une commande passée peut-elle être régularisée ?** (un nombre de jours) | Mesuré : 11 % modifiées après J+1, 2,3 % après J+7, 0,5 % après J+30, max **541 jours**. Ce chiffre fixe la **largeur de la fenêtre glissante** de recalcul nocturne. |
| **Q8** | **Les remboursements doivent-ils apparaître dans les analyses ?** (oui / non) | `payments.operation_type` = `'SALE'` à 100 %, 23 commandes à `price < 0`. Si oui, il faut d'abord les modéliser — « CA net » est aujourd'hui indéfinissable. |
| **Q9** | **Faut-il une taxonomie de remises (Promotion / Happy Hour / Geste commercial / Fidélité / Code promo) ?** (oui / non) | L'onglet Remises repose entièrement dessus. Elle n'existe pas en base : `discount_name` est du texte libre. Sans elle, l'onglet se limite à un montant global. |
| **Q10** | **Quelle profondeur d'historique la page doit-elle couvrir ?** (12 mois ? 24 ? depuis l'origine ?) | Aucune politique de rétention n'existe ; les données remontent à 2022. Dimensionne la table pré-agrégée et sa propre rétention. |
| **Q11** | **Les 4 séries canal manquantes (`ubereats_takeaway`, `ubereats_delivery`, `deliveroo_takeaway`, `deliveroo_delivery`) sont-elles réellement attendues, ou la maquette est-elle en avance sur le besoin ?** | Les graphiques tracent 7 séries, les mocks n'en produisent que 3. Le croisement `brand × order_type` est dérivable, mais 2 749 commandes (8,1 %) ont `order_type NULL` et n'auront **aucun canal**. |

---

## Annexe — Méthode et reproductibilité

- **Accès** : `RENDER_STAGING_DATABASE_URL` (variable d'environnement présente sur le poste), `sslmode=require`.
- **Client** : `psycopg` 3.3.4 (aucun client `psql` disponible sur le poste ; démon Docker non démarré).
- **Garantie lecture seule** : chaque connexion positionne `conn.read_only = True` (transaction PostgreSQL `READ ONLY`) — toute écriture aurait été rejetée par le serveur, pas seulement par convention.
- **Requêtes exécutées** : uniquement `SELECT`, `EXPLAIN (ANALYZE, BUFFERS)` sur des `SELECT`, et lectures du catalogue (`information_schema`, `pg_class`, `pg_indexes`, `pg_constraint`, `pg_stat_user_indexes`, `pg_extension`).
- **Aucun** `INSERT` / `UPDATE` / `DELETE` / `CREATE` / `ALTER`. Aucun index créé, même à titre de test.
- **Aucun fichier du dépôt modifié** en dehors de ce rapport.
- Les scripts d'interrogation jetables ont été écrits dans le répertoire scratch de session, hors du dépôt.
