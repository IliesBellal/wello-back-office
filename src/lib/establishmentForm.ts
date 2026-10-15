/**
 * Pure helpers behind CreateEstablishmentDialog — kept out of the component so
 * the shape of the POST /pos/create payload can be unit-tested without a DOM.
 */

import type { CreateMerchantRequest } from '@/services/authService';
import type { ParsedAddress } from '@/components/shared/AddressAutocomplete';

/** SIRET, digits only. Spaces are what people type ("123 456 789 00012"); the
 * backend derives the VAT number from the first 9 characters and has a unique
 * index on `^[0-9]{14}$`, so a spaced value silently escapes both. */
export const normalizeSiret = (raw: string): string => raw.replace(/\D/g, '');

export const isValidSiret = (raw: string): boolean => /^\d{14}$/.test(normalizeSiret(raw));

/** Same normalisation as the signup tunnel (ScreenEstablishment): the column is
 * short, an over-long value fails the INSERT with a raw SQLSTATE 22001. */
export const normalizePhone = (raw: string): string => raw.trim().replace(/[\s.\-()]/g, '');

export const MAX_PHONE_LENGTH = 15;

/** Google-resolved location fields. Always set or cleared as one unit so the
 * address text, its parts and its coordinates can never disagree. */
export interface PlaceFields {
  address: string;
  street_number: string;
  street: string;
  zip_code: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  place_id: string;
}

export const EMPTY_PLACE: PlaceFields = {
  address: '',
  street_number: '',
  street: '',
  zip_code: '',
  city: '',
  country: '',
  lat: null,
  lng: null,
  place_id: '',
};

/** A picked suggestion replaces every location field — including blanking the
 * ones Google did not return, instead of leaving the previous address's value. */
export const placeFromParsed = (parsed: ParsedAddress): PlaceFields => ({
  address: parsed.address,
  street_number: parsed.street_number,
  street: parsed.route,
  zip_code: parsed.postal_code,
  city: parsed.city,
  country: parsed.country_name,
  lat: parsed.lat,
  lng: parsed.lng,
  place_id: parsed.place_id,
});

/** Typing after a pick invalidates what the pick resolved: keep the text, drop
 * the coordinates / place id / parts that described the old address. zip and
 * city stay — they are plain editable inputs the user may be filling by hand. */
export const placeAfterManualEdit = (current: PlaceFields, text: string): PlaceFields => ({
  ...current,
  address: text,
  street_number: '',
  street: '',
  lat: null,
  lng: null,
  place_id: '',
});

export interface EstablishmentFormValues {
  full_name: string;
  siret: string;
  tel: string;
  email?: string;
  web_site?: string;
  package_id: string;
  zip_code?: string;
  city?: string;
}

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/** (0, 0) is "no coordinates" for the backend (stored as NULL), so a missing
 * value is simply omitted rather than sent as 0. */
const coordinate = (value: number | null): number | undefined =>
  value != null && Number.isFinite(value) && value !== 0 ? value : undefined;

export const buildCreateMerchantPayload = (
  // Partial: the project isn't compiled with strictNullChecks, so zod's inferred
  // form type has every key optional. The schema guarantees the required ones.
  values: Partial<EstablishmentFormValues>,
  place: PlaceFields,
  userId: string,
): CreateMerchantRequest => ({
  full_name: (values.full_name ?? '').trim(),
  siret: normalizeSiret(values.siret ?? ''),
  tel: normalizePhone(values.tel ?? ''),
  email: clean(values.email),
  web_site: clean(values.web_site),
  package_id: values.package_id,
  address: clean(place.address),
  street_number: clean(place.street_number),
  street: clean(place.street),
  // zip/city come from the form fields (the user may have corrected them),
  // not from the pick.
  zip_code: clean(values.zip_code),
  city: clean(values.city),
  country: clean(place.country),
  lat: coordinate(place.lat),
  lng: coordinate(place.lng),
  place_id: clean(place.place_id),
  user_id: userId,
  admin: true,
});

/** Whether a refreshed session lists the new merchant with a usable token. The
 * switcher logs in with that token, so an entry without one is a dead end. */
export const hasSwitchableMerchant = (
  merchants: ReadonlyArray<{ id: string; token: string }> | undefined,
  merchantId: string,
): boolean => !!merchants?.some((m) => m.id === merchantId && m.token.length > 0);
