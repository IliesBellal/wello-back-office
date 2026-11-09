# Assistant mobile (FAB) : backlog

Ce document liste tout ce qui reste à construire autour de l'assistant mobile,
le bouton flottant qui donne les actions rapides et un champ de demande en
langage naturel.

**Principe directeur.** L'assistant est 100 % gratuit. Il n'utilise aucun LLM
payant. Il reconnaît des « intentions » à partir de mots-clés, de synonymes et
de motifs. Ce « modèle » est stocké en base et s'améliore grâce aux requêtes
non comprises, elles aussi enregistrées.

---

## 1. Plateforme admin (plus tard, hors de ce repo)

L'écran d'administration de l'assistant sera intégré à la future plateforme
admin. Il ne fait pas partie du back-office restaurateur.

### 1.1 Revue des requêtes non comprises (replis)
- [ ] Liste des requêtes en repli, triée par fréquence, filtrable par
  période, établissement, rôle et mode de saisie (clavier ou voix).
- [ ] Regroupement des requêtes similaires (« plus de saumon », « y a plus de
  saumon », « saumon fini ») pour traiter un groupe d'un coup.
- [ ] Pour chaque groupe, affichage de ce que l'utilisateur a cliqué ensuite
  (`suggestion_clicked`), qui sert d'étiquette proposée automatiquement.
- [ ] Actions en un clic :
  - [ ] ajouter comme synonyme d'une intention existante ;
  - [ ] ajouter comme nouveau motif (avec variable, par ex. `plus de {produit}`) ;
  - [ ] créer une nouvelle intention à partir du groupe ;
  - [ ] marquer comme « hors périmètre » (bruit, test, insulte…).
- [ ] Historique de qui a modifié quoi dans le modèle, et quand.

### 1.2 Gestion du « modèle » (intentions)
- [ ] CRUD des intentions : nom, description, mots-clés, synonymes, motifs,
  entités attendues, action déclenchée, permission requise, confirmation
  obligatoire ou non, actif ou inactif.
- [ ] Gestion des listes de synonymes partagées (par ex. « rupture » =
  « plus de », « épuisé », « fini », « sold out »).
- [ ] Bac à sable : taper une phrase et voir l'intention reconnue, le score,
  les entités extraites et les candidats concurrents.
- [ ] Tests de non-régression : un jeu de phrases de référence rejoué à chaque
  modification, avec une alerte si une phrase change d'intention.
- [ ] Versionnage du modèle, avec retour arrière vers une version précédente.
- [ ] Publication : les changements sont servis par `GET /assistant/model`.
  Les clients rafraîchissent leur cache au prochain lancement.

### 1.3 Tableau de bord d'analyse
- [ ] **Taux de compréhension** (requêtes reconnues / requêtes totales) et son
  évolution par semaine. C'est le KPI principal.
- [ ] **Taux de succès réel** : sessions terminées par une action réussie.
- [ ] Top des requêtes non comprises.
- [ ] Top des intentions utilisées, par rôle, établissement et créneau horaire.
- [ ] Utilisation des chips d'actions rapides par rapport au champ libre.
- [ ] Clavier ou voix : répartition et taux d'échec de chacun.
- [ ] Temps jusqu'à l'action, de l'ouverture du FAB à l'action réussie.
- [ ] Taux de reformulation (nouvelle requête moins de 30 s après une autre).
- [ ] Taux d'annulation des confirmations, par intention. Un taux élevé
  indique une intention mal reconnue.
- [ ] Échecs d'actions (`action_failed`) par code d'erreur.
- [ ] Ambiguïtés fréquentes (intentions qui se « volent » les requêtes).
- [ ] Feedback 👍 / 👎.
- [ ] Adoption : utilisateurs actifs par jour et par semaine, rétention,
  utilisateurs qui l'essaient une fois puis abandonnent.
- [ ] Entonnoir : ouverture → saisie → intention → confirmation → succès.
- [ ] Vue d'une session : rejeu chronologique des événements d'une session.

### 1.4 RGPD et données
- [ ] Accès aux analyses et au texte brut réservé aux admins.
- [ ] Purge automatique ou anonymisation du texte brut après 90 jours (durée
  à valider).
- [ ] Export et suppression des données d'un utilisateur sur demande.
- [ ] Mention de l'assistant dans la politique de confidentialité.

---

## 2. Backend (`welloresto-api`)

### 2.1 Tables
- [ ] `assistant_intents` : définition du modèle (voir 1.2), avec version.
- [ ] `assistant_model_versions` : snapshots publiés du modèle.
- [ ] `assistant_sessions` : une ligne par ouverture du FAB (utilisateur,
  rôle, établissement, page d'origine, appareil, en ligne ou non, début, fin,
  durée, issue : `action` / `abandon` / `fallback`).
- [ ] `assistant_events` : une ligne par interaction (session, type, horodatage
  en ms, charge utile JSON).
- [ ] Index sur `created_at`, `merchant_id`, `event_type`, `session_id`.

### 2.2 Endpoints back-office
- [ ] `GET /assistant/model` : modèle courant, avec ETag pour le cache.
- [ ] `POST /assistant/events` : réception par lots, idempotente (identifiant
  d'événement généré côté client).
- [ ] Vérification serveur des permissions sur toutes les actions déclenchées.
  Le serveur ne fait jamais confiance au front sur ce point.

### 2.3 Endpoints plateforme admin
- [ ] CRUD intentions et synonymes, publication et retour arrière de version.
- [ ] Bac à sable : évaluer une phrase contre le modèle.
- [ ] Agrégats pour le tableau de bord (voir 1.3).
- [ ] Liste et regroupement des replis.
- [ ] Purge et export RGPD.

---

## 3. Front back-office (ce repo)

- [ ] FAB mobile au-dessus de la `BottomNav`, ouvrant une bottom sheet.
- [ ] Chips d'actions rapides (rupture, créer un produit, planning, caisses),
  filtrées par permission. Même source que `QuickActions` sur desktop.
- [ ] Champ de demande avec dictée (Web Speech API).
- [ ] Moteur d'intentions local : normalisation, reconnaissance, extraction
  d'entités, score, gestion des ambiguïtés.
- [ ] Réponses : action avec confirmation, redirection, carte d'information
  (CA, planning…), repli avec suggestions.
- [ ] Chargement et cache du modèle (`GET /assistant/model`), avec un modèle
  par défaut embarqué.
- [ ] Tracking complet (voir 2.1) : envoi par lots, `sendBeacon` à la
  fermeture, file d'attente hors ligne, masquage automatique des e-mails et
  numéros de téléphone.
- [ ] Mode mock (`VITE_USE_MOCK`) tant que l'API n'existe pas.
