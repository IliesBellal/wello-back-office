# Index analytiques — mesures avant / après

> Phase 3 du chantier analytics. Suite de [`AUDIT.md`](AUDIT.md) et [`PERIMETRE.md`](PERIMETRE.md).
> Base : `welloresto_staging` (PostgreSQL 18.4, Render Frankfurt). Mesures du **2026-08-24**.
> Migration produite : `ib-welloresto-api` → `migrations/087_analytics_indexes.{up,down}.sql`.

---

## 0. Résumé

| | |
|---|---|
| Index évalués | **7** |
| **Retenus** | **4** — `orders(merchant_id, creation_date)`, `orderitems(order_id)`, `extra(order_item_id)`, `payments(order_id)` |
| **Écartés** | **2** — `orders(creation_date)`, `payments(merchant_id, payment_date)` |
| **Déjà présent** | **1** — `order_item_configuration(order_item_id)`, rien à faire |
| Coût disque | **3,12 Mo** pour 31 Mo de tables de faits |
| Gain sur les requêtes **sélectives** | **×2,06 à ×570** |
| Gain sur les **agrégations pleine table** | **aucun** (×0,81 à ×1,10, dans le bruit) |
| Multi-établissement (`= ANY()`) | ✅ index utilisé à **1, 5 et 20** `merchant_id` |

**Le résultat structurant** : les index ne servent pas la page Analyses telle qu'elle est décrite dans `AUDIT.md` §5 — ils ne font rien pour une agrégation qui balaie 12 mois. Ils servent **les requêtes sélectives**, et surtout **les lectures de commande** (×100), qui sont la requête la plus fréquente de toute l'application.

---

## 1. Protocole de mesure

### 1.1 Pourquoi le protocole de `AUDIT.md` n'était pas exploitable

`AUDIT.md` §5 rapporte une exécution unique par requête. Or (cf. [`PERIMETRE.md`](PERIMETRE.md) §2.1) l'instance présente **une variance de ×3 sur la même requête** : M1 a été relevé à 297 ms puis 877 ms au cours de la même série. Une mesure isolée n'a donc aucune valeur, et un écart de ×1,3 entre deux mesures séparées n'est pas un signal.

### 1.2 Protocole retenu — A/B entrelacé

Chaque index est créé **puis supprimé** alternativement, **dans une seule transaction annulée** :

```
BEGIN
  (mesure de réchauffage, jetée)
  répéter N fois :
      mesurer SANS index
      CREATE INDEX ... ; ANALYZE table
      mesurer AVEC index
      DROP INDEX ...
ROLLBACK          -- rien n'est conservé
```

Deux propriétés :
- **le même bruit CPU frappe les deux bras**, puisqu'ils sont mesurés à quelques secondes d'intervalle ;
- **aucun index ne survit**, le `ROLLBACK` est dans un `finally` et la fermeture de connexion annulerait de toute façon.

Chaque point de mesure est le **`Execution Time` rapporté par `EXPLAIN (ANALYZE)`** — la durée serveur, hors RTT réseau (23,9 ms) et hors transfert du jeu de résultats. La **médiane** est retenue ; le **minimum** est aussi indiqué, car il approche le coût réel hors contention de voisinage.

**Seuil de significativité : ×1,5.** En dessous, l'écart n'est pas distinguable du bruit de l'instance et n'est pas retenu comme un gain.

### 1.3 Vérification de l'état final

```sql
SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public'
AND tablename IN ('orders','orderitems','payments','extra','order_item_configuration');
-- 11, soit exactement le compte initial
```

Aucun index de test n'a survécu à la phase 3.

---

## 2. Tableau récapitulatif

Médianes du `Execution Time` serveur, protocole entrelacé.

| # | Requête | Index appliqués | Avant | Après | **Facteur (médiane)** | Facteur (min) | Retenu |
|---|---|---|---:|---:|---:|---:|:--:|
| **R1** | **Lecture des lignes de 10 commandes** | `orderitems(order_id)` + `extra(order_item_id)` | 5,0 ms | **0,1 ms** | **×99,8** | ×108,9 | ✅ |
| **R2** | **Lecture des règlements de 10 commandes** | `payments(order_id)` | 29,6 ms | **0,1 ms** | **×570,1** | ×107,0 | ✅ |
| **R3** | **Détail des règlements, 5 étab., 3 mois** | `orders(merchant_id, creation_date)` + `payments(order_id)` | 314,3 ms | **130,6 ms** | **×2,41** | ×21,9 | ✅ |
| **M1bis** | **CA/jour, 1 étab., 12 mois** | `orders(merchant_id, creation_date)` | 173,8 ms | **84,2 ms** | **×2,06** | ×1,72 | ✅ |
| M1-any5 | CA/jour, 5 étab., 12 mois | `orders(merchant_id, creation_date)` | 311,2 ms | 282,6 ms | ×1,10 | ×1,25 | ➖ |
| M1-any20 | CA/jour, 20 étab., 12 mois | `orders(merchant_id, creation_date)` | 352,7 ms | 278,5 ms | ×1,27 | ×1,03 | ➖ |
| M2s | Mix produits, 1 étab., 12 mois | 3 index combinés | 756,8 ms | 928,9 ms | ×0,81 | ×1,05 | ➖ |
| M3s | Options, 1 étab., 12 mois | 2 index combinés | 539,9 ms | 491,7 ms | ×1,10 | ×0,92 | ➖ |

Légende : ✅ gain significatif · ➖ dans le bruit, ni gain ni perte mesurable.

Mesures non entrelacées, conservées pour les candidats écartés :

| Requête | Index testé | Avant | Après | Facteur | Décision |
|---|---|---:|---:|---:|---|
| M1 (toutes marques, 12 mois) | `orders(creation_date)` | 378,6 ms | 374,7 ms | **×1,01** | **écarté** |
| Ventilation encaissements, 5 étab. | `payments(merchant_id, payment_date)` | 355,8 ms | 372,4 ms | **×0,96** | **écarté** |
| M1 (toutes marques, 12 mois) | `orders(merchant_id, creation_date)` | 437,7 ms | 374,0 ms | ×1,17 | plan dégradé, cf. §4.1 |
| M2 pleine table, 12 mois | `orderitems(order_id)` + `extra(order_item_id)` | 1 380,9 ms | 1 471,1 ms | ×0,94 | aucun effet |

---

## 3. Index retenus

### 3.1 `orders (merchant_id, creation_date)` — 1 056 kB

**Motif.** Forme canonique de toute requête analytique : un ou plusieurs établissements croisés avec une fenêtre de dates. L'index existant `idx_orders_idx_orders_merchant_id` ne porte que `merchant_id` : la date reste un filtre appliqué après lecture.

**Effet structurel** (déterministe, donc non soumis au bruit) :

| | Sans index | Avec index |
|---|---|---|
| Nœud | `Index Scan` sur `merchant_id` | `Index Scan` sur `(merchant_id, creation_date)` |
| `Index Cond` | `merchant_id = '212'` | `merchant_id = '212' AND creation_date >= …` |
| Lignes retenues | 9 864 | 9 851 |
| **Lignes lues puis jetées** | **9 123** | **830** |

**91 % des lectures inutiles disparaissent.** Ce chiffre-là ne bouge pas d'une exécution à l'autre.

**Gain temporel : ×2,06** (médiane), ×1,72 (min) sur le CA quotidien d'un établissement sur 12 mois.

#### Contrainte multi-établissement : validée

Le chantier multi-établissement imposera `merchant_id = ANY($1)`. Testé à 1, 5 et 20 valeurs :

| Cardinalité | Plan **sans** index | Plan **avec** index | `Index Searches` | Lignes jetées : sans → avec |
|---|---|---|---:|---|
| **1** | `Index Scan` (merchant_id) | `Index Scan` (composite) | 1 | 9 123 → **830** |
| **5** | `Index Scan` (merchant_id) | `Index Scan` (composite) | 3 | 10 866 → **1 239** |
| **20** | **`Seq Scan`** ⚠️ | `Index Scan` (composite) | 7 | 15 243 → **1 731** |

> **Le planificateur ne décroche à aucune des cardinalités testées.** Il utilise l'index avec `Index Cond: (merchant_id = ANY(…) AND creation_date >= …)`, en découpant en 1, 3 puis 7 parcours d'index.
>
> À **20 établissements, l'index devient même indispensable** : sans lui, le planificateur bascule sur un `Seq Scan` complet. C'est précisément la situation vers laquelle le produit se dirige (cible de 40 établissements).

**Réserve honnête** : le gain *temporel* à 5 et 20 établissements (×1,10 et ×1,27) reste sous le seuil de significativité — parce que ces requêtes deviennent limitées par le CPU d'agrégation, pas par la lecture. Le gain *structurel* (lignes jetées) est en revanche net à toutes les cardinalités, et c'est lui qui portera quand le volume augmentera.

### 3.2 `orderitems (order_id)` — 1 264 kB

**Motif.** La clé primaire est `(order_item_id, order_id, product_id)`. `order_id` n'en étant **pas la colonne de tête**, aucune recherche par `order_id` ne peut l'exploiter — toute remontée des lignes d'une commande se fait par parcours séquentiel de 77 406 lignes ou par hash join.

**Gain : ×99,8** (5,0 ms → 0,1 ms) sur la lecture des lignes de 10 commandes.

**C'est le gain le plus important de tout le chantier**, et il ne concerne pas la page Analyses : cette requête est exécutée à **chaque affichage de commande, chaque impression de ticket, chaque rafraîchissement de l'écran de production**. Son volume d'appels dépasse de plusieurs ordres de grandeur celui des requêtes analytiques.

### 3.3 `extra (order_item_id)` — 136 kB

**Motif.** Aucun index n'existait : le seul (`extra_pkey`, sur `id`) affiche **0 parcours** depuis la création de la base — personne ne lit cette table par sa clé primaire. Tous les accès se font par `order_item_id`.

**Gain : ×99,8**, mesuré conjointement avec §3.2 (les deux servent la même requête).

Le plus petit index de la migration, pour l'un des meilleurs rapports.

### 3.4 `payments (order_id)` — 736 kB

**Motif.** Même situation : `payments_pkey` porte sur `payment_id`, les accès se font par `order_id`.

**Gain : ×570,1** (médiane) / ×107,0 (min) sur la lecture des règlements de 10 commandes.

#### ⚠️ Nuance importante — ne pas déployer cet index seul

Pris **isolément**, cet index **dégrade** la requête analytique de détail des règlements :

| Index appliqués | Avant | Après | Facteur |
|---|---:|---:|---:|
| `payments(order_id)` **seul** | 201,7 ms | 267,7 ms | **×0,75** ❌ |
| `payments(order_id)` **+** `orders(merchant_id, creation_date)` | 314,3 ms | 130,6 ms | **×2,41** ✅ |

Seul, il incite le planificateur à une **boucle imbriquée** avec accès aléatoires au tas, là où le hash join sur parcours séquentiel était plus efficace. Accompagné de l'index sur `orders`, qui restreint d'abord fortement le côté externe de la jointure, la boucle imbriquée redevient le bon choix.

**Les quatre index de la migration 087 forment un ensemble** : ne pas en déployer un sous-ensemble.

---

## 4. Index évalués et écartés

### 4.1 `orders (creation_date)` seul — **écarté**

| | Sans index | Avec index |
|---|---|---|
| Nœud | `Seq Scan` | `Index Scan` |
| Buffers | 1 143 | 940 |
| Lignes jetées | 15 243 | **1 731** |
| **`Execution Time`** | 378,6 ms | **374,7 ms** |

**×1,01 — aucun gain**, alors même que l'index fait son travail (lignes jetées divisées par 9, buffers en baisse).

**Pourquoi.** La requête M1 n'est pas limitée par la lecture mais par le **coût CPU par ligne de l'agrégat** : `to_char(… AT TIME ZONE …)`, `lower()`, concaténation, sur 18 599 lignes qui doivent de toute façon être traitées. Le tas tient entièrement en cache ; lire 33 842 lignes au lieu de 18 599 ne coûte presque rien. Sur une instance dont le CPU est bridé d'un facteur ~15 ([`PERIMETRE.md`](PERIMETRE.md) §2.1), c'est le calcul qui domine, pas l'accès.

**Décision : ne pas créer.** Un index qui n'améliore pas le plan ne doit pas exister : il se paie en écriture et en maintenance sans contrepartie. Mesure consignée dans la migration pour éviter qu'il revienne.

### 4.2 `payments (merchant_id, payment_date)` — **écarté**

| | Sans index | Avec index |
|---|---|---|
| Lignes jetées | 18 365 | **325** |
| Buffers | 666 | **2 208** |
| **`Execution Time`** | 355,8 ms | **372,4 ms** |

**×0,96 — légèrement défavorable.** L'index élimine 98 % des lignes filtrées mais **triple les buffers touchés** : sur une plage de 12 mois, le parcours d'index provoque des accès aléatoires au tas plus coûteux que le parcours séquentiel de 33 576 lignes.

**Décision : ne pas créer.** À réévaluer si `payments` dépasse quelques centaines de milliers de lignes, ou si `random_page_cost` est ajusté.

### 4.3 `order_item_configuration (order_item_id)` — **déjà présent**

```
CREATE INDEX idx_order_item_configuration_idx_order_item_configuration_order
    ON public.order_item_configuration USING btree (order_item_id)
```

Déjà en place et **utilisé** (4 770 parcours au compteur). Rien à faire.

---

## 5. Pourquoi les agrégations 12 mois ne gagnent rien

M2 (mix produits) et M3 (options) ne bougent pas, même limitées à un établissement (×0,81 et ×1,10). Ce n'est pas une anomalie :

1. **Un index sert à écarter des lignes.** Une agrégation qui doit lire *la plupart* des lignes d'une période n'a rien à écarter — le parcours séquentiel + hash join *est* le plan optimal. Le planificateur a raison de les ignorer.
2. **Le coût est ailleurs.** M3 est dominée par la matérialisation sur disque de sa CTE, pas par l'accès aux tables.

Pour ces deux requêtes, **le levier est la configuration, pas le schéma** :

| Levier sur M3 | Facteur |
|---|---|
| Index (`orders` composite + `orderitems(order_id)`) | ×1,10 |
| **`work_mem` 1 654 kB → 64 MB** | **×1,24**, et le débordement disque **disparaît** |

`work_mem` vaut **1 654 kB** sur l'instance — exactement la taille du spill relevé dans `AUDIT.md` §5 (`Maximum Storage: 1654kB`). Le débordement n'était pas le symptôme d'une requête mal écrite, mais de la limite mémoire atteinte au kilo-octet près.

**Recommandation** : relever `work_mem` **par transaction** sur les endpoints analytiques (`SET LOCAL work_mem = '64MB'`), et non globalement — en global, la valeur se multiplie par le nombre de connexions et par le nombre de nœuds de tri simultanés, ce qui saturerait une instance dotée de 64 Mo de `shared_buffers`.

---

## 6. Coût en écriture

`orders`, `orderitems` et `payments` sont des tables d'écriture chaude (chaque prise de commande y écrit).

| Index | Taille | Table | Taille table | Surcoût disque |
|---|---:|---|---:|---:|
| `idx_orders_merchant_creation` | 1 056 kB | `orders` (33 842 l.) | 9 144 kB | +11,5 % |
| `idx_orderitems_order_id` | 1 264 kB | `orderitems` (77 406 l.) | 8 216 kB | +15,4 % |
| `idx_payments_order_id` | 736 kB | `payments` (33 576 l.) | 4 624 kB | +15,9 % |
| `idx_extra_order_item_id` | 136 kB | `extra` (6 395 l.) | 384 kB | +35,4 % |
| **Total** | **3,12 Mo** | | **31 Mo** (tables de faits) | **+10 %** |

**Surcoût d'insertion.** Chaque `INSERT` doit maintenir une entrée B-tree supplémentaire par index concerné : `orders` passe de 4 à 5 index, `orderitems` de 2 à 3, `payments` de 1 à 2, `extra` de 1 à 2. L'ordre de grandeur est de **quelques dizaines de microsecondes par ligne insérée**, sur des tables où l'on écrit ~1 700 commandes et ~3 500 lignes par mois ([`AUDIT.md`](AUDIT.md) §2.3) — soit environ **2 écritures par minute en pointe**.

**Verdict : négligeable.** Le débit d'écriture est de l'ordre de la commande par minute, quand un index B-tree soutient des dizaines de milliers d'insertions par seconde. Les trois index d'accès par `order_id` se remboursent d'ailleurs sur la même transaction : la création d'une commande relit ses propres lignes.

**Ce qui a été écarté pour cette raison** : rien. Les deux index rejetés (§4) l'ont été pour absence de gain en lecture, pas pour leur coût en écriture.

---

## 7. Migration

`ib-welloresto-api` → `migrations/087_analytics_indexes.{up,down}.sql`.

**Points d'attention consignés dans le fichier :**

1. **`CREATE INDEX CONCURRENTLY` ne peut pas s'exécuter dans une transaction.** Le projet applique ses migrations à la main (`CLAUDE.md` : *« no migration tool — run manually »*), donc aucun outil n'impose de `BEGIN`/`COMMIT` — mais il faut jouer le fichier **instruction par instruction**, sans bloc transactionnel. `CONCURRENTLY` évite un verrou `ACCESS EXCLUSIVE` sur `orders`, `orderitems` et `payments`, qui bloquerait la prise de commande en production pendant la construction.
2. **En cas d'échec en cours de route**, l'index reste en état `invalid` : maintenu en écriture, jamais utilisé en lecture. Le `.down.sql` (`DROP INDEX CONCURRENTLY IF EXISTS`) le nettoie avant de rejouer.
3. **`ANALYZE` en fin de migration** : sans lui le planificateur peut ignorer les index neufs. D'autant plus nécessaire ici que **l'autovacuum n'a jamais tourné** sur ces tables (`last_autoanalyze` nul partout, cf. [`PERIMETRE.md`](PERIMETRE.md) §2.2).
4. **Aucun index partiel** sur le périmètre CA (`state` / `brand_status`) tant que la casse de `brand_status` n'est pas normalisée : 36 lignes en minuscules échapperaient au prédicat et sortiraient **silencieusement** de l'index.

---

## 8. Ce que ces index ne règlent pas

Pour éviter toute attente mal calibrée :

| Attente | Réalité mesurée |
|---|---|
| « La page Analyses va être rapide » | ❌ Les agrégations 12 mois **ne gagnent rien**. Elles sont limitées par le CPU de l'instance (§5 et [`PERIMETRE.md`](PERIMETRE.md) §2.1). |
| « Les 426 ms de `AUDIT.md` vont s'effondrer » | ❌ **×1,01** avec le meilleur index sur cette requête précise. Le chiffre venait de l'instance, pas du schéma. |
| « On n'a plus besoin de pré-agrégation » | ✅ Décision déjà arbitrée, et **confirmée** : à 33 842 commandes et une cible de ~100 k/an, le calcul à la volée suffit — **à condition de dimensionner l'instance**. |
| « Les index suffisent » | ❌ Le levier n°1 reste **le palier PostgreSQL de Render** (CPU bridé ×11 à ×33), le n°2 la configuration (`work_mem`), et seulement le n°3 les index. |

**En revanche**, ce que ces index règlent réellement et qui n'était pas l'objectif de départ : **les lectures de commande passent de ~35 ms à ~0,2 ms**. C'est le chemin le plus chaud de l'application — POS, tickets, écran de production — et c'est le bénéfice principal de cette migration.
