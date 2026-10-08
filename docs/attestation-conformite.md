# Attestation de conformité — page back-office (2026-10-08)

Côté API : `ib-welloresto-api/docs/attestation-conformite-07-lot-F-brief.md`
(lot F de la conformité caisse).

Menu **Comptabilité → Attestation de conformité** (`/accounting/attestation`),
visible avec `reports.financial.read`. La génération exige en plus
`settings.manage`, vérifié par l'API.

## Ce que voit l'utilisateur

- **Explication** : l'attestation individuelle de l'éditeur (modèle
  BOI-LETTRE-000242) justifie, en cas de contrôle fiscal, que le logiciel de
  caisse respecte les conditions de l'article 286 du code général des impôts.
  Le volet 1 est signé par l'éditeur, le volet 2 par le représentant légal de
  l'établissement.
- **Indisponible** : l'API en donne la raison (génération pas encore ouverte,
  SIRET manquant…), affichée telle quelle.
- **Volet 2** :
  - raison sociale ;
  - SIRET, non modifiable ;
  - date d'acquisition et date de début d'utilisation, proposées par l'API ;
  - nom du représentant légal ;
  - ville ;
  - case de certification, qui rappelle l'article 441-1 du code pénal.

  « Signer et générer l'attestation » ouvre le PDF.
- **Liste** :
  - version, raison sociale, signataire, date, référence ;
  - « Périmée » si une nouvelle version majeure est en service ;
  - Télécharger ;
  - Envoyer par e-mail, au comptable par exemple.

## Choix

- Fichiers neufs (`src/pages/Attestation.tsx`,
  `src/services/attestationsService.ts`), plus une route et une entrée de menu.
- Les refus de l'API (400 / 409 / 503) portent un message en français,
  affiché par `apiClient`.
