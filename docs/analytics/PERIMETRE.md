# Périmètre de données réel & diagnostic de performance

> Suite de [`AUDIT.md`](AUDIT.md). Phases 1 et 2 du chantier analytics.
> Base : `welloresto_staging` (PostgreSQL 18.4, Render Frankfurt), connexion en transaction `READ ONLY`.
> Mesures du **2026-08-24**. Les migrations et le tableau avant/après des index sont dans
> [`PERF-INDEX.md`](PERF-INDEX.md) et dans le dépôt `ib-welloresto-api` (migrations 087 et 088).

---

## 0. Ce que cette phase change dans l'audit initial

| Conclusion de `AUDIT.md` | Statut après vérification |
|---|---|
| « `ht = 0` sur 18,2 % — la donnée est peu fiable » | **Requalifié.** Ce n'est pas un défaut de qualité diffus : **100 % des commandes Uber Eats et Deliveroo** ont `ht = 0`, contre **0,69 %** en propre. C'est un trou structurel dans deux intégrations, précisément localisé. |
| « `order_type NULL` sur 8,1 % » | **Périmé.** Dernière occurrence **2024-10-26**, **0 depuis**. Bug historique déjà corrigé. |
| « 23 commandes à prix négatif » | **Disparaît.** **0 sur le périmètre PROD** — les 23 venaient toutes du jeu de test. |
| « 14 valeurs de `mop`, dont `'1'`, `PERCENTAGE`, `DISCOUNT` » | **Disparaît.** **7 valeurs propres** sur PROD. Les valeurs aberrantes sont toutes du jeu de test. |
| « motif d'annulation sur 84,6 % seulement » | **Disparaît.** **98,6 % sur PROD** (1 714 / 1 738). Ce n'est plus un manque. |
| « 17 lignes de remise orphelines », « 19 `extra` orphelins » | **Quasi disparaissent** : **1** et **0** sur PROD. |
| « couverts manquants à 94,5 % » | **Confirmé et aggravé** : **99,9 % sur PROD**. |
| « client inconnu sur 70 % » | **Confirmé et aggravé** : **85,0 % hors marketplace**. |
| « la lenteur vient de l'absence d'index » | **Infirmé.** Voir §2 : l'instance est bridée d'un facteur ~15. |
| « 56 % du volume sur `merchant_id = 212`, donc statistiques non représentatives » | **Nuancé.** 212 est un **vrai restaurant en production**, pas un bac à sable. Le jeu de test est ailleurs, et pèse 14,4 %. |

---

## 1. Classification des établissements

### 1.1 Critères appliqués

Le classement ne s'appuie sur **aucune intuition tirée du nom**. Quatre signaux mesurés :

| Signal | Ce qu'il prouve |
|---|---|
| **Continuité** = jours actifs / jours calendaires écoulés | Un restaurant ouvre presque tous les jours. Un bac à sable produit des rafales. |
| **Tickets scellés** (`receipts`) et **caisses closes** (`cash_registers.closed`) | Un établissement qui clôture sa caisse et scelle ses tickets exploite réellement le produit. |
| **Panier médian** | Un panier médian de 88,50 € dans une pizzeria n'est pas une vente réelle. |
| **Cohérence client** | 1 seul `customer_id` distinct pour 1 171 commandes n'est pas une clientèle. |

Règles :
- **PROD** — ≥ 25 commandes **et** (tickets scellés > 0 **ou** caisses closes > 0) **et** continuité ≥ 20 % **et** panier médian dans 5–60 €.
- **DÉMO** — catalogue configuré et activité étalée, mais **aucun ticket scellé** et panier ou clientèle non plausibles.
- **TEST** — rafales (continuité < 5 % ou > 40 commandes/jour actif), montants aberrants, comptes internes `@welloresto.fr`, ou `merchant_id` orphelin.
- **INACTIF** — 0 commande.

### 1.2 Tableau complet (29 établissements + 1 orphelin)

Activité, qualité, usage produit. `cont.` = continuité, `méd.` = panier médian.

| `merchant_id` | Nom | actif | tz | Cmd | 1ʳᵉ → dern. | Mois | Jours | cont. | méd. € | Tickets | Caisses (closes) | Paie. OK | Users | % vol | **Classe** |
|---|---|:--:|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| **212** | Croq'Pizzas | ✅ | Europe/Paris | 18 974 | 2024-05-20 → 2026-08-06 | 26 | 697 | **86,2 %** | 12,50 | **3 946** | 296 (**263**) | 18 373 | 3 | 56,1 | **PROD** |
| 2 | Brasserie du midi | ✅ | Europe/Paris | 3 960 | 2022-12-23 → 2026-08-20 | 43 | 486 | 36,4 % | 18,00 | 392 | 220 (135) | 3 661 | **12** | 11,7 | **TEST** |
| **228** | Pizzeria Timgad | ✅ | Europe/Paris | 2 413 | 2025-06-21 → 2026-06-06 | 11 | 166 | 47,3 % | 13,80 | 9 | 8 (1) | 2 399 | 1 | 7,1 | **PROD** |
| **225** | Chicken Nest | ✅ | Europe/Paris | 1 808 | 2025-04-10 → 2026-08-01 | 17 | 326 | 68,1 % | 21,50 | 135 | 44 (0) | 1 680 | 1 | 5,3 | **PROD** |
| **226** | Tasty Food | ✅ | Europe/Paris | 1 536 | 2025-05-17 → 2026-08-06 | 16 | 389 | **87,0 %** | 25,00 | 493 | 1 (0) | 1 175 | 1 | 4,5 | **PROD** |
| **231** | Chez Baba | ✅ | Europe/Paris | 1 275 | 2025-09-22 → 2026-08-06 | 12 | 232 | 72,7 % | 20,00 | 134 | 47 (43) | 1 173 | 1 | 3,8 | **PROD** |
| 223 | Nonna ! | ✅ | Europe/Paris | 1 190 | 2025-02-01 → 2025-08-31 | 7 | 104 | 49,1 % | **88,50** | **0** | 6 (4) | 1 484 | 1 | 3,5 | **DÉMO** |
| **235** | La Tour de Pizz | ✅ | Europe/Paris | 617 | 2026-06-10 → 2026-08-06 | 3 | 46 | 79,3 % | 28,50 | 596 | 2 (1) | 589 | 1 | 1,8 | **PROD** |
| 196 | JJHB | ❌ | Europe/Paris | 490 | 2024-02-28 → 2025-03-15 | 5 | **6** | **1,6 %** | 5,00 | 0 | 2 (0) | 487 | 1 | 1,4 | **TEST** |
| 229 | Le Maghreb | ✅ | Europe/Paris | 400 | 2025-09-11 → 2025-12-01 | 4 | 25 | 30,5 % | **62,00** | **0** | 1 (0) | 401 | 1 | 1,2 | **DÉMO** |
| 230 | Ok Pizza | ✅ | Europe/Paris | 391 | 2025-09-11 → 2026-03-11 | 6 | 64 | 35,2 % | 28,80 | **0** | 8 (1) | 382 | **0** | 1,2 | **DÉMO** |
| 186 | JJHB (archive) | ❌ | Europe/Paris | 210 | 2023-11-03 → 2024-02-20 | 2 | **4** | **3,6 %** | 8,00 | 0 | 0 | 198 | 1 | 0,6 | **TEST** |
| **234** | O'Saveurs | ✅ | Europe/Paris | 195 | 2026-05-10 → 2026-08-06 | 4 | 51 | 57,3 % | 13,90 | 108 | 42 (**42**) | 110 | 1 | 0,6 | **PROD** |
| 222 | Da Iolanda II | ❌ | Europe/Paris | 151 | 2025-02-16 → 2025-03-10 | 2 | 9 | 39,1 % | 45,25 | **0** | 8 (7) | 149 | 3 | 0,4 | **DÉMO** |
| 1 | Croq'o'pizza | ❌ | Europe/Paris | 105 | 2023-01-11 → 2025-01-16 | 8 | 20 | **2,7 %** | 17,90 | 0 | 1 (1) | 88 | 1 | 0,3 | **TEST** |
| 100 | Deis Musique | ❌ | Europe/Paris | 54 | 2023-02-06 → 2023-06-30 | 2 | **2** | **1,4 %** | 10,00 | 0 | 0 | 25 | 1 | 0,2 | **TEST** |
| **236** | Restaurant - Chez Baba | ✅ | Europe/Paris | 28 | 2026-07-29 → 2026-08-06 | 2 | 2 | 22,2 % | 27,00 | 27 | 1 (1) | 27 | 0 | 0,1 | **PROD** ⚠️ |
| **-223** | *(aucune ligne `merchant`)* | — | — | 24 | 2025-01-16 → 2025-01-31 | 1 | 5 | 31,3 % | 44,50 | 0 | 0 | 21 | 0 | 0,1 | **TEST** |
| 173 | Wello Resto | ❌ | Europe/Paris | 9 | 2023-06-01 → 2023-06-04 | 1 | 2 | 50,0 % | 1,40 | 0 | 0 | 2 | 0 | 0,0 | **TEST** |
| 227 | PizzArea | ✅ | Europe/Paris | 8 | 2025-06-01 → 2025-07-04 | 2 | 4 | 11,8 % | 13,00 | 0 | 0 | 7 | 1 | 0,0 | **TEST** |
| 157 | INSPE Lorraine | ❌ | Europe/Paris | 2 | 2023-05-15 | 1 | 1 | — | 1,40 | 0 | 0 | 0 | 1 | 0,0 | **TEST** |
| 232 | A La Maiz Food | ✅ | Europe/Paris | 1 | 2025-12-20 | 1 | 1 | — | 5,00 | 0 | 0 | 1 | 1 | 0,0 | **TEST** |
| 114 | La coloc test | ❌ | Europe/Paris | 1 | 2023-10-10 | 1 | 1 | — | 12,00 | 0 | 0 | 1 | 1 | 0,0 | **TEST** |
| 237 | OK Pizza | ✅ | Europe/Paris | 0 | — | 0 | 0 | — | — | 0 | 0 | 0 | 1 | 0,0 | **INACTIF** |
| 233 | La Trattoria del Corso | ✅ | Europe/Paris | 0 | — | 0 | 0 | — | — | 0 | 0 | 0 | 0 | 0,0 | **INACTIF** |
| 224 | Chamas Tacos | ❌ | Europe/Paris | 0 | — | 0 | 0 | — | — | 0 | 0 | 0 | 9 | 0,0 | **INACTIF** |
| 217 | OK PIZZA | ❌ | Europe/Paris | 0 | — | 0 | 0 | — | — | 0 | 0 | 0 | 0 | 0,0 | **INACTIF** |
| 203 | testeur | ❌ | Europe/Paris | 0 | — | 0 | 0 | — | — | 0 | 0 | 0 | 0 | 0,0 | **INACTIF** |
| 185 | OTé | ❌ | Europe/Paris | 0 | — | 0 | 0 | — | — | 0 | 0 | 0 | 1 | 0,0 | **INACTIF** |
| 118 | Board&Share | ❌ | Europe/Paris | 0 | — | 0 | 0 | — | — | 0 | 0 | 0 | 1 | 0,0 | **INACTIF** |

Qualité par établissement (les colonnes qui décidaient du classement dans `AUDIT.md`) :

| `merchant_id` | % `ht=0` | % couverts=0 | % client NULL | % `order_type` NULL | % `price≠ht+tva` | `brand_status` minuscules | prix < 0 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 212 | 25,4 | 99,9 | 65,1 | 5,6 | 25,7 | 8 | 0 |
| 2 | 20,4 | 95,7 | 63,0 | **25,3** | 20,1 | **18** | **3** |
| 228 | 0,1 | 99,9 | 99,5 | 0,0 | 0,0 | 0 | 0 |
| 225 | 2,7 | 99,9 | 91,3 | 0,0 | 4,1 | 0 | 0 |
| 226 | 9,2 | 100,0 | 7,0 | 0,0 | 35,7 | 0 | 0 |
| 231 | 0,2 | 99,9 | 96,0 | 0,0 | 1,0 | 0 | 0 |
| 223 | 0,7 | **6,5** | 99,9 | 0,0 | 0,0 | 0 | 0 |
| 229 | 0,0 | **0,5** | 100,0 | 0,0 | 0,0 | 0 | 0 |
| 230 | **82,6** | 99,2 | 5,4 | 0,0 | **82,6** | 10 | 0 |
| 196 | 0,4 | 100,0 | 99,8 | **61,0** | 0,0 | 0 | **19** |
| 186 | 0,0 | 100,0 | 100,0 | **100,0** | 0,0 | 0 | 1 |
| 1 | 0,0 | 100,0 | 84,8 | **99,0** | 0,0 | 0 | 0 |

### 1.3 Justification des classements sensibles

**`merchant_id = 212` (Croq'Pizzas) — PROD, et non un jeu de test.**
C'est le point que le prompt demandait de traiter explicitement, et la réponse contredit l'hypothèse de départ.
Les chiffres l'excluent sans ambiguïté du jeu de test : **697 jours d'activité distincts sur 809 jours calendaires (86,2 %)** — un restaurant qui ouvre 6 jours sur 7 pendant 26 mois ; **3 946 tickets scellés** ; **263 clôtures de caisse effectives** sur 296 sessions ; **18 373 paiements encaissés** ; **4 351 clients distincts** ; panier médian **12,50 €**, cohérent avec une pizzeria. Aucun jeu de test ne clôture sa caisse 263 fois.
Ses taux d'anomalie s'expliquent entièrement par autre chose (§1.5) : 22 % de son volume passe par Uber Eats et Deliveroo, qui n'écrivent jamais le HT.

**`merchant_id = 2` (Brasserie du midi) — TEST.** C'est l'établissement interne.
**4 utilisateurs `@welloresto.fr`** sur 12 (aucun autre établissement n'en a plus d'un) ; **une commande à 10 016 €** dans une brasserie ; **116 commandes à 0 €** ; **3 commandes à prix négatif** ; couvre **43 mois** — soit toute l'histoire de la base — mais avec seulement **36,4 % de continuité** ; porte à lui seul **18 des 36** `brand_status` en minuscules et **258 des 284** `upsell_suggestions`. C'est le bac à essai de l'équipe.

**`merchant_id = 196` et `186` (JJHB) — TEST.** 490 commandes réparties sur **6 jours** (81,7 commandes par jour actif) et 210 sur **4 jours** (52,5/jour). Aucun ticket scellé, aucune caisse close. **19 prix négatifs** sur 196. Ce sont des injections de charge.

**`223`, `229`, `230`, `222` — DÉMO.** Point commun décisif : **zéro ticket scellé** malgré des centaines de commandes et des paiements enregistrés. 223 affiche un panier médian de **88,50 €** et **un seul `customer_id` distinct pour 1 171 commandes**. 229 a un panier médian de **62,00 €**. 230 a **82,6 % de `ht = 0`** et **aucun utilisateur rattaché**. Ce sont des environnements de présentation, pas des exploitations.

**`-223` — TEST.** `merchant_id` orphelin : **aucune ligne dans `merchant`**. Illustration directe du piège P7 de l'audit (aucune contrainte de clé étrangère).

**`236` (Restaurant - Chez Baba) — PROD, mais à ne pas pondérer.** ⚠️ 28 commandes sur 2 jours, mais **27 tickets scellés et 1 caisse close** : le produit est réellement exploité. Second site de `231`, ouvert le 2026-07-14. Trop récent pour peser dans une statistique.

### 1.4 Répartition du volume

| Classe | Établissements | Commandes | Part |
|---|---|---:|---:|
| **PROD** | 212, 228, 225, 226, 231, 235, 234, 236 | **26 846** | **79,3 %** |
| **TEST** | 2, 196, 186, 1, 100, -223, 173, 227, 157, 232, 114 | 4 864 | 14,4 % |
| **DÉMO** | 223, 229, 230, 222 | 2 132 | 6,3 % |
| **INACTIF** | 237, 233, 224, 217, 203, 185, 118 | 0 | 0 % |
| | | **33 842** | **100 %** |

> Le jeu de test pèse **14,4 %**, pas 56 %. L'hypothèse de départ visait le mauvais établissement — mais la démarche était justifiée : écarter TEST et DÉMO change effectivement plusieurs conclusions (§1.6).

### 1.5 La vraie explication de `ht = 0` : les marketplaces

C'est le résultat le plus important de la phase 1. Le taux ne dépend **pas** de l'établissement mais de la **marque**.

```sql
SELECT brand, COUNT(*) cmd,
       ROUND(100.0*COUNT(*) FILTER (WHERE ht=0)/COUNT(*),2) pct_ht0,
       ROUND(100.0*COUNT(*) FILTER (WHERE price<>ht+tva)/COUNT(*),2) pct_prix_ko,
       ROUND(100.0*COUNT(*) FILTER (WHERE customer_id IS NULL)/COUNT(*),2) pct_cli_null
FROM orders WHERE state IN ('CLOSED','DONE') AND upper(brand_status) NOT IN ('DELETED','CANCELED')
GROUP BY 1;
```

| `brand` | Commandes | `ht = 0` | `price ≠ ht + tva` | client NULL |
|---|---:|---:|---:|---:|
| `WELLO_RESTO` | 25 897 | **0,69 %** | 1,97 % | 86,26 % |
| `UBER_EATS` | 4 828 | **100,00 %** | 99,98 % | 0,02 % |
| `DELIVEROO` | 701 | **100,00 %** | 100,00 % | 0,00 % |

**Les intégrations Uber Eats et Deliveroo n'écrivent jamais `orders.ht` ni `orders.tva`.** Sans exception, sur 5 529 commandes. Ce n'est pas de la donnée dégradée, c'est une fonctionnalité absente dans deux webhooks — donc un correctif ciblé, et non un problème de fiabilité générale.

Symétriquement, `customer_id NULL` est un phénomène **de l'enseigne propre** (86 %), pas des marketplaces (0 %) : les marketplaces transmettent toujours un client, le POS en salle n'en identifie presque jamais. C'est le comportement normal d'une vente au comptoir, pas un défaut.

### 1.6 Mesures recalculées sur le périmètre PROD

Périmètre : `merchant_id IN ('212','228','225','226','231','235','234','236')` → **26 846 commandes**, dont **25 306** dans le périmètre CA.

| Piège | Mesure globale (`AUDIT.md`) | Mesure périmètre PROD | Écart | Verdict |
|---|---|---|---|---|
| **P1** `ht = 0` (périmètre CA) | 18,2 % | **19,6 %** | +1,4 pt | Inchangé globalement — **mais 0,13 % hors marketplace** |
| **P1b** `price ≠ ht + tva` | 19,2 % | **21,0 %** | +1,8 pt | **1,88 % hors marketplace** |
| **P3** couverts non saisis | 94,5 % | **99,9 %** | **+5,4 pt** | **Aggravé** — les établissements qui saisissaient étaient DÉMO |
| **P3b** couverts, sur place uniquement | 87,5 % | **99,9 %** | **+12,4 pt** | **Aggravé** |
| **P4** `customer_id NULL` | 70,0 % | **69,2 %** | −0,8 pt | Inchangé — **85,0 % hors marketplace** |
| **P5** `brand_status` minuscules | 36 lignes | **8 lignes** | −28 | Fortement réduit |
| **P6** `order_type NULL` | 8,1 % | **3,99 %** | −4,1 pt | **0 depuis 2024-11** — legacy pur |
| **P8** lignes de remise orphelines | 17 | **1** | −16 | Quasi disparu |
| **P9** compteurs client désynchronisés | 33 % | **29,1 %** | −3,9 pt | **Confirmé** |
| **P10** `price < 0` | 23 | **0** | −23 | **Disparaît** |
| **P13** paiements `enabled = false` | 3,4 % (1 142) | **1,5 %** (384) | −1,9 pt | Fortement réduit |
| **P14** valeurs de `mop` | 14 (dont `'1'`, `PERCENTAGE`, `DISCOUNT`) | **7 propres** (`CB, ES, STRIPE, TR, CURRENCY, UBER_EATS, DELIVEROO`) | −7 | **Disparaît** |
| **P15** `operation_type` | `SALE` à 100 % | `SALE` à 100 % | 0 | **Confirmé** |
| **P16** `extra` orphelins | 19 | **0** | −19 | **Disparaît** |
| **P17** établissements avec tags | 2 sur 29 | **0 sur 8** | — | **Aggravé** (tags portés par 2 = TEST et 237 = INACTIF) |
| **P18** commandes avec frais de livraison | 1 847 | **1 480** | — | Confirmé |
| **P2** lignes `is_upsell` | 0 | **0** | 0 | **Confirmé** |

### 1.7 Verdict sur les 12 « données manquantes » de `AUDIT.md` §3.1

| # | Manque déclaré | Toujours un manque sur PROD ? |
|---|---|---|
| **M1** | Vente additionnelle (`is_upsell`) | ⚠️ **Oui, mais la cause a changé** — voir §1.8. Ce n'est plus « la colonne n'est jamais écrite par personne ». |
| **M2** | Couverts / Panier par couvert | ✅ **OUI, aggravé** — 99,9 % sur PROD. Mais le mécanisme correctif **existe déjà** : migration `086_merchant_parameters_pos_covers_count_required` ajoute un drapeau rendant la saisie obligatoire au POS. **Elle n'est pas encore appliquée sur staging** (la colonne n'existe pas en base). Le chantier est ouvert, pas à ouvrir. |
| **M3** | Typologie des remises | ✅ **OUI** — aucune colonne de type, `discount_name` reste du texte libre. |
| **M4** | Rattachement ligne ↔ remise UUID | ✅ **OUI** structurellement (`integer` vs `varchar`), mais **1 seule ligne orpheline** sur PROD contre 17 globalement : l'impact réel est marginal aujourd'hui. |
| **M5** | Remises panier | ✅ **OUI** — 0 ligne avec `cart_discount_amount > 0` sur PROD. |
| **M6** | « Paiement mobile » | ✅ **OUI** — les 7 `mop` de PROD ne distinguent aucun wallet. |
| **M7** | Canal d'acquisition client | ✅ **OUI** — aucune colonne. |
| **M8** | Remboursements | ✅ **OUI** — `operation_type = 'SALE'` à 100 %. Nuance : les 23 prix négatifs qui servaient d'indice étaient tous du jeu de test ; il n'y a **aucune** trace d'avoir sur PROD. |
| **M9** | Coût matière historisé | ✅ **OUI** — inchangé (chantier déjà arbitré, snapshot à la vente). |
| **M10** | Motif d'annulation | ❌ **NON, disparaît** — **98,6 %** des annulations PROD ont un motif (1 714 / 1 738), contre 84,6 % globalement. |
| **M11** | Serveur sur les annulations | ⚠️ **Partiellement** — 58,4 % rattachables (1 015 / 1 738) contre 51,6 %. Reste à trancher si les 1 642 commandes `SCANNORDER`/`-1` doivent figurer dans un classement serveur. |
| **M12** | Comparatif multi-établissements | ✅ **OUI** — décision produit déjà actée, chantier séparé. |

**Bilan : 2 manques disparaissent (M10, et P10/P14/P16 côté pièges), 1 est déjà en cours de traitement (M2), 1 change de nature (M1), 8 sont confirmés.**

### 1.8 Vérification ciblée n°1 — `is_upsell`

**Le zéro est global** : `SELECT COUNT(*) FROM orderitems WHERE is_upsell` → **0** sur **77 406** lignes. Aucun effet de périmètre.

**Chemins d'écriture d'`orderitems` — il n'y en a qu'un.**
`grep -rn "INSERT INTO orderitems"` ne remonte que **4 requêtes, toutes dans un seul fichier** : `internal/modules/order_life_cycle/repository.go` (lignes 1406, 1424, 1428, 2116). Tous les producteurs de commandes (POS, ScanNOrder, Kiosk, Uber Eats, Deliveroo) convergent vers ce module — `scannorder/service.go` reçoit d'ailleurs `orderLifeCycleSvc` par injection.

**Les 4 INSERT portent la colonne `is_upsell`**, alimentée par `p.IsUpsell` (`repository.go:1459`, `1470`, `2118`), lui-même issu du contrat JSON `models.CreateOrderProduct.IsUpsell` (`json:"is_upsell"`, `create_order_models.go:96`).

**Conclusion : la chaîne serveur est complète.** Le correctif n'est pas dans l'API Go.

Côté clients :

| Client | `is_upsell` transmis ? | Positionné à `true` ? |
|---|---|---|
| **POS Flutter** (`wello_resto_flutter`) | ✅ `product_payload.dart:81` | ✅ `upsell_suggestions_bar.dart:251` et `:289` — depuis le **2026-06-25** |
| **Kiosk** (`wello-kiosk`) | ✅ `cart_item.g.dart:38` | ✅ `upsell_controller.dart:85` |
| **ScanNOrder web** (`wello-resto-scannorder`) | ❌ **aucune occurrence** | ❌ — alors que `scannorder/service.go` reçoit bien un `upsellService` |

**Le commentaire `stats/service.go:106` est périmé** : il annonce « until the Flutter app (Sprint 2) writes `orderitems.is_upsell` ». Le POS l'écrit depuis le 2026-06-25, et la base contient des commandes jusqu'au 2026-08-20 — dont celles de `212`, qui possède 26 `upsell_suggestions`.

**Il reste donc un écart inexpliqué** : le code est en place des deux côtés depuis ~2 mois, et la colonne reste à 0. Deux causes possibles, à départager par une vérification runtime (hors périmètre lecture seule) :
1. les établissements PROD n'utilisent pas la barre de suggestions (adoption nulle) ;
2. le build déployé en salle est antérieur au 2026-06-25.

**Ce n'est donc plus « instrumenter 5 clients » mais « vérifier 1 déploiement + brancher ScanNOrder ».** Le chiffrage du correctif change complètement.

### 1.9 Vérification ciblée n°2 — exclusion ScanNOrder du rapport TVA

> ⚠️ **Sujet fiscal. Aucune modification effectuée, conformément à la consigne. À arbitrer.**

**Origine.** Le filtre `created_by NOT IN ('-1','SCANNORDER')` a été introduit par le commit **`d7ddf58`, « feature: adding availabilities », du 2026-04-21**. Le titre du commit n'a **aucun rapport** avec ce filtre : il a été ajouté au passage, sans justification, sans commentaire de code et sans ticket associé. Aucune trace d'une décision.

**Portée.** Le filtre est présent dans **deux** modules :
- `internal/modules/pos/reports/repository.go` lignes 78 et 93 (rapport TVA) ;
- `internal/modules/pos/accounting/repository.go` lignes 217, 230 et 318 (export comptable).

**Contradiction interne.** Le même fichier `accounting/repository.go` **exclut** les commandes ScanNOrder de l'export (ligne 217) tout en possédant, lignes 684, 723 et 796, un mapping explicite `WHEN o.brand = 'WELLO_RESTO' AND o.created_by = 'SCANNORDER' THEN 'scannorder'` qui les traite comme un **canal de vente à part entière**. Une partie du module comptable connaît le canal ScanNOrder ; l'autre le jette.

**Ces commandes sont-elles des ventes réelles ou des doublons techniques ?** Les données tranchent nettement — ce sont des ventes réelles :

| Contrôle | Résultat |
|---|---|
| Commandes `created_by = 'SCANNORDER'` | **1 390** |
| Dans le périmètre CA | **1 145** |
| Chiffre d'affaires TTC concerné | **30 480,60 €** |
| Avec un paiement réellement encaissé (`payments.enabled`) | **923** |
| Avec un **ticket scellé** (`receipts`, chaîné par hash) | **445** |
| Avec des lignes de commande | **1 390** (100 %) |
| Avec un `parent_order_id` (⇒ doublon d'une autre commande) | **0** |
| Marques concernées | `WELLO_RESTO` uniquement |

**Aucune n'est un doublon technique** : `parent_order_id` est nul partout. **445 ont un ticket scellé** — c'est-à-dire qu'un justificatif fiscal a été émis au client pour une vente que le rapport TVA ne déclare pas.

**Impact par établissement PROD** (part du CA propre absente du rapport TVA) :

| `merchant_id` | Nom | CA `WELLO_RESTO` clos | dont ScanNOrder | **% exclu du rapport TVA** |
|---|---|---:|---:|---:|
| **226** | **Tasty Food** | 29 879,10 € | **24 311,10 €** | **81,4 %** |
| 225 | Chicken Nest | 39 089,30 € | 2 231,30 € | 5,7 % |
| 231 | Chez Baba | 51 361,50 € | 956,50 € | 1,9 % |
| 212 | Croq'Pizzas | 212 988,34 € | 1 857,70 € | 0,9 % |
| 228, 234, 235, 236 | — | — | 0 € | 0 % |

**Le rapport TVA de Tasty Food omet 81,4 % de son chiffre d'affaires propre**, de façon continue depuis le 2025-10-06. C'est l'établissement dont le modèle repose le plus sur la commande à table par QR code.

**À arbitrer :** ce filtre est-il une exigence comptable délibérée (les ventes ScanNOrder seraient déclarées par un autre canal) ou une régression introduite par inadvertance le 2026-04-21 ? En l'absence de toute trace de décision, et compte tenu des 445 tickets scellés, la seconde hypothèse est la plus probable — mais la réponse ne relève pas de la technique.

---

## 2. Diagnostic de performance : index, configuration ou instance ?

### 2.1 Capacité CPU réelle de l'instance

Protocole : 5 exécutions, la première jetée, médiane retenue. Ces requêtes ne touchent aucune table — elles mesurent le CPU seul.

| Requête | Mesures (ms) | **Médiane** |
|---|---|---:|
| `SELECT 1` (RTT réseau de référence) | 46,9 / 23,9 / 21,9 / 23,6 / 24,4 / 54,0 | **23,9 ms** |
| `SELECT count(*) FROM generate_series(1, 1000000)` | 1704 / 1405 / 1600 / 1805 / 1790 | **1 695 ms** |
| `SELECT count(*) FROM generate_series(1, 10000000)` | 20604 / 15697 / 15702 / 18898 / 16914 | **16 308 ms** |
| `SELECT sum(i) FROM generate_series(1, 10000000) g(i)` | 19321 / 22898 / 18301 / 16603 / 19096 | **18 698 ms** |

**Le réseau est hors de cause** : 23,9 ms de RTT, négligeable devant 16 s. Et le coût est **parfaitement linéaire** — 1 671 ms de CPU net pour 1 M itérations, 16 284 ms pour 10 M, soit **1,67 et 1,63 µs par itération**. C'est bien du CPU, pas de la latence.

**Ordre de grandeur attendu** sur un cœur moderne non bridé : 0,5 à 1,5 s pour 10 M, soit 0,05–0,15 µs par itération.

> ### 🔴 L'instance PostgreSQL de staging est **11 à 33 fois plus lente** qu'un cœur normal.

Corollaire immédiat : **les 426 ms de M1 dans `AUDIT.md` ne mesurent pas un défaut de schéma.** Ramenés à une machine normale, les 12,6 µs par ligne deviennent ~0,8 µs par ligne — une valeur ordinaire pour une ligne de 48 colonnes avec conversion de fuseau, `lower()` et concaténation.

**Second effet, tout aussi important : la variance.** Sur la même requête, on relève 297 ms puis 877 ms — **un facteur 3**. Signature d'un CPU partagé avec des voisins bruyants. **Toute mesure isolée sur cette instance est inexploitable**, ce qui invalide la méthode de `AUDIT.md` §5 (une exécution par requête) et impose le protocole entrelacé de la phase 3.

### 2.2 Gonflement de table : aucun

```sql
SELECT relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables WHERE relname IN ('orders','orderitems','payments','extra','order_item_configuration');
```

| Table | Octets/ligne (heap) | Largeur réelle des données (`pg_column_size`) | Ratio | Verdict |
|---|---:|---:|---:|---|
| `orders` | **277** | **264** | **1,05** | Aucun gonflement |
| `orderitems` | **109** | **104** | **1,05** | Aucun gonflement |

Les 310 octets/ligne relevés dans `AUDIT.md` (10 MB / 33 842) incluaient index et TOAST. La table seule fait 9 144 kB, soit **277 octets/ligne** pour une largeur de données mesurée à **264 octets** : 5 % d'écart, ce qui correspond exactement aux en-têtes de page et à l'alignement. Une table gonflée afficherait un ratio de 2 à 5.

C'est la largeur honnête d'une table de **48 colonnes dont 25 en `text`/`varchar`**.

⚠️ **En revanche, les compteurs d'activité sont inexploitables** : `pg_stat_user_tables` annonce `orders` à 6 lignes vivantes et 44 mortes, pour une table de 33 842 lignes, alors que `pg_stat_database.stats_reset` vaut `NULL`. Et **`last_vacuum`, `last_autovacuum`, `last_analyze`, `last_autoanalyze` sont tous nuls sur les cinq tables**.

Combiné au fait que `pg_class.reltuples` est juste (33 836 pour 33 842 réelles — précision typique d'un `ANALYZE` de restauration), cela indique que **la base de staging est une restauration de production**, et que **l'autovacuum n'a jamais tourné depuis**. Deux conséquences :
- les statistiques du planificateur dériveront à mesure que les données s'accumulent ;
- staging est représentatif de la production en **volume** (ce que confirme le propriétaire du produit), mais pas en **puissance**.

### 2.3 Configuration

```sql
SELECT name, setting, unit FROM pg_settings WHERE name IN (...);
```

| Paramètre | Valeur | Commentaire |
|---|---|---|
| `shared_buffers` | **64 MB** (8192 × 8 kB) | Très faible |
| `effective_cache_size` | **192 MB** (24576 × 8 kB) | Suggère une instance de 256–512 MB de RAM |
| **`work_mem`** | **1 654 kB** | 🔴 **C'est exactement la taille du spill de M3** (`Maximum Storage: 1654kB` dans `AUDIT.md` §5). Le débordement disque n'était pas un signe de requête mal écrite : c'est `work_mem` atteint au kilo-octet près. |
| `maintenance_work_mem` | 16 MB | Faible (ralentit les `CREATE INDEX`) |
| `max_parallel_workers` | **1** | Quasiment aucun parallélisme |
| `max_parallel_workers_per_gather` | **1** | idem |
| `jit` | **on** | Suspect sur des requêtes courtes et un CPU bridé — **testé, voir ci-dessous** |
| `random_page_cost` | 1,1 | Cohérent avec du SSD |
| `track_io_timing` | **off** | Aucune mesure d'E/S disponible |
| `max_connections` | 103 | — |

**Test de `jit`** — mesuré, et **écarté** : M1 passe de **446 ms** (`jit=on`) à **551 ms** (`jit=off`), médiane sur 5 exécutions. Désactiver le JIT ne gagne rien ici ; l'écart est dans le bruit.

**Test de `work_mem`** — mesuré, et **concluant** :

| Configuration | Exécutions serveur (ms) | Médiane | Spill disque |
|---|---|---:|---|
| `work_mem` par défaut (1 654 kB) | 1254 / 1272 / 975 / 1075 | **1 075 ms** | `temp read=126 written=126` |
| `work_mem = 64MB` | 858 / 855 / 880 / 870 | **870 ms** | **aucun** |

**x1,24 sur M3, et le débordement disque disparaît complètement.** À comparer au **x1,10** que les index apportent sur la même requête (§ `PERF-INDEX.md`) : **le réglage bat le changement de schéma.**

### 2.4 Verdict

> **L'écart de performance vient d'abord du dimensionnement de l'instance, ensuite de la configuration, et seulement en troisième position de l'absence d'index.**

| Rang | Cause | Poids | Correctif |
|---|---|---|---|
| **1** | **Dimensionnement de l'instance** | **Dominant** — CPU 11 à 33× plus lent qu'un cœur normal, variance ×3, 64 MB de `shared_buffers`, 1 worker parallèle. | Vérifier le palier tarifaire PostgreSQL Render. Sur les petits paliers le CPU est partagé et créditée en rafales. **Aucun changement de code ne compensera cela.** |
| **2** | **Configuration** | **Réel et bon marché** — `work_mem` à 1,6 MB provoque le spill de M3 au kilo-octet près ; le corriger donne x1,24, davantage que les index sur cette requête. | Relever `work_mem` pour les requêtes analytiques (`SET LOCAL work_mem` par transaction plutôt qu'en global, pour ne pas multiplier par le nombre de connexions). |
| **3** | **Absence d'index** | **Réel mais ciblé** — n'explique pas le coût par ligne, seulement le nombre de lignes lues. Sans effet sur les agrégations pleine table ; décisif sur les requêtes sélectives. | Migration 087 — détail et mesures dans [`PERF-INDEX.md`](PERF-INDEX.md). |

**Ce qu'il ne faut pas faire :** conclure de `AUDIT.md` §5 que le schéma est en cause. La prémisse du prompt était juste — l'écart de 30 à 60× par rapport à l'attendu se retrouve intégralement dans la capacité CPU de l'instance, et poser des index pour « corriger » cela aurait traité un symptôme de plateforme par un changement de schéma.

---

## Annexe — Méthode

- **Lecture seule** : toutes les requêtes de la phase 1 et 2 s'exécutent avec `conn.read_only = True` (transaction PostgreSQL `READ ONLY`). Les seules écritures de tout le chantier sont les `CREATE INDEX` de la phase 3, systématiquement suivis d'un `ROLLBACK` (voir `PERF-INDEX.md`).
- **État de la base vérifié après coup** : 11 index sur les cinq tables de faits, soit exactement le compte initial. Aucun index de test n'a survécu.
- **Bruit de l'instance** : toute comparaison de temps repose sur au moins 4 exécutions, première jetée, médiane retenue. Les écarts inférieurs à ×1,5 ne sont pas considérés comme significatifs sur cette instance.
- Aucune donnée n'a été modifiée, aucun index n'a été conservé, aucune logique métier n'a été touchée.
