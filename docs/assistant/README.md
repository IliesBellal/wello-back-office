# Assistant du back-office

Bouton flottant (bulle de discussion) présent sur toutes les pages du back-office (au-dessus de la
barre du bas sur mobile, en bas à droite sur ordinateur, raccourci ⌘J / Ctrl+J).
Il ouvre une bulle de conversation, en plein écran sur mobile, qui reprend les
actions rapides du tableau de bord et comprend les demandes en langage courant,
au clavier ou à la voix.

Marque de l'assistant : le W de WelloResto avec une étincelle au bout de sa
pointe (`WelloAssistantMark.tsx`, fichier `public/wello-assistant.svg`).

API : `ib-welloresto-api/docs/assistant.md`. Backlog : [`../assistant-backlog.md`](../assistant-backlog.md).

## Ce qu'il sait faire

| Type | Exemples |
|---|---|
| Agir (toujours confirmé) | « Plus de tiramisu », « remets la margherita en vente », « crée un produit » |
| Répondre | « CA d'hier », « CA borne aujourd'hui », « CA à emporter cette année », « CA ScanNOrder en janvier », « combien on a fait samedi ? », « meilleures ventes de la semaine », « qu'est-ce qui est en rupture ? », « qui bosse demain soir ? », « réservations de ce soir » |
| Documents | « Factures d'octobre », « relevés de virement de septembre », « rapport comptable du mois dernier », « documents comptables » : tous les documents de la période (mois précédent par défaut), téléchargeables d'un clic : rapport comptable, TVA, règlements, registres de caisse (ZIP), facture de commission et récapitulatif, relevés de virement, factures d'abonnement (gérants), archive fiscale |
| Emmener | N'importe quelle page de la navigation : « ouvre la TVA », « plan de salle », « mes horaires ». Avec une période pour les registres et l'analyse : « caisses de janvier » ouvre les registres de janvier |
| Comprendre | Fautes de frappe, oral familier, dates naturelles (« samedi dernier », « la semaine dernière », « le 12 novembre », « ce midi »), pronoms (« remets-le en vente »), voix (Web Speech API) |

Limites, annoncées dans l'interface (« Comment je fonctionne ») : une demande à
la fois (la suite est proposée en bouton), un produit à la fois, pas de
conversation libre ni de conseils, pas de mémoire d'une session à l'autre.

## Comment une phrase est comprise (version simple)

Le moteur fonctionne comme un serveur débutant avec un carnet : pour chaque
demande possible (une « intention »), le carnet liste les mots qui la signalent.

1. **Nettoyage** : « Y a plus de Tiramisù ! » devient `y a plus de tiramisu`.
2. **Repérage** des dates, des quantités et des noms connus du restaurant
   (produits, équipiers), avec tolérance aux fautes et aux noms partiels
   (« saumon » trouve « Pavé de saumon »).
3. **Notation** de chaque intention autorisée pour l'utilisateur (0 à 100) :
   phrases puis mots-clés trouvés, part de la demande expliquée, paramètres
   remplis ou manquants.
4. **Décision** :
   - une intention nettement en tête : elle est comprise ;
   - deux intentions proches : « Vous voulez dire… ? » ;
   - aucune : « Vous vouliez peut-être… » avec les plus proches.
5. **Exécution** : produit manquant ou ambigu, alors sélecteur ; action qui modifie
   quelque chose, alors confirmation ; puis appel des services habituels.
6. **Apprentissage** : si la personne a choisi une suggestion ou un produit à
   la main et que l'action a réussi, la formulation part à l'API comme
   candidat (« en sommeil » → rupture ; « dessert du jour » → Tiramisu). L'API
   la promeut après quelques confirmations (règles dans la doc API).

## Architecture

```
src/lib/assistant/            ← portable : ni React, ni DOM, ni réseau (sauf api/modelStore/tracking)
  types.ts                    contrat du modèle et des résultats
  normalize.ts                normalisation (identique à normalize.go), similarité tolérante aux fautes
  dates.ts                    dates et créneaux en langage naturel
  entities.ts                 catalogue d'entités (index inversé), surnoms, quantités
  engine.ts                   prepareModel / understand / buildLearningSignal
  seed.ts                     pré-remplissage : SOURCE UNIQUE (modèle embarqué + migration SQL)
  defaultModel.ts             modèle embarqué construit depuis seed.ts
  modelStore.ts               cache local par établissement + rafraîchissement GET /assistant/model
  tracking.ts                 mesure d'usage par lots, file hors ligne, masquage e-mail / téléphone
  api.ts                      appels réseau en tâche de fond (sans loader global ni toast)

src/components/assistant/
  AssistantRoot.tsx           bouton flottant + chargement différé du panneau (monté dans App.tsx)
  anchor.ts                   présent seulement sur les pages qui rendent DashboardLayout
  AssistantPanel.tsx          bulle (ordinateur) / plein écran (mobile), session de mesure
  useAssistantConversation.ts déroulé des tours : compris / ambigu / repli, sélecteur, confirmation
  actions.ts                  gestionnaires : intention → services existants
  navIntents.ts               une intention par page visible de navConfig
  catalog.ts                  produits et équipiers (cache 5 min)
  quickActions.ts             tuiles d'accueil (l'ancienne barre d'actions rapides)
  AssistantBlocks / Composer / Welcome / Info   interface
```

Le panneau est chargé à la demande (survol ou toucher du bouton) : rien n'est
ajouté au chargement initial. Le moteur répond en moins de 50 ms sur un
catalogue de 3 000 produits (test `engine.test.ts`).

## Liens filtrés

Les pages Analyse, Registres de caisse, Rapports financiers, TVA, Pointages et
Réservations lisent leurs filtres dans l'URL (`src/lib/pageFilters.ts`) :
`?tab=ca&from=2026-01-01&to=2026-01-31&sources=KIOSK&types=TAKE_AWAY`.
L'historique des commandes garde ses paramètres (`startDate`, `endDate`,
`status`, `type`, `brand`) : « commandes annulées hier », « commandes Uber Eats
de la semaine dernière ».
Les liens « Voir l'analyse » de l'assistant reprennent la période et le canal
demandés. CA et meilleures ventes portent sur l'établissement de la session.

## Ajouter une capacité

1. Ajouter l'intention dans `src/lib/assistant/seed.ts` (mots-clés, phrases,
   exemples, slots, droit requis, `confirm` si elle modifie quelque chose).
2. Ajouter son gestionnaire dans `src/components/assistant/actions.ts` (clé = `action`).
3. Ajouter des cas dans `src/lib/assistant/__tests__/engine.test.ts`.
4. Régénérer la migration de l'API :
   `npm run assistant:seed-sql -- ../ib-welloresto-api/migrations/todo 207_assistant_seed`
   (ou un nouveau numéro si 207 est déjà appliquée en production : le script est rejouable).

Une nouvelle page de `navConfig` est comprise automatiquement par son titre ;
on ne l'ajoute au seed que pour lui donner des synonymes.

## Mesure d'usage

Une session par ouverture ; événements horodatés à la ms, envoyés toutes les
4 s (et à la fermeture, `fetch keepalive`), gardés hors ligne (500 au plus) :

`opened`, `closed` (issue : action / info / navigate / fallback / abandon),
`onboarding_seen`, `model_loaded`, `chip_clicked`, `example_clicked`,
`query_submitted` (texte, clavier ou voix, temps de frappe, durée moteur),
`voice_started` / `voice_result` (confiance, durée) / `voice_error`,
`intent_matched` (score, candidats, entités), `intent_ambiguous`, `fallback`,
`suggestion_clicked` (rang), `slot_requested` / `slot_filled`,
`confirmation_shown`, `confirmed`, `cancelled`, `action_succeeded` (+ signal
d'apprentissage), `action_failed`, `navigated`, `rephrased` (nouvelle demande
moins de 30 s après un échec), `multi_request`, `feedback` (👍 / 👎),
`learning_info_opened`.

## Réutilisation sur le POS

Le contrat du modèle (`types.ts`) et le moteur (`normalize`, `dates`,
`entities`, `engine`) n'ont aucune dépendance : portables tels quels sur une
borne web, ou en Dart pour l'application Flutter du POS. Il suffit de :

- demander le modèle avec `surface=pos` (intentions déclarant `pos`) ;
- fournir le catalogue (produits, tables…) au moteur ;
- implémenter les gestionnaires des intentions POS. La prise de commande
  orale s'appuie sur les quantités et les entités multiples déjà reconnues :
  « deux margherita et un coca » → 2 entités produit + quantités.
