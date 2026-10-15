/**
 * Tests des helpers de CreateEstablishmentDialog (payload de POST /pos/create).
 */

import { describe, expect, it } from 'vitest';

import {
  EMPTY_PLACE,
  buildCreateMerchantPayload,
  hasSwitchableMerchant,
  isValidSiret,
  normalizePhone,
  normalizeSiret,
  placeAfterManualEdit,
  placeFromParsed,
} from './establishmentForm';
import type { ParsedAddress } from '@/components/shared/AddressAutocomplete';

const parsed = (over: Partial<ParsedAddress> = {}): ParsedAddress => ({
  address: '117 Route de Lorraine, 57000 Metz, France',
  street: '117 Route de Lorraine',
  street_number: '117',
  route: 'Route de Lorraine',
  city: 'Metz',
  postal_code: '57000',
  country: 'FR',
  country_name: 'France',
  lat: 49.111387,
  lng: 6.1796713,
  place_id: 'ChIJabc',
  name: null,
  phone: null,
  opening_hours: null,
  business_types: null,
  ...over,
});

const values = {
  full_name: '  Brasserie du midi ',
  siret: '123 456 789 00012',
  tel: '+33 6 00-00.00 00',
  email: '',
  web_site: '',
  package_id: '1',
  zip_code: '57000',
  city: 'Metz',
};

describe('normalizeSiret / isValidSiret', () => {
  it('strips every non-digit', () => {
    expect(normalizeSiret('123 456 789 00012')).toBe('12345678900012');
    expect(normalizeSiret('123.456.789-00012')).toBe('12345678900012');
  });

  it('accepts exactly 14 digits once normalised', () => {
    expect(isValidSiret('123 456 789 00012')).toBe(true);
    expect(isValidSiret('12345678900012')).toBe(true);
  });

  it('rejects wrong lengths and non-numeric input', () => {
    expect(isValidSiret('')).toBe(false);
    expect(isValidSiret('1234567890001')).toBe(false);
    expect(isValidSiret('123456789000123')).toBe(false);
    expect(isValidSiret('abcdefghijklmn')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('removes spaces, dots, dashes and parentheses', () => {
    expect(normalizePhone(' +33 (0)6 00-00.00 00 ')).toBe('+330600000000');
  });
});

describe('placeFromParsed', () => {
  it('copies every location field from the pick', () => {
    expect(placeFromParsed(parsed())).toEqual({
      address: '117 Route de Lorraine, 57000 Metz, France',
      street_number: '117',
      street: 'Route de Lorraine',
      zip_code: '57000',
      city: 'Metz',
      country: 'France',
      lat: 49.111387,
      lng: 6.1796713,
      place_id: 'ChIJabc',
    });
  });

  it('blanks fields Google did not return instead of keeping the previous ones', () => {
    const next = placeFromParsed(parsed({ street_number: '', postal_code: '', city: '' }));
    expect(next.street_number).toBe('');
    expect(next.zip_code).toBe('');
    expect(next.city).toBe('');
  });
});

describe('placeAfterManualEdit', () => {
  it('keeps the typed text but drops coordinates, place id and street parts', () => {
    const picked = placeFromParsed(parsed());
    const edited = placeAfterManualEdit(picked, '12 rue des Lilas');
    expect(edited.address).toBe('12 rue des Lilas');
    expect(edited.lat).toBeNull();
    expect(edited.lng).toBeNull();
    expect(edited.place_id).toBe('');
    expect(edited.street_number).toBe('');
    expect(edited.street).toBe('');
  });

  it('does not mutate its input', () => {
    const picked = placeFromParsed(parsed());
    placeAfterManualEdit(picked, 'x');
    expect(picked.lat).toBe(49.111387);
  });
});

describe('buildCreateMerchantPayload', () => {
  it('sends normalised identity fields and the owner link', () => {
    const payload = buildCreateMerchantPayload(values, placeFromParsed(parsed()), 'user-1');
    expect(payload).toMatchObject({
      full_name: 'Brasserie du midi',
      siret: '12345678900012',
      tel: '+33600000000',
      package_id: '1',
      user_id: 'user-1',
      admin: true,
    });
  });

  it('sends the resolved location: street parts, coordinates, place id, country', () => {
    const payload = buildCreateMerchantPayload(values, placeFromParsed(parsed()), 'user-1');
    expect(payload).toMatchObject({
      address: '117 Route de Lorraine, 57000 Metz, France',
      street_number: '117',
      street: 'Route de Lorraine',
      zip_code: '57000',
      city: 'Metz',
      country: 'France',
      lat: 49.111387,
      lng: 6.1796713,
      place_id: 'ChIJabc',
    });
  });

  it('takes zip and city from the form fields, not from the pick', () => {
    const payload = buildCreateMerchantPayload(
      { ...values, zip_code: '57070', city: 'Metz-Borny' },
      placeFromParsed(parsed()),
      'user-1',
    );
    expect(payload.zip_code).toBe('57070');
    expect(payload.city).toBe('Metz-Borny');
  });

  it('omits empty optionals rather than sending empty strings', () => {
    const payload = buildCreateMerchantPayload(values, EMPTY_PLACE, 'user-1');
    expect(payload).not.toHaveProperty('email', '');
    expect(payload.email).toBeUndefined();
    expect(payload.web_site).toBeUndefined();
    expect(payload.address).toBeUndefined();
    expect(payload.place_id).toBeUndefined();
    expect(payload.country).toBeUndefined();
  });

  it('never sends 0 / NaN / null coordinates (the backend stores 0 as NULL)', () => {
    for (const bad of [null, 0, Number.NaN]) {
      const payload = buildCreateMerchantPayload(values, { ...EMPTY_PLACE, lat: bad, lng: bad }, 'u');
      expect(payload.lat).toBeUndefined();
      expect(payload.lng).toBeUndefined();
    }
  });

  it('sends free-typed text without coordinates after a manual edit', () => {
    const edited = placeAfterManualEdit(placeFromParsed(parsed()), '12 rue des Lilas');
    const payload = buildCreateMerchantPayload(values, edited, 'u');
    expect(payload.address).toBe('12 rue des Lilas');
    expect(payload.lat).toBeUndefined();
    expect(payload.place_id).toBeUndefined();
    expect(payload.street).toBeUndefined();
  });
});

describe('hasSwitchableMerchant', () => {
  const merchants = [
    { id: '2', token: 'tok-2' },
    { id: '230', token: '' },
  ];

  it('is true for a listed merchant with a token', () => {
    expect(hasSwitchableMerchant(merchants, '2')).toBe(true);
  });

  it('is false when the merchant is missing or has no token', () => {
    expect(hasSwitchableMerchant(merchants, '999')).toBe(false);
    expect(hasSwitchableMerchant(merchants, '230')).toBe(false);
    expect(hasSwitchableMerchant(undefined, '2')).toBe(false);
  });
});
