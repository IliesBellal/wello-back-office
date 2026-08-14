/**
 * Saisie manuelle de clients : de la grille à l'écran vers le payload
 * canonique.
 *
 * Miroir de `BuildManualCustomerImport` côté API
 * (internal/modules/customers/importer/manual.go) pour ce qu'il refuse —
 * nom vide, ni email ni téléphone, email malformé — afin que l'utilisateur le
 * voie sur la ligne fautive plutôt qu'en retour d'appel générique. Ce
 * provider est STRICT (contrairement à Zelty) : une ligne qui ne passe pas
 * ces règles fait échouer tout l'envoi côté serveur, sans indiquer quelle
 * ligne — d'où l'intérêt de le dire ici, avant l'appel.
 *
 * Fonctions pures : elles ne lisent que les lignes saisies.
 */

import type { CustomerManualImportInput } from '@/types/customerImport';

/**
 * Une ligne de la grille. Tout y est en chaîne (sauf le consentement, une
 * case à cocher) : c'est ce que l'utilisateur tape, converti seulement à
 * l'envoi.
 */
export interface ManualCustomerRow {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  businessName: string;
  /** Tel que tapé, format JJ/MM/AAAA — le serveur le reparse à l'identique. */
  birthdate: string;
  additionalInfo: string;
  deliveryNotes: string;
  advertisingConsent: boolean;
}

export type ManualCustomerTextField = Exclude<keyof ManualCustomerRow, 'id' | 'advertisingConsent'>;

let rowSequence = 0;

export const createManualCustomerRow = (
  seed: Partial<Omit<ManualCustomerRow, 'id'>> = {},
): ManualCustomerRow => {
  rowSequence += 1;
  return {
    id: `manual-customer-row-${rowSequence}`,
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    businessName: '',
    birthdate: '',
    additionalInfo: '',
    deliveryNotes: '',
    advertisingConsent: false,
    ...seed,
  };
};

/**
 * Duplique une ligne en gardant ce qui se répète d'un client à l'autre —
 * adresse, consentement — et en vidant l'identité (nom, contact) : c'est le
 * geste attendu pour saisir plusieurs clients d'une même famille ou d'une
 * même entreprise à la suite.
 */
export const duplicateManualCustomerRow = (row: ManualCustomerRow): ManualCustomerRow =>
  createManualCustomerRow({
    address: row.address,
    businessName: row.businessName,
    advertisingConsent: row.advertisingConsent,
  });

/** Une ligne à laquelle personne n'a touché — ignorée à l'envoi plutôt que signalée. */
export const isManualCustomerRowBlank = (row: ManualCustomerRow): boolean =>
  !row.name.trim() &&
  !row.firstName.trim() &&
  !row.lastName.trim() &&
  !row.email.trim() &&
  !row.phone.trim() &&
  !row.address.trim() &&
  !row.businessName.trim() &&
  !row.birthdate.trim() &&
  !row.additionalInfo.trim() &&
  !row.deliveryNotes.trim() &&
  !row.advertisingConsent;

/** Erreurs de saisie, par identifiant de ligne puis par champ. */
export type ManualCustomerRowErrors = Map<string, Partial<Record<ManualCustomerTextField, string>>>;

export interface ManualCustomerValidation {
  errors: ManualCustomerRowErrors;
  /** Lignes qui partiront réellement, dans l'ordre de la grille. */
  submittable: ManualCustomerRow[];
  canSubmit: boolean;
}

/** Même regex que `validateEmail` côté serveur (values.go) : simple, pas RFC-complète. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateManualCustomerRows = (rows: ManualCustomerRow[]): ManualCustomerValidation => {
  const errors: ManualCustomerRowErrors = new Map();
  const submittable = rows.filter((row) => !isManualCustomerRowBlank(row));

  const setError = (rowId: string, field: ManualCustomerTextField, message: string) => {
    const existing = errors.get(rowId) ?? {};
    if (!existing[field]) {
      existing[field] = message;
      errors.set(rowId, existing);
    }
  };

  submittable.forEach((row) => {
    if (!row.name.trim()) {
      setError(row.id, 'name', 'Nom requis');
    }

    const email = row.email.trim();
    const phone = row.phone.trim();
    if (!email && !phone) {
      setError(row.id, 'email', 'Email ou téléphone requis');
      setError(row.id, 'phone', 'Email ou téléphone requis');
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      setError(row.id, 'email', 'Email invalide');
    }
  });

  return {
    errors,
    submittable,
    canSubmit: submittable.length > 0 && errors.size === 0,
  };
};

/** Construit le payload envoyé à la prévisualisation. */
export const buildManualCustomerPayload = (
  rows: ManualCustomerRow[],
): CustomerManualImportInput[] =>
  rows
    .filter((row) => !isManualCustomerRowBlank(row))
    .map((row) => ({
      name: row.name.trim(),
      first_name: row.firstName.trim(),
      last_name: row.lastName.trim(),
      email: row.email.trim(),
      phone: row.phone.trim(),
      address: row.address.trim(),
      floor_number: '',
      door_number: '',
      additional_address: '',
      business_name: row.businessName.trim(),
      birthdate: row.birthdate.trim(),
      additional_info: row.additionalInfo.trim(),
      delivery_notes: row.deliveryNotes.trim(),
      advertising_consent: row.advertisingConsent,
    }));
