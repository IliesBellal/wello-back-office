# MESURES — Les 4 onglets (`POST /analytics/{revenue,orders,payments,vat}`)

> Suite de `AUDIT.md`, `PERIMETRE.md`, `PERF-INDEX.md`, `DROITS.md`. CA produit par
> PROMPT 03 Partie 1.6 / Livrable 4 ; Commandes/Règlements/TVA et le kit de mesure par
> PROMPT 04 ; correctif d'arrondi de ventilation + vérification staging de l'onglet TVA
> par PROMPT 06. La ligne de base à partir de laquelle décider, plus tard, s'il faut
> pré-agréger.

## État de ce document

**L'exactitude est vérifiée. Les temps ne le sont pas — et ne doivent pas l'être depuis
un poste de développement** (CPU de l'instance staging mesuré 11 à 33× plus lent qu'un
cœur normal, variance ×3 d'une exécution à l'autre, `PERIMETRE.md` §2.1 — un chiffre
mesuré ici serait activement trompeur, pas juste inutile).

Fait et vérifié (PROMPT 04) :
- les tests d'exactitude (`internal/modules/analytics/postgres_integration_test.go` et
  `postgres_integration_orders_payments_vat_test.go`) tournent contre un Postgres 16 de
  dev local (`docker-compose.postgres.yml`) et passent tous ;
- un correctif d'exactitude réel a été trouvé et corrigé en cours de route : la
  timeline CA (`GetRevenueTimeline`) appliquait un décalage horaire fixe, calculé une
  fois depuis le début de la période, à toutes les lignes — une commande créée après une
  bascule d'heure d'été dans la même fenêtre de requête (n'importe quelle fenêtre de 12
  mois) atterrissait dans le mauvais jour local. Corrigé en passant le nom de fuseau IANA
  à Postgres (`AT TIME ZONE 'Europe/Paris'`, résolu par ligne) plutôt qu'un offset
  numérique fixe. Couvert par un cas de test dédié (bascule du 2026-03-29/30).
- une vérification en lecture seule contre staging (`POSTGRES_URL` de
  `ib-welloresto-api/.vscode/launch.json`, transaction `READ ONLY`, aucune écriture) a
  confirmé, sur l'établissement `212` (Croq'Pizzas, le plus gros établissement PROD,
  9 694 commandes sur une fenêtre de 12 mois) :
  - le total CA du dépôt (`GetRevenueTotalsTTC`) est **identique au centime près** à un
    recalcul SQL indépendant (écrit à la main, pas le même code) ;
  - un établissement/période sans commande retourne bien 0/0, pas une erreur ;
  - les règlements (`GetPaymentsTotals`) sont identiques à un recalcul indépendant ;
  - l'écart entre le périmètre `analytics` et le périmètre `stats` (10 200 centimes,
    5 commandes sur cette fenêtre) s'explique **entièrement** par les 5 lignes à
    `brand_status` en minuscules que seul `analytics` exclut via `upper(...)` — `stats`
    ne le fait pas encore ;
  - l'écart entre `analytics` et `pos/reports` (-7 049 761 centimes, -3 718 commandes)
    s'explique **entièrement** par la somme de trois filtres que `pos/reports` applique
    et `analytics` non : commandes non-`WELLO_RESTO` (-6 861 671 centimes,
    -3 643 commandes), commandes `created_by IN ('-1','SCANNORDER')`
    (-188 090 centimes, -75 commandes), et 0 commande `state='DONE'` exclue sur ce
    périmètre (`pos/reports` ne garde que `state='CLOSED'`, mais aucune commande
    `WELLO_RESTO` de la fenêtre n'était en `DONE`). 6 861 671 + 188 090 + 0 =
    7 049 761 — reconciliation exacte au centime.
  - ce chiffrage précis (méthode + delta ligne par ligne) est repris dans la description
    de la PR de cette session — pas seulement constaté ici.
- découverte en vérifiant les couverts sur staging : l'établissement `212` a des
  couverts renseignés sur **12 commandes sur 9 694** (≈0,12 %) — quasi certainement des
  restes de saisie de test, pas une vraie couverture. `internal/modules/analytics`
  applique donc un seuil de matérialité (20 % des commandes de la période, voir
  `service.go`'s `coversCoverageThreshold`) avant d'afficher `covers_data_available:
  true` — un simple test « au moins une commande » aurait affiché un KPI
  précis-en-apparence construit sur du bruit.

Fait et vérifié (PROMPT 06, 2026-09-03) — onglet TVA, seul des quatre à n'avoir été
vérifié qu'en local jusqu'ici :
- **arrondi de la ventilation corrigé.** `by_rate[]`/`by_channel[]` sommaient chacun
  indépendamment leur propre part arrondie ("sum first, round once" par groupe), sans
  garantie de retomber sur `current_period.total_ht_cents` — sur un onglet TVA, un écart
  de quelques centimes entre les lignes et le total lit comme un bug, pas comme une
  note de bas de page comptable. Corrigé par une répartition à la méthode du plus grand
  reste (`apportion.go`, `apportionCents`) : chaque groupe part de sa somme brute
  (non arrondie), le total déjà calculé (`GetVATTotals`) est distribué en entier sur les
  groupes, et le(s) dernier(s) centime(s) vont aux groupes dont le reste fractionnaire
  est le plus grand. `by_rate`/`by_channel` sommaient déjà exactement au total pour CA/
  Commandes/Règlements (sommes entières, sans arrondi intermédiaire) — seule la TVA
  (HT recalculé par division) avait le défaut ; des tests de non-régression
  (`TestApportionCents_SumsToTotal` et les assertions ajoutées aux tests d'intégration
  Postgres existants) verrouillent désormais l'égalité exacte pour les 4 onglets ;
- vérification en lecture seule contre staging (établissement `212`, fenêtre de 12 mois
  se terminant le 2026-09-03) :
  - `GetVATTotals` (TTC=18 837 308, HT=16 488 359, TVA=2 348 949) est **identique au
    centime près** à un recalcul SQL indépendant, écrit à la main (jointure identique
    mais agrégée côté Go plutôt que par `SUM` SQL, sur 17 496 lignes) ;
  - `by_rate` (4 taux : 0, 5,5, 10, 20 %) et `by_channel` (7 canaux) somment chacun
    **exactement** à HT=16 488 359 et TTC=18 837 308 ;
  - `tva_id = -1` (frais de livraison, 20 %, `enabled = false`, `show_in_report = false`,
    confirmé sur staging) : la jointure `htLineExpr`/`htLineJoins` est inconditionnelle
    sur ce `tva_id`, donc une ligne produit qui y pointerait serait comptée — mais
    **0 ligne d'`orderitems` du merchant 212 n'y pointe réellement** (vérifié). Plus
    important, une confusion trouvée en vérifiant : l'ancien commentaire du code
    affirmait que `tva_id = -1` couvrait les frais de livraison, mais
    `orders.delivery_fees` (le montant réel des frais) n'est **jamais lu** par
    `GetVATTotals`/`GetVATByRate`/`GetVATByChannel` — ces requêtes ne portent que sur
    `orderitems`. Corrigé dans le code (`repository.go`'s `GetVATTotals` doc comment) :
    la décision documentée est maintenant « pas de frais de livraison dans l'onglet TVA
    analytique, contrairement à `pos/reports/tva` », pas « inclus via `tva_id=-1` » ;
  - **écart avec `POST /pos/reports/tva` chiffré au centime** (TTC analytics − TTC
    pos/reports = 9 790 159 centimes) :
    | Filtre nommé | TTC (centimes) | Commandes |
    |---|---:|---:|
    | Commandes hors `WELLO_RESTO` (Uber Eats/Deliveroo), exclues par `pos/reports` | 9 722 969 | 3 643 |
    | Commandes ScanNOrder (`created_by IN ('-1','SCANNORDER')`), exclues par `pos/reports`, dans le périmètre `WELLO_RESTO` | 175 790 | 75 |
    | `state='DONE'` exclu par le filtre `state='CLOSED'` de `pos/reports` (dans le périmètre WELLO_RESTO/non-ScanNOrder) | 0 | 0 |
    | Lignes `tva.show_in_report=false` exclues par `pos/reports` (même périmètre) | 0 | 0 |
    | `orders.delivery_fees`, **ajoutés par** `pos/reports` (sa branche `UNION ALL` sur `tva_id=-1`) mais absents de l'onglet analytique — joue dans le sens inverse des 4 lignes ci-dessus | **−108 600** | 362 |

    9 722 969 + 175 790 + 0 + 0 − 108 600 = **9 790 159** — réconciliation exacte au
    centime, reprise dans la description de la PR de cette session (pas seulement
    constatée ici, comme pour l'écart CA/`pos/reports` plus haut) ;
  - libellé de l'onglet resserré à une phrase (`VATAnalyticsTab.tsx`, wello-back-office) :
    *« Vue analytique, pas un document comptable — elle diffère par construction du
    rapport TVA officiel (Point de vente → Rapports → TVA), qui exclut les marketplaces
    et ScanNOrder. »*

Fait et vérifié (PROMPT 09, 2026-09-04) — TVA des frais de livraison (C5), retrait de
l'onglet Tags (C4), et revue de matérialité des 3 autres onglets branchés :

- **frais de livraison inclus dans l'onglet TVA analytique.** Décision : un
  restaurateur qui consulte sa TVA collectée s'attend à y voir celle des frais de
  livraison — `GetVATTotals`/`GetVATByRate`/`GetVATByChannel`
  (`internal/modules/analytics/repository.go`) unionnent désormais
  `orderitems` (déjà en place) avec `orders.delivery_fees` via un second bloc
  `UNION ALL` joint sans condition à `tva_categories WHERE tva_id = -1`, à l'image de
  la branche `pos/reports.GetTVAReportData` — mêmes deux blocs, seule la portée diffère
  (`AnalyticsOrdersScope`, tous canaux, contre le périmètre WELLO_RESTO/CLOSED/
  non-ScanNOrder de `pos/reports`).
- **`tva_id = -1` : décision documentée dans le code, pas seulement ici**
  (`GetVATTotals`'s doc comment, repository.go). Cette catégorie est
  `enabled = false`, `show_in_report = false` en référentiel tout en étant utilisée par
  des commandes PROD réelles (frais de livraison effectivement facturés) — désactivée
  au sens « ne pas la proposer à la création d'un produit », pas au sens « son taux ne
  s'applique à rien ». Traitée exactement comme `pos/reports` la traite déjà : jointe
  sans condition sur `enabled`/`show_in_report`, dans les deux endpoints, pour la même
  raison (une catégorie taguée « n'existe pas côté écran de configuration » n'a pas de
  raison de faire disparaître un montant réel de TVA collectée).
- **vérification en lecture seule contre staging** (`POSTGRES_URL` de
  `ib-welloresto-api/.vscode/launch.json`, transaction `READ ONLY`, aucune écriture,
  aucune mesure de durée), établissement `212`, fenêtre de 12 mois se terminant le
  2026-09-04 :
  - `GetVATTotals` (nouveau, avec frais de livraison) : TTC=18 907 918, HT=16 543 422,
    TVA=2 364 496 — identique à un recalcul SQL indépendant écrit à la main ;
  - delta vs. l'ancien calcul (sans frais de livraison) : +120 300 TTC / +100 250 HT,
    exactement égal à un recalcul indépendant des frais de livraison seuls sur le même
    périmètre (`orders.delivery_fees`, tous canaux, `tva_id=-1` à 20 %) ;
  - `by_rate`/`by_channel` recalculés, sommes vérifiées égales au centime au nouveau
    total (garantie déjà posée par PROMPT 06 pour l'apportionnement — inchangée, juste
    revérifiée avec le nouveau total) ;
  - **tableau de réconciliation avec `POST /pos/reports/tva` mis à jour** (remplace
    celui de PROMPT 06 ci-dessus — même établissement, nouvelle fenêtre de 12 mois se
    terminant le 2026-09-04 au lieu du 2026-09-03, d'où des montants légèrement
    différents pour les lignes déjà connues) :

    | Filtre nommé | TTC (centimes) | Commandes |
    |---|---:|---:|
    | Commandes hors `WELLO_RESTO` (lignes produit + leurs propres frais de livraison), exclues par `pos/reports` | 9 722 969 | 3 643 |
    | Commandes ScanNOrder (lignes produit + leurs propres frais de livraison), exclues par `pos/reports`, dans le périmètre `WELLO_RESTO` | 188 090 | 75 |
    | `state='DONE'` exclu par le filtre `state='CLOSED'` de `pos/reports` (lignes + frais de livraison, périmètre WELLO_RESTO/non-ScanNOrder) | 0 | 0 |
    | Lignes `tva.show_in_report=false` exclues par `pos/reports` (même périmètre, hors branche frais de livraison qui ne filtre jamais sur ce flag, ni ici ni côté pos/reports) | 0 | 0 |

    9 722 969 + 188 090 + 0 + 0 = **9 911 059**, exactement égal à
    `analytics.TotalTTCCents (18 907 918) − pos/reports.TTC (8 996 859)` — réconciliation
    exacte au centime, aucun résidu.
  - **la ligne `delivery_fees` du tableau du prompt précédent tombe bien à zéro** —
    elle a disparu du tableau ci-dessus plutôt que d'être encore listée à 0, parce
    qu'elle n'a plus de raison d'être nommée séparément : les deux côtés l'incluent
    désormais (vérifié : 108 000 centimes / 360 commandes identiques des deux côtés,
    dans le périmètre WELLO_RESTO/CLOSED/non-ScanNOrder). Un écart résiduel de 12 300
    centimes est apparu lors de la première itération de cette vérification — dû aux
    frais de livraison des commandes ScanNOrder (elles aussi hors périmètre
    `pos/reports`, mais qui n'avaient pas encore leur propre frais de livraison compté
    dans le bucket « ScanNOrder » du tableau) : nommé, corrigé en élargissant ce bucket
    à lignes+frais plutôt que lignes seules, pas laissé comme résidu inexpliqué.
  - tests d'intégration : nouveau `TestVATDeliveryFees_Postgres`
    (`internal/modules/analytics/postgres_integration_vat_delivery_fees_test.go`) —
    TTC/HT combinés, fusion dans le même groupe de taux qu'une ligne produit à 20 %,
    attribution au bon canal, absence de frais fantôme sur une commande sans frais de
    livraison. `TestOrdersPaymentsVAT_Postgres` (accuracy pré-existante) repassé sans
    modification — aucune régression. Exécutés contre le Postgres 16 de dev local
    (`docker-compose.postgres.yml`), tous verts.
- **onglet Tags retiré** (C4) : voir `TAGS_RETRAIT.md` pour le détail — aucun
  établissement PROD n'a de tags (`AUDIT.md` P17 : les 192 associations appartiennent à
  un établissement de test et à l'établissement inactif 237), donc rien à afficher même
  une fois branché. Navigation, composant inline (`renderTagsTab`), mock
  (`getTagsAnalytics`/`exportTagsCSV`) et état de filtre (`selectedTags`, référentiel
  `['Végétarien','Vegan','Sans gluten']` qui ne correspondait déjà à aucune donnée)
  retirés. Tables `tags`/`product_tags` et gestion des tags produit ailleurs dans
  l'app (menu, `TagFilter.tsx` réutilisé par `OrganizeModal.tsx`) non touchées.
- **revue de matérialité des 3 autres onglets branchés** (CA, Commandes, Règlements —
  TVA traité ci-dessus, Upsell hors périmètre des « 4 onglets »). Aucun seuil
  supplémentaire ajouté — le patron des couverts (`coversCoverageThreshold`) ne
  s'applique nulle part ailleurs, pour deux raisons vérifiées, pas supposées :
  - toutes les métriques de ces 3 onglets sont dérivées de colonnes obligatoires,
    toujours renseignées pour toute commande close (montant, canal via brand/order_type,
    méthode de paiement) — pas d'équivalent au caractère optionnel/rarement saisi de
    `places_settings` (couverts) ;
  - les seuls calculs de pourcentage sensibles à une donnée de référence proche de zéro
    (`pctChange`, évolution vs. période précédente / année précédente) sont déjà gardés
    dans les 4 composants d'onglet (`RevenueAnalyticsTab.tsx`, `OrdersAnalyticsTab.tsx`,
    `PaymentsAnalyticsTab.tsx`, `VATAnalyticsTab.tsx`) : `if (reference === 0) return
    null`, avec le commentaire explicite « a 0 -> N% change would be
    meaningless/infinite » — vérifié présent identiquement dans les 4 fichiers, pas
    seulement documenté ;
  - le seul autre champ conditionnel de ce type (`avg_basket_per_cover_cents`) est déjà
    gardé côté backend par `coversCoverageThreshold` et côté frontend par un affichage
    « Donnée non saisie » explicite (`OrdersAnalyticsTab.tsx`) quand
    `covers_data_available` est faux — déjà couvert, rien à ajouter.

Non fait, par construction (règle absolue de cette session) :
- aucune mesure de durée, ni depuis ce poste, ni contre staging ;
- `EXPLAIN ANALYZE` n'a été exécuté qu'à titre de *smoke test de compilation* du kit de
  mesure ci-dessous, contre le Postgres de dev local (données non représentatives — ne
  pas lire les temps qu'il produit comme des mesures).

## Le kit de mesure — `cmd/analytics_bench`

Nouveau binaire autonome, `ib-welloresto-api/cmd/analytics_bench`. Trois modes, protocole
`PERF-INDEX.md` §1.2 (5 exécutions, la première jetée, médiane des 4 restantes, écart
>×1,5 signalé).

### Prérequis

- L'API doit être promue sur staging (le kit l'attaque en HTTP).
- Un jeton par établissement PROD (`212,228,225,226,231,235,234,236`) — chaque jeton est
  scopé à exactement un établissement (`ResolveAccessibleMerchants`), donc pas de jeton
  unique multi-établissements possible. Fichier JSON `{"212": "…", "228": "…", …}`,
  **jamais commité** (garder hors du dépôt, ex. `~/secrets/analytics-bench-tokens.json`).
- `POSTGRES_URL` de staging en lecture seule, pour les modes `pos-impact` et `fusible`
  (sonde POS directe + `EXPLAIN ANALYZE`).

### Créneau

**3 h – 5 h.** Les modes `pos-impact` et `fusible` chargent la base et ne doivent jamais
tourner pendant un service. Le mode `grid` seul est plus léger mais reste à éviter en
heure de pointe (8 établissements × 3 fenêtres × 4 endpoints × froid/chaud = plusieurs
dizaines de requêtes analytiques).

### Durée approximative

`grid` : ~5–10 min (dizaines de requêtes séquentielles, chacune potentiellement
plusieurs secondes sur cette instance). `pos-impact` : ~30 s de référence + durée de la
charge + au moins 3 min de suivi = **5–10 min minimum**, plus si le POS ne récupère pas
vite. `fusible` : ~1–2 min.

### Commandes exactes

```bash
# 1. Grille de timing des 4 endpoints
go run ./cmd/analytics_bench \
  --mode=grid \
  --base-url=https://<host-staging> \
  --tokens-file=/chemin/hors-repo/tokens.json \
  --out=grid-results.md

# 2. Impact POS (LA mesure la plus importante — à rejouer avant/après migration 087)
go run ./cmd/analytics_bench \
  --mode=pos-impact \
  --base-url=https://<host-staging> \
  --tokens-file=/chemin/hors-repo/tokens.json \
  --postgres-url="$POSTGRES_URL" \
  --pos-impact-followup=5m \
  --out=pos-impact-avant-087.md
# ... appliquer la migration 087 ...
go run ./cmd/analytics_bench \
  --mode=pos-impact \
  --base-url=https://<host-staging> \
  --tokens-file=/chemin/hors-repo/tokens.json \
  --postgres-url="$POSTGRES_URL" \
  --pos-impact-followup=5m \
  --out=pos-impact-apres-087.md

# 3. Fusible (statement_timeout, spill work_mem, 3 requêtes concurrentes)
go run ./cmd/analytics_bench \
  --mode=fusible \
  --base-url=https://<host-staging> \
  --tokens-file=/chemin/hors-repo/tokens.json \
  --postgres-url="$POSTGRES_URL" \
  --out=fusible-results.md
```

Chaque commande écrit un tableau Markdown directement collable dans les sections
ci-dessous.

## Tableau à remplir — grille des 4 endpoints

Généré par `--mode=grid`. Colonnes : établissement(s), fenêtre, `include_ht` (CA
seulement), cache, durée bout-en-bout médiane, lignes rendues, statut.

| Endpoint | Établissements | Fenêtre | include_ht | Cache | Durée bout-en-bout (ms) | Lignes rendues | Statut |
|---|---|---|---|---|---:|---:|---|
| `POST /analytics/revenue` | 1 (212) | 1 mois | true | froid | _non mesuré_ | | |
| `POST /analytics/revenue` | 1 (212) | 1 mois | true | chaud | _non mesuré_ | | |
| `POST /analytics/revenue` | 1 (212) | 12 mois | true | froid | _non mesuré_ | | |
| `POST /analytics/revenue` | 1 (212) | 12 mois | true | chaud | _non mesuré_ | | |
| `POST /analytics/revenue` | 1 (212) | 12 mois | false | froid | _non mesuré_ | | |
| `POST /analytics/revenue` | 1 (212) | 12 mois | false | chaud | _non mesuré_ | | |
| `POST /analytics/revenue` | 1 (212) | 24 mois | true | froid | _non mesuré_ | | |
| `POST /analytics/revenue` | 8 (séparés) | 1 mois | true | froid | _non mesuré_ | | |
| `POST /analytics/revenue` | 8 (séparés) | 12 mois | true | froid | _non mesuré_ | | |
| `POST /analytics/revenue` | 8 (séparés) | 24 mois | true | froid | _non mesuré_ | | |
| `POST /analytics/orders` | 1 (212) | 1 mois | — | froid | _non mesuré_ | | |
| `POST /analytics/orders` | 1 (212) | 12 mois | — | froid/chaud | _non mesuré_ | | |
| `POST /analytics/orders` | 8 (séparés) | 12 mois | — | froid | _non mesuré_ | | |
| `POST /analytics/payments` | 1 (212) | 1 mois | — | froid | _non mesuré_ | | |
| `POST /analytics/payments` | 1 (212) | 12 mois | — | froid/chaud | _non mesuré_ | | |
| `POST /analytics/payments` | 8 (séparés) | 12 mois | — | froid | _non mesuré_ | | |
| `POST /analytics/vat` | 1 (212) | 1 mois | — | froid | _non mesuré_ | | |
| `POST /analytics/vat` | 1 (212) | 12 mois | — | froid/chaud | _non mesuré_ | | |
| `POST /analytics/vat` | 8 (séparés) | 12 mois | — | froid | _non mesuré_ | | |

Plan d'exécution (`EXPLAIN ANALYZE`) à coller ici pour les points les plus lents une fois
mesurés — `--mode=fusible` en produit un pour la requête HT la plus lourde.

## Tableau à remplir — impact POS

Généré par `--mode=pos-impact` (sonde `orderitems`/`payments` par `order_id`, même
requête que `order_life_cycle.GetPaymentsForOrder` — le chemin le plus chaud du POS,
~35 ms → ~0,2 ms avec la migration 087).

| Mesure | Avant migration 087 | Après migration 087 |
|---|---:|---:|
| Référence sonde (médiane, 30 s avant charge) | _non mesuré_ | _non mesuré_ |
| Pic sonde pendant la charge (12 mois × 8 étab.) | _non mesuré_ | _non mesuré_ |
| Temps de retour à la normale (≤×1,5 la référence) | _non mesuré_ | _non mesuré_ |
| Retour atteint dans les 3 min de suivi ? | _non mesuré_ | _non mesuré_ |

**Ce dernier chiffre décide si la page Analyses est utilisable pendant le service.**

## Tableau à remplir — vérification du fusible

Généré par `--mode=fusible`.

| Question | Résultat |
|---|---|
| CA 12 mois + `include_ht=true` : sous les 4 000 ms de `statement_timeout` ? | _non mesuré_ |
| Marge avant le fusible (ms) | _non mesuré_ |
| Spill disque détecté à 16 Mo `work_mem` (`EXPLAIN ANALYZE`, requête HT la plus lourde) ? | _non mesuré_ |
| 3 requêtes analytiques non-cachées simultanées (`AnalyticsMaxOpenConns=2`) : la 3ᵉ attend / échoue / passe ? | _non mesuré_ |

## Le fusible — budget mémoire (calculé, pas mesuré)

Instance Render Basic : 256 Mo de RAM, dont 64 Mo de `shared_buffers`.

```
pire cas = work_mem × nœuds mémoire par requête × connexions analytiques simultanées
         = 16 Mo   × 4                          × 2
         = 128 Mo
+ shared_buffers (64 Mo) = 192 Mo
reste pour l'OS, le pool POS (15 connexions, work_mem par défaut) et les autres process : 64 Mo
```

Valeurs déployées (`internal/database/postgres.go`) :
- `AnalyticsMaxOpenConns = 2` — jamais plus sans refaire ce calcul ;
- `AnalyticsWorkMemMB = 16`, appliqué en `SET LOCAL work_mem` par transaction analytique,
  jamais en global ;
- `AnalyticsStatementTimeoutMS = 4000`, `SET LOCAL statement_timeout` par transaction.

## `pg_stat_statements`

**Vérifié en lecture seule contre staging (2026-09-03), pas seulement documenté.**

- `SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements'` : disponible,
  `default_version = 1.12`, `installed_version` NULL (pas encore installée).
- Rôle de connexion `welloresto_api` : `rolsuper = false`, `rolcreatedb = true`.
- `SHOW shared_preload_libraries` : **refusé** (« permission denied to examine
  shared_preload_libraries ») — impossible de confirmer depuis ce rôle si la
  bibliothèque partagée est effectivement préchargée, ce qui conditionne le
  fonctionnement réel de l'extension indépendamment de `CREATE EXTENSION`. La
  disponibilité dans `pg_available_extensions` est un bon signe mais pas une garantie.
- Migration préparée, **non appliquée** : `migrations/todo/112_pg_stat_statements.{up,down}.sql`.
  Le premier `CREATE EXTENSION` réel est le test qui compte, pas cette vérification.

## Arbitrage à trancher : coût du recalcul HT

`GetRevenueTotalsHT`/`GetVATTotals` (`internal/modules/analytics/repository.go`)
recalculent le HT ligne par ligne via une jointure à 4 tables — parce que
`orders.ht`/`orders.tva` valent 0 pour 100 % des commandes Uber Eats et Deliveroo
(`PERIMETRE.md` §1.5). C'est structurellement plus coûteux qu'un simple
`SUM(orders.price)` (TTC).

**Ce coût n'est toujours pas mesuré** (mesure de temps interdite depuis cet
environnement). L'endpoint CA expose `include_ht` (défaut `true`) pour pouvoir désactiver
le calcul HT depuis le frontend seul si la mesure ci-dessus le montre trop cher.
Recommandation à ce stade, sans mesure : garder `include_ht=true` par défaut jusqu'à la
première mesure réelle sur staging.

**Note sur les arrondis (TVA) — mise à jour PROMPT 06, corrigé :** `by_rate[]`/
`by_channel[]` de l'onglet TVA sommaient auparavant chacun leur propre part arrondie
indépendamment ("sum first, round once" par groupe), sans garantie de retomber sur
`current_period.total_ht_cents`. Sur un onglet TVA cet écart de quelques centimes lit
comme un bug, pas comme une note de bas de page comptable — corrigé par une répartition
au plus grand reste (`apportion.go`, `apportionCents`) : voir la section "Fait et
vérifié (PROMPT 06...)" plus haut. `models.go`'s `VATRateTotal`/`VATChannelTotal`
documentent maintenant la garantie inverse : la somme des parts égale exactement le
total, toujours.
