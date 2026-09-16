# LOT B — Bandeau, SEPA, gestion d'abonnement (2026-09-15)

## Contexte

Un audit préalable (voir `ib-welloresto-api/docs/decisions.md`, entrée du
même jour) a confirmé que ce dépôt n'avait **aucune** trace de LOT B —
zéro occurrence de `activation-status`, `sepa/setup`, `subscriptions/*`,
`billing/*`, `admin/overrides`. Ce chantier construit tout le front-office
manquant, plus deux endpoints API qui manquaient eux aussi (`/subscriptions/current`,
`/billing/portal`), livrés côté `ib-welloresto-api` avant ce chantier.

## Ce qui a été construit

- **Bandeau de configuration** (§7.6) — `src/components/dashboard/ActivationStatusBanner.tsx`,
  monté une seule fois dans `DashboardLayout.tsx` (pas une route à part).
  Interroge `GET /merchant/activation-status` en polling (60 s +
  refetch au focus), jamais l'objet utilisateur mis en cache par le login
  (60 min de cache Redis côté API — c'est exactement ce que cet endpoint a
  été conçu pour éviter). Deux messages mutuellement exclusifs
  (`SETUP` / `trial_ends_at`), invisible sinon.
- **Écran de mandat SEPA** (§7.4) — `src/pages/settings/SepaSetup.tsx`
  (`/settings/billing/payment-method`). Premier usage de Stripe Elements
  dans ce dépôt (`@stripe/stripe-js` + `@stripe/react-stripe-js`,
  installés par ce chantier) : `IbanElement` + `confirmSepaDebitSetup`
  côté client, `client_secret` obtenu via `POST /billing/sepa/setup`.
  L'IBAN ne transite jamais par nos services.
- **Écran de gestion d'abonnement** (§7.7) — `src/pages/settings/SubscriptionManagement.tsx`
  (`/settings/subscription`). Trois cartes : composition actuelle
  (`GET /subscriptions/current`), modules à la carte (toggle → 
  `GET /subscriptions/preview` en lecture seule → `POST /subscriptions/items`
  pour appliquer ; comparaison pack-vs-à-la-carte affichée **telle que
  renvoyée par le serveur**, jamais recalculée côté client), et facturation
  (portail Stripe via `POST /billing/portal`, bouton "réessayer maintenant"
  via `POST /billing/retry-now` quand `subscription_status = past_due`).

## Décisions

- **Modules togglables limités aux 5 codes réellement priçables en
  self-service** (`reservation`, `haccp`, `planning`, `marketplaces`,
  `delivery` — voir `SUBSCRIPTION_MODULE_CODES` dans
  `subscriptionsService.ts`). Les codes plan (`essentiel`/`pro`/`complet`)
  sont un changement de plan, pas un toggle de module ; `kiosk`/`sms`
  n'ont pas de prix catalogue self-service côté API
  (`resolveUnitPriceCents` les rejette). Étendre cette liste doit d'abord
  être confirmé côté API.
- **Deux routes séparées** plutôt qu'un écran unique : `/settings/billing/payment-method`
  (SEPA, cible directe du CTA du bandeau) et `/settings/subscription`
  (composition + facturation, qui linke vers la première si aucun moyen de
  paiement n'existe). Suit le découpage 3b/3c du brief plutôt que de les
  fusionner.
- **Convention `welloApi.ts` + `unwrap()`** suivie pour les deux nouveaux
  services (`billingService.ts`, `subscriptionsService.ts`), pas
  l'ancienne convention `withMock` d'`integrationsService.ts` — décision
  du research brief : pas de données mock plausibles pour un flux
  d'argent réel, et c'est la convention active pour tout nouveau domaine
  (voir `EquipeSettings.tsx`).
- **Entrée de nav ajoutée** dans `navConfig.ts` (`Paramètres > Abonnement
  & facturation`, gate `settings.manage`) — sans ça, l'écran de gestion
  d'abonnement aurait été construit mais invisible, exactement le
  problème que l'audit initial a documenté pour tout LOT B.

## Ce qui manque encore pour un déploiement réel

- **`VITE_STRIPE_PUBLISHABLE_KEY` n'est configurée nulle part**
  (`.env.example` documente la variable, mais aucune vraie clé n'est
  connue de cette session). Sans elle, `src/lib/stripeClient.ts` logue une
  erreur et résout `null` — l'écran SEPA s'affiche mais l'IBAN Element ne
  charge pas. Doit être renseignée en local/staging/production avec la
  clé publishable correspondant exactement au mode (test/live) de
  `STRIPE_API_KEY` côté API.
- Testé en local avec Playwright contre un token factice et des réponses
  API mockées par interception réseau (voir vérification ci-dessous) —
  jamais contre un vrai compte marchand en `SETUP` réel.

## Vérification effectuée (chantier 3)

`npx tsc --noEmit -p tsconfig.app.json` et `npm run build` : aucune
nouvelle erreur imputable à ce chantier (les erreurs pré-existantes du
dépôt, hors périmètre, restent identiques). `npx eslint` propre sur tous
les fichiers touchés. Testé dans un vrai Chromium (Playwright) : bandeau,
composition actuelle, toggle de module + aperçu preview (total/prorata/
comparaison pack) et écran SEPA (pré-remplissage nom/email, mandat,
dégradation propre sans clé Stripe) rendent tous correctement, sans
erreur console imputable à ce code.

---

# LOT B chantier 4 — deux ajustements du tunnel d'inscription (2026-09-16)

## Ce qui a été fait

**4a — résumé du préréglage retiré.** `ScreenRestaurationType.tsx` (écran
3, "type de restauration") ne rend plus `ARCHETYPE_SUMMARY` (le bloc de
trois lignes "Suggestions : ..."). L'écran ne fait plus que le choix
d'archétype ; le consentement et la soumission finale, qui vivaient sur
cet écran, sont passés au nouvel écran 4.

**4b — écran de sélection des modules.** Nouveau fichier `ScreenModules.tsx`,
inséré comme écran 4 (le tunnel passe de 3 à 4 écrans — barre de
progression, textes "L'étape N sur 4" et `Step` type de `CreerMonCompte.tsx`
mis à jour partout, y compris dans `ScreenIdentity.tsx`/`ScreenEstablishment.tsx`
qui affichaient encore "sur 3"). Deux sources de pré-cochage, mutuellement
exclusives :
  - Un `context_token` déjà présent (panier du configurateur vitrine,
    Chantier 11) → pré-coche exactement `state.cartModules` (nouveau champ
    de `TunnelState`, alimenté par `cart.modules` de la réponse
    `GET /v1/public/signup-context/{token}`). Aucun appel à
    `suggested-modules` dans ce cas.
  - Sinon → `GET /v1/public/presets/{code}/suggested-modules` (LOT B
    chantier 2) pré-coche `suggested_modules`, chacun avec le badge
    "fréquemment choisi pour ce type d'établissement".

Le client peut cocher/décocher librement. Chaque changement de sélection
(debounce 500 ms) réappelle `POST /v1/public/signup-context` avec le
panier édité — **c'est le même mécanisme Chantier 11 que la vitrine
utilise déjà**, pas un nouvel endpoint : le prix affiché (et le plan
choisi, `essentiel`/`pro`/`complet`, puisque `ResolveCheapestPlan` choisit
le pack le moins cher qui couvre les modules demandés) vient toujours du
serveur. Le `context_token`/`resolved_plan` résultants sont réécrits dans
`TunnelState` à chaque appel, si bien que la soumission finale
(`POST /v1/signup`) porte déjà le bon `context_token` sans code
supplémentaire — `SignupRequestPayload` le consommait déjà.

## Décision importante : portée réelle de la sélection de modules

Vérifié dans `ib-welloresto-api/internal/modules/signup/service.go`
(`resolveContext`, `createOwnerAndMerchant`) : `context_token` ne
détermine que **quel `packageID` (quel plan) est assigné au marchand** à
la création — il n'écrit aucune ligne `subscription_items` individuelle
par module. Le préréglage (`preset_code`, `ApplyPreset`) est un axe
totalement séparé (config `merchant_parameters`/catégories/plan de
salle), jamais les modules facturés. Autrement dit : l'écran 4 pré-
configure fidèlement **quel plan** le marchand aura via la même
tarification que le reste du produit, mais ne provisionne pas encore
individuellement chaque module côté `subscription_items` — cette
composition détaillée se règle après coup via l'écran de gestion
d'abonnement du chantier 3c. Aucune extension d'API n'a été nécessaire
pour 4b au-delà de ce que le chantier 2 avait déjà livré
(`suggested-modules`) : le brief ne demandait qu'un affichage de prix
serveur, pas un provisioning différent à l'inscription — signalé ici
plutôt que supposé silencieusement, à confirmer avec l'équipe produit si
un provisioning module-par-module dès l'inscription est réellement
attendu.

## Vérification effectuée (chantier 4)

`tsc`/`eslint`/`npm run build` propres sur tous les fichiers touchés
(`ScreenRestaurationType.tsx`, `ScreenModules.tsx`, `CreerMonCompte.tsx`,
`tunnelState.ts`, `ScreenIdentity.tsx`, `ScreenEstablishment.tsx`).
Parcours complet des 4 écrans testé en Chromium réel (Playwright, API
mockée par interception réseau) dans les deux branches :
  - **sans** `context_token` : archétype "Restaurant traditionnel" →
    HACCP + Planning pré-cochés avec badge, prix serveur affiché
    (149,00 €), toggle "Marketplaces" → recalcul live (184,00 €, plan
    "pro"), soumission → `POST /v1/signup` → connexion automatique →
    arrivée sur `/`, sans erreur console imputable à ce code.
  - **avec** `context_token` (`?ctx=...`, simulant la vitrine) : panier
    `["delivery","marketplaces"]` → ces deux modules pré-cochés SANS
    badge, `suggested-modules` jamais appelé, HACCP resté décoché —
    confirme que les deux sources de pré-cochage restent bien exclusives.
