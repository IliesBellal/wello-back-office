# Archives fiscales — page back-office (2026-10-08)

Côté API : `ib-welloresto-api/docs/attestation-conformite-05-lot-D-brief.md`
(lot D de la conformité caisse, phases 2 à 4).

## Ce que voit l'utilisateur

Menu **Comptabilité → Archives fiscales** (`/accounting/fiscal-archives`),
visible et accessible avec le droit `reports.financial.read`, le même que les
routes de l'API (`/accounting/*`).

- **Explication** : chaque mois clôturé est archivé automatiquement dans l'heure
  qui suit sa clôture. L'archive est à conserver six ans et à présenter en cas
  de contrôle. L'empreinte SHA-256 prouve que le fichier n'a pas été modifié.
- **Archive d'une période** : choix d'une période (par défaut, du 1er du mois à
  hier) et bouton « Générer l'archive ».
  - Jours clôturés uniquement (chaque journée est close la nuit suivante).
  - 31 jours au plus. La page le vérifie avant l'envoi et l'API le refuse
    aussi.
- **Liste** des archives, la plus récente d'abord :
  - période (« Septembre 2026 » pour une mensuelle, « 01/09/2026 → 10/09/2026 »
    pour une archive à la demande) ;
  - type, date de génération, taille ;
  - empreinte SHA-256 abrégée (un clic la copie en entier) ;
  - bouton « Télécharger ».

## Choix

- **Fichiers neufs** (`src/pages/FiscalArchives.tsx`,
  `src/services/fiscalArchivesService.ts`), plus une route dans `App.tsx` et une
  entrée dans `navConfig.ts`. Rien n'est ajouté à `financialReportsService.ts`
  ni à `queryKeys.ts`, qui portent d'autres travaux en cours ; la clé de requête
  `['fiscal-archives']` est locale à la page.
- **Erreurs** : l'API renvoie ses refus en 400, 409 ou 503, avec un message en
  français au premier niveau (`message`). `apiClient` affiche ce message ; la
  page n'ajoute pas de second toast. Les refus possibles :
  - période invalide ;
  - période non close ;
  - génération déjà en cours pour l'établissement ;
  - stockage indisponible.
- **Téléchargement** : un nouveau lien signé d'une heure à chaque clic. L'API
  inscrit chaque demande de lien au journal d'audit (`FISCAL_ARCHIVE_DOWNLOAD`),
  chaîné et signé. Le lien n'est donc jamais mis en cache côté page.
- **Génération synchrone** : le bouton attend la réponse, quelques secondes pour
  un mois chargé. Le résultat apparaît dans la liste, rechargée après la
  génération.

## Contrôle d'intégrité (lot E, 2026-10-08)

Carte « Contrôle d'intégrité » en bas de la même page
(`src/components/fiscal/FiscalIntegrityCard.tsx`), sur
`POST /accounting/fiscal-integrity`, avec le même droit.

- Période de 31 jours au plus, vérifiée par la page et par l'API.
- L'API rejoue, sans rien modifier : les chaînes signées (tickets, paiements,
  registres, journal, clôtures, archives), la numérotation des tickets, les
  clôtures recalculées et les commandes recoupées avec leurs tickets.
- Affichage :
  - verdict (Conforme = aucune erreur) ;
  - tableau des contrôles (éléments, erreurs, avertissements) ;
  - anomalies, avec l'explication des avertissements (données antérieures à
    la version attestée, écarts connus et tracés) ;
  - bouton « Télécharger le rapport » (fichier texte rendu par l'API).
- Un second contrôle lancé pendant le premier est refusé par l'API (409,
  message affiché par `apiClient`).
