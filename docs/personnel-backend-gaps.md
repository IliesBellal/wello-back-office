# Personnel backend gaps

## Principes appliques

- Aucun endpoint n'a ete invente.
- Aucun payload n'a ete suppose quand le contrat backend n'etait pas explicite.
- Les actions non supportees par l'API actuelle sont desactivees dans l'interface avec un message explicite.

## Endpoints effectivement exploites dans cette premiere version

### Employes

- `GET /planning/employees`
- `GET /planning/employees/{id}`
- `PATCH /planning/employees/{id}`

Usage frontend:

- liste paginee des employes
- filtres de base
- fiche detaillee employe
- edition des informations RH connues
- rattachement d'un `user_id` apres creation de compte

### Comptes utilisateurs

- `POST /users/create`

Usage frontend:

- creation d'un compte utilisateur depuis l'onglet `Parametres`
- transmission de `merchant_id` quand disponible dans le contexte d'authentification courant
- rattachement ulterieur a l'employe via `PATCH /planning/employees/{id}`

### Positions et references planning

- `GET /planning/positions`
- `GET /planning/settings`
- `GET /planning/contract-types`
- `GET /planning/attendance-sources`
- `GET /planning/event-types`

Usage frontend:

- filtres et selects de poste/contrat
- activation conditionnelle du pointage selon `attendance_source`
- exposition read-only des references planning

### Documents employe

- `GET /planning/employees/{id}/documents`
- `POST /planning/uploads/employee-documents`
- `POST /planning/employees/{id}/documents`
- `GET /planning/employees/{id}/documents/{documentId}/download`
- `DELETE /planning/employees/{id}/documents/{documentId}`

Usage frontend:

- upload en deux etapes conforme au contrat fourni
- liste paginee des documents
- telechargement
- suppression

### Pointage

- `GET /planning/employees/{id}/time-entries/current`
- `GET /planning/employees/{id}/time-entries`
- `POST /planning/employees/{id}/time-entries/start`
- `POST /planning/employees/{id}/time-entries/stop`

Usage frontend:

- affichage de l'entree en cours
- historique pagine
- actions `start` et `stop` activees uniquement si `planning.settings.attendance_source === "pointage"`

#### Correction de pointage par le manager (NOUVEAU — backend à livrer)

Front consomme (ecran `Pointages`) :

- `PATCH /planning/employees/{id}/time-entries/{entry_id}` — correction manuelle.
  Body : `{ clock_in_at?, clock_out_at?, clock_in_note?, clock_out_note?, shift_id?, modification_reason }`.
  `modification_reason` **obligatoire**. `modified_by` doit etre extrait du token
  (jamais du payload). Reponse : `{ time_entry: { ...,  modified_by, modified_at, modification_reason } }`.
- `POST /planning/employees/{id}/time-entries` — creation manuelle complete
  (cas "l'employe a oublie de pointer"). Body :
  `{ clock_in_at, clock_out_at, clock_in_note?, clock_out_note?, shift_id?, modification_reason }`.
  Refuse si un pointage est deja ouvert pour l'employe.
- `DELETE /planning/employees/{id}/time-entries/{entry_id}?reason=...` —
  suppression manuelle, motif obligatoire (query string ou header dedie).
- Champs additionnels a exposer dans la reponse de `GET .../time-entries`
  et `GET .../time-entries/current` : `modified_by`, `modified_at`,
  `modification_reason` (nullable).

Manques restant a clarifier cote backend :

- Endpoint d'**historique complet** des corrections par entree (ex.
  `GET /planning/employees/{id}/time-entries/{entry_id}/audit`). Le front
  affiche aujourd'hui uniquement la derniere correction (`modified_by` +
  `modification_reason`) faute de pouvoir lister l'audit complet.
- Confirmer si le motif de suppression passe en query string, header
  (ex. `X-Modification-Reason`) ou body DELETE.
- Confirmer si la creation manuelle complete est exposee, ou s'il faut
  combiner `POST .../start` puis `POST .../stop` cote front (degrade,
  pas d'atomicite et perte du motif sur start/stop).
- Confirmer les regles serveur : `clock_out_at > clock_in_at`, un seul
  pointage ouvert par employe, refus en cas de `attendance_source = "planning"`.

### Conges

- `GET /planning/leave-requests`
- `DELETE /planning/leave-requests/{id}`

Usage frontend:

- lecture des demandes de conges filtrees par employe
- suppression uniquement

### Echanges de shifts

- `GET /planning/shift-swap-requests`
- `DELETE /planning/shift-swap-requests/{id}`

Usage frontend:

- lecture des demandes ou l'employe est demandeur ou cible
- suppression uniquement

### Planning

- `GET /planning/weeks`
- `GET /planning/weeks/{weekId}/shifts`
- `DELETE /planning/shifts/{id}`

Usage frontend:

- lecture des shifts par semaine
- filtrage frontend sur l'employe courant
- suppression uniquement

## Gaps backend documentes

### Droits d'acces utilisateur

Constat:

- aucun endpoint CRUD explicite pour lire ou modifier finement les droits/modules d'un compte utilisateur depuis la fiche employe

Consequence frontend:

- l'onglet `Droits d'acces` affiche une matrice read-only descriptive
- aucune edition n'est activee

### Lier un compte utilisateur existant

Constat:

- `POST /pos/link-user` existe, mais aucun endpoint de recherche/liste de comptes utilisateurs existants n'est disponible dans le contrat frontend courant

Consequence frontend:

- l'action `Lier un compte existant` reste desactivee
- aucun select de compte n'est affiche pour eviter d'inventer une source de donnees

### Reinitialisation du mot de passe

Constat:

- aucun endpoint de reset admin du mot de passe n'est fourni

Consequence frontend:

- action desactivee

### Deliaison utilisateur / employe / merchant

Constat:

- aucun endpoint documente pour delier proprement un user d'un merchant
- aucun contrat fiable pour remettre `employee.user_id` a `null` sans ambiguite metier

Consequence frontend:

- actions de deliaison desactivees

### CRUD des positions

Constat:

- la lecture des positions est disponible
- les payloads `POST /planning/positions` et `PATCH /planning/positions/{id}` ne sont pas documentes dans le scope frontend actuel

Consequence frontend:

- integration des positions en lecture uniquement
- pas de creation ni edition exposee

### Mutations conges

Constat:

- aucun payload explicite pour creation, edition ou changement de statut des conges n'a ete fourni

Consequence frontend:

- onglet `Conges` en lecture + suppression uniquement
- creation, edition et transitions de statut desactivees

### Mutations echanges de shifts

Constat:

- aucun payload explicite pour creation, edition ou changement de statut des demandes d'echange n'a ete fourni

Consequence frontend:

- onglet `Echanges de shifts` en lecture + suppression uniquement
- creation, edition et transitions de statut desactivees

### Creation / edition de shifts

Constat:

- aucun payload explicite pour creer ou modifier un shift dans ce scope n'a ete fourni

Consequence frontend:

- onglet `Planning` en lecture + suppression uniquement
- creation et edition desactivees

### Dataset utilisateurs detaille

Constat:

- la fiche employe connait `user_id`, mais cette premiere version ne s'appuie pas sur un endpoint stable de details utilisateur pour enrichir avatar, date de creation de compte, derniere connexion ou photo de profil

Consequence frontend:

- la section `Resume compte utilisateur` affiche les champs prepares mais majoritairement vides tant qu'un contrat backend stable n'est pas integre

## Regle de poursuite

Si un de ces gaps est leve plus tard, il faudra d'abord documenter le contrat exact du backend, puis seulement activer l'action correspondante dans l'interface.