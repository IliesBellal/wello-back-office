# Clôture de caisse et export comptable — alignement sur l'API (2026-10-05)

Côté API : `ib-welloresto-api/docs/EXPORT_COMPTABLE_MODES_CLOTURE.md`. Même
alignement côté app de caisse (`wello_resto_flutter/docs/decisions.md`,
addendum 2026-10-05).

## Ce qui change pour l'utilisateur

### Registres de caisse (page « Registres de caisse », `ClosureModal`)

- **Deux modes de clôture**, choisis par l'équipe WelloResto pour chaque
  établissement et inscrits sur chaque registre (`closing_mode`) :
  - **manuelle** (tous les établissements existants) : inchangée — fermeture,
    relevé de caisse (« Réel »), écart, validation ;
  - **automatique** : à la fermeture, l'API valide aussitôt le registre ; la
    fenêtre n'affiche que les **encaissements** (ni colonne « Réel », ni écart,
    ni copie vers le relevé). Le message de fermeture le dit (« clôturé
    automatiquement, aucun relevé à saisir »).
- **Remises de caisse** (« Réduction montant / pourcentage ») : comme chez
  Square ou Lightspeed, ce ne sont pas des encaissements. Elles n'apparaissent
  plus ni dans le théorique, ni dans le relevé, ni dans l'écart, ni dans le
  détail par serveur. Elles restent affichées pour information (« Remises
  accordées … (hors encaissements) »). L'écart est inchangé : la remise sort
  des deux côtés.
- **Détail TVA du registre** : ventes brutes et remises affichées quand il y en
  a ; le TTC est le net, base de la TVA.
- La fiche dépliée d'un registre indique son mode de clôture.

### Export comptable (bouton « Export Comptable Global »)

Le bouton ouvre désormais une fenêtre (`AccountingExportDialog`) :
- **mode de clôture de la période** (lu sur `GET /pos/accounting/export-options`) ;
- en **clôture automatique**, choix des **canaux de commande** (caisse, borne,
  ScanNOrder, Uber Eats, Deliveroo — tous cochés par défaut ; tout coché = pas
  de filtre) ; en **clôture manuelle**, rapport standard, non filtrable ;
- **refus explicites de l'API** affichés tels quels (période à cheval sur un
  changement de mode, mois non clôturé…) — auparavant un refus (HTTP 200,
  `status: "0"`) ouvrait un onglet vide ;
- **liste des exports archivés** (`GET /pos/accounting/exports`) avec
  retéléchargement (`GET /pos/accounting/exports/{id}/download`) : chaque PDF
  est conservé côté API dans un bucket privé, le lien renvoyé est signé et
  valable une heure — ne pas le stocker.

### Déclaration de TVA (page « Déclaration de TVA », `TVA.tsx`)

Mêmes montants que l'export comptable (remises de caisse déduites ; en clôture
automatique, TVA ventilée à partir des encaissements), calculés par l'API mois
par mois selon le mode de clôture.
- **Canaux** : caisse, borne, ScanNOrder, Uber Eats, Deliveroo (valeurs de
  `orders.order_source`, comme l'export) au lieu de « Restaurant / ScannOrder /
  Uber Eats / Deliveroo ».
- **Dates** : envoyées en dates de calendrier locales (`toLocalDateString`) ;
  `toUTCDateString` décalait d'un jour une date choisie à minuit heure de
  Paris (le 1er partait « 31 »).
- **Tableau mensuel** (`VATBreakdownTable`) : colonnes de TVA par taux lues
  dans `vat_by_rate` (dynamiques, triées) — le tableau lisait des champs
  `vat_10` / `vat_5_5`… que l'API ne renvoie pas, ces colonnes restaient à 0 ;
  mode de clôture affiché sous chaque mois.
- **CSV** : désormais en euros (corrigé côté API).

## Fichiers

- `src/components/cash/AccountingExportDialog.tsx` (nouveau)
- `src/pages/CashRegisterHistory.tsx` — fenêtre d'export, message de fermeture,
  mode de clôture dans la fiche.
- `src/components/cash/ClosureModal.tsx` — vue clôture automatique, remises.
- `src/components/cash/CashRegisterTvaDetailsDialog.tsx` — ventes brutes / remises.
- `src/services/financialReportsService.ts` — `exportGlobal(…, channels)` (lève
  `AccountingExportRefusedError` sur refus), `getAccountingExportOptions`,
  `listAccountingExports`, `getAccountingExportLink`, types associés.
- `src/services/cashRegisterService.ts` — résumé : `closing_mode`, `discounts`,
  remises écartées par code **ou** libellé (`isDiscountPayment`), aussi côté
  client pour une API qui ne le ferait pas encore ; détail TVA : `gross_ttc`,
  `discounts`.
- `src/services/cashRegisterHistoryService.ts` — `closing_mode` des registres.
- `src/services/vatService.ts` — canaux `order_source`, dates locales, types
  `closing_mode` / `vat_by_rate`.
- `src/pages/TVA.tsx`, `src/components/accounting/VATBreakdownTable.tsx`.

## Vérifications

- `eslint` sans erreur sur les fichiers modifiés ; `vite build` OK.
- `tsc -p tsconfig.app.json` : aucune nouvelle erreur (le projet en compte 81
  préexistantes, dont une dans `cashRegisterHistoryService.ts`, ligne
  `params` de `/accounting/registers/stats`, antérieure à ce changement).
- Pas de tests automatisés dans ce dépôt : parcours à vérifier à la main sur
  staging (établissement en clôture manuelle, puis un établissement passé en
  automatique via `/admin/merchants/{id}/cash-register-closing-modes`).

Non commité.
