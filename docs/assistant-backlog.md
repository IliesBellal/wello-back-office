# Assistant (FAB) : backlog

Bouton flottant du back-office : actions rapides et demandes en langage
courant, au clavier ou à la voix. Documentation : [`assistant/README.md`](assistant/README.md)
(back-office) et `ib-welloresto-api/docs/assistant.md` (API).

**Principe directeur.** L'assistant est 100 % gratuit. Il n'utilise aucun LLM.
Il reconnaît des « intentions » à partir de mots-clés, de phrases et de
synonymes. Ce « modèle » est stocké en base et progresse seul grâce aux
requêtes non comprises, elles aussi enregistrées.

---

## 1. Plateforme admin (à faire, hors de ce repo)

L'écran d'administration de l'assistant sera intégré à la future plateforme
admin. **Les routes API dont il a besoin existent déjà** (`/admin/assistant/*`,
réservées au staff WelloResto) : il reste à construire l'interface.

### 1.1 Revue des requêtes non comprises (replis)
- [ ] Liste des requêtes en repli, triée par fréquence, filtrable par période
  et établissement. API : `GET /admin/assistant/fallbacks`.
- [x] Regroupement des requêtes par mots significatifs (« plus de saumon » et
  « saumon plus » ensemble) — fait côté API.
- [x] Pour chaque groupe, ce que les gens ont choisi ensuite et le nombre
  d'abandons — fait côté API.
- [ ] Filtres par rôle et par mode de saisie (clavier / voix) : les données
  sont enregistrées, l'agrégat reste à ajouter.
- [ ] Actions en un clic :
  - [ ] ajouter comme synonyme d'une intention existante (API : `POST /admin/assistant/terms`) ;
  - [ ] créer une nouvelle intention à partir du groupe (route API à ajouter) ;
  - [ ] marquer comme « hors périmètre » (bruit, test, insulte…) (à ajouter).
- [ ] Historique de qui a modifié quoi (`reviewed_by` / `reviewed_at` existent ; journal complet à ajouter).

### 1.2 Gestion du « modèle »
- [ ] Revue des termes et surnoms appris : valider, rejeter, déplacer,
  repondérer, passer en global. API : `GET|PATCH /admin/assistant/terms`, `/aliases`.
- [ ] Liste des intentions et de leur vocabulaire. API : `GET /admin/assistant/intents`.
- [ ] Création / modification d'intentions depuis l'interface (aujourd'hui :
  `src/lib/assistant/seed.ts` puis migration générée).
- [ ] Bac à sable : taper une phrase et voir l'intention reconnue, le score,
  les entités et les candidats (le moteur étant côté client, l'écran peut
  l'importer tel quel).
- [ ] Tests de non-régression : phrases de référence rejouées à chaque
  modification (les tests `engine.test.ts` en sont la base).
- [ ] Versionnage du modèle avec retour arrière (aujourd'hui : version =
  empreinte, sans historique).

### 1.3 Tableau de bord d'analyse
API : `GET /admin/assistant/stats` fournit déjà : sessions, utilisateurs,
établissements, taux de compréhension, taux de réussite, requêtes clavier /
voix, actions rapides, annulations, reformulations, médianes du temps
jusqu'à l'action et de la durée, issues, appareils, top intentions (succès,
annulations, score moyen), courbe hebdomadaire, état de l'apprentissage.
- [ ] Écran du tableau de bord.
- [ ] Rejeu d'une session (API : `GET /admin/assistant/sessions/{id}/events`).
- [ ] Ajouts possibles : intentions par rôle et par créneau horaire, entonnoir
  ouverture → saisie → intention → confirmation → succès, rétention des
  utilisateurs, échecs d'actions par code d'erreur, ambiguïtés fréquentes,
  avis 👍 / 👎 (tous enregistrés, agrégats à écrire).
- [ ] Déclencher un passage d'apprentissage (API : `POST /admin/assistant/learning/run`).

### 1.4 RGPD
- [x] Accès aux analyses et au texte brut réservé au staff WelloResto.
- [x] Texte libre effacé après 90 jours, purge après 400 jours (tâche quotidienne).
- [x] E-mails et numéros de téléphone masqués avant envoi.
- [ ] Export et suppression des données d'un utilisateur sur demande.
- [ ] Mention de l'assistant dans la politique de confidentialité (texte
  d'information déjà présent dans « Comment je fonctionne »).

---

## 2. Livré

### 2.1 Auto-apprentissage
- [x] Synonymes d'intention appris : les mots non expliqués d'une phrase
  (entités et mots vides retirés), après le choix d'une suggestion **et** une
  action réussie.
- [x] Surnoms d'entités par établissement (« dessert du jour » → produit
  choisi à la main ; « saumon » → le saumon choisi entre deux homonymes).
- [x] Cycle `candidat → actif (établissement) → actif (global) → validé / rejeté`.
- [x] Promotion : ≥ 3 occurrences par ≥ 2 personnes. **Ajout** : ou 1 personne
  sur ≥ 3 jours différents, sinon un restaurant tenu seul n'apprendrait jamais.
- [x] Conflits entre intentions (< 80 %) → revue humaine.
- [x] Global dès 3 établissements.
- [x] Poids × 0,8 tant qu'un humain n'a pas validé.
- [x] Rétrogradation : ≥ 5 usages dont > 30 % annulés ou reformulés.
- [x] Intentions sensibles jamais promues automatiquement.
- [x] Liste noire de mots génériques ; un rejet humain est définitif.

### 2.2 API (`ib-welloresto-api`)
- [x] Migrations `206_assistant` (7 tables) et `207_assistant_seed`
  (58 intentions, 347 termes, 192 entrées de lexique), générée depuis
  `src/lib/assistant/seed.ts` (`npm run assistant:seed-sql`).
- [x] `GET /assistant/model` (version courte si inchangé), `POST /assistant/events`
  (lots, idempotent, identité tirée du jeton, sessions protégées).
- [x] Tâche horaire d'apprentissage, tâche quotidienne de purge.
- [x] Routes `/admin/assistant/*` (voir 1).
- [x] Tests unitaires et d'intégration Postgres (cycle complet).

Écarts par rapport au plan : pas de table `assistant_model_versions` (la
version est une empreinte calculée) ; pas d'ETag HTTP (en-têtes non exposés
par le CORS de l'API) mais un paramètre `version`.

### 2.3 Back-office (ce repo)
- [x] Bouton flottant sur toutes les pages du back-office (au-dessus de la
  `BottomNav` sur mobile), raccourci ⌘J / Ctrl+J, panneau chargé à la demande.
- [x] Bulle sur ordinateur, plein écran sur mobile.
- [x] Accueil : actions rapides (rupture, créer un produit, planning du jour,
  caisses, CA du jour, ruptures en cours) filtrées par droits, exemples,
  présentation de l'apprentissage.
- [x] Dictée vocale (Web Speech API, masquée si non supportée).
- [x] Moteur local portable (`src/lib/assistant/`) : fautes, dates, entités,
  quantités, pronoms, ambiguïtés, demandes enchaînées, < 50 ms sur 3 000 produits.
- [x] Réponses : action confirmée, navigation, cartes (CA comparé, meilleures
  ventes, ruptures avec remise en vente, équipe au planning, réservations),
  sélecteur de produit avec recherche, suggestions de repli.
- [x] Information sur l'apprentissage et les limites (« Comment je fonctionne »).
- [x] Mesure d'usage complète, envoi par lots, `fetch keepalive` à la
  fermeture, file hors ligne.
- [x] Modèle embarqué + cache local + mode mock.

Retiré : la bascule clair / sombre (le back-office n'a pas de fournisseur de
thème branché, l'action n'aurait rien fait).

---

## 3. Plus tard

- [ ] POS : intentions `surface = pos`, prise de commande orale (« deux
  margherita et un coca » : quantités et entités multiples déjà reconnues),
  portage Dart du moteur.
- [ ] Plusieurs demandes ou plusieurs produits traités d'un coup.
- [ ] Préremplissage du formulaire de création de produit (nom, prix) depuis
  la phrase.
- [ ] Repli vers un LLM derrière le même champ, si un jour le budget le permet.
