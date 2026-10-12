/**
 * Tests unitaires des aides pures de `accountingSyncService` (validation et
 * nettoyage de la correspondance de comptes, lecture des erreurs de l'API).
 *
 * Exécution : aucun lanceur de tests n'est configuré dans ce dépôt (voir
 * performanceService.test.ts). API Vitest standard :
 *
 *     npm i -D vitest
 *     npx vitest run src/services/__tests__/accountingSyncService.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  accountingErrorCode,
  accountingErrorMessage,
  cleanMapping,
  formatDifference,
  isValidAccountNumber,
  mappingOrSuggestion,
  validateMapping,
  type AccountingMapping,
} from '../accountingSyncService';

const valid = (): AccountingMapping => ({
  journal_code: 'VE',
  sales_accounts: { default: '707000' },
  vat_accounts: { default: '445710' },
  payment_accounts: { default: '580000', ES: '531000' },
  difference_account: '471000',
});

const apiError = (status: number, data: Record<string, unknown>) =>
  Object.assign(new Error('HTTP error'), { name: 'ApiHttpError', status, responseBody: data });

describe('validateMapping', () => {
  it('accepte une correspondance complète', () => {
    expect(validateMapping(valid())).toBeNull();
  });

  it('refuse chaque compte par défaut manquant', () => {
    expect(validateMapping({ ...valid(), journal_code: ' ' })).toMatch(/journal/i);
    expect(validateMapping({ ...valid(), sales_accounts: {} })).toMatch(/ventes/i);
    expect(validateMapping({ ...valid(), vat_accounts: { '10': '445712' } })).toMatch(/TVA/);
    expect(validateMapping({ ...valid(), payment_accounts: { ES: '531000' } })).toMatch(/encaissement/i);
    expect(validateMapping({ ...valid(), difference_account: '' })).toMatch(/écart/i);
  });

  it('refuse un numéro de compte non numérique, y compris dans un détail par taux', () => {
    expect(validateMapping({ ...valid(), difference_account: '47A000' })).toMatch(/47A000/);
    expect(validateMapping({ ...valid(), sales_accounts: { default: '707000', '10': '706 000x' } })).toMatch(/invalide/);
  });

  it('ignore les lignes vides du détail', () => {
    expect(validateMapping({ ...valid(), sales_accounts: { default: '707000', '10': '  ' } })).toBeNull();
  });
});

describe('cleanMapping', () => {
  it('retire les espaces et les lignes vides', () => {
    const cleaned = cleanMapping({
      journal_code: ' VE ',
      sales_accounts: { default: ' 707000 ', '10': '' },
      vat_accounts: { default: '445710' },
      payment_accounts: { default: '580000', ES: '  ', CB: '511200' },
      difference_account: ' 471000',
    });
    expect(cleaned).toEqual({
      journal_code: 'VE',
      sales_accounts: { default: '707000' },
      vat_accounts: { default: '445710' },
      payment_accounts: { default: '580000', CB: '511200' },
      difference_account: '471000',
    });
  });

  it('supporte les tables nulles renvoyées par l\'API pour une connexion neuve', () => {
    const fromApi = { journal_code: '', sales_accounts: null, vat_accounts: null, payment_accounts: null, difference_account: '' };
    expect(() => cleanMapping(fromApi as unknown as AccountingMapping)).not.toThrow();
  });
});

describe('mappingOrSuggestion', () => {
  it('propose la correspondance de l\'outil pour une connexion neuve (tables nulles)', () => {
    const empty = { journal_code: '', sales_accounts: null, vat_accounts: null, payment_accounts: null, difference_account: '' };
    const result = mappingOrSuggestion(empty as unknown as AccountingMapping, valid());
    expect(result).toEqual(valid());
    expect(result.sales_accounts).not.toBe(valid().sales_accounts);
  });

  it('conserve la correspondance déjà enregistrée', () => {
    const current = { ...valid(), journal_code: 'VT' };
    expect(mappingOrSuggestion(current, valid()).journal_code).toBe('VT');
  });
});

describe('isValidAccountNumber', () => {
  it('n\'accepte que des chiffres', () => {
    expect(isValidAccountNumber('707000')).toBe(true);
    expect(isValidAccountNumber(' 531000 ')).toBe(true); // espaces en bordure retirés, comme côté API
    expect(isValidAccountNumber('53 1000')).toBe(false);
    expect(isValidAccountNumber('')).toBe(false);
    expect(isValidAccountNumber('7070-00')).toBe(false);
  });
});

describe('lecture des erreurs de l\'API', () => {
  it('extrait le message et le code du corps data', () => {
    const e = apiError(422, { status: '0', error: 'unknown_accounts', message: 'introuvable chez l\'outil : comptes 707000' });
    expect(accountingErrorMessage(e)).toContain('707000');
    expect(accountingErrorCode(e)).toBe('unknown_accounts');
  });

  it('lit aussi le corps enveloppé { id, data }', () => {
    const e = apiError(409, { id: 'accounting_sync.connect_token', data: { error: 'already_connected', message: 'déjà connecté' } });
    expect(accountingErrorMessage(e)).toBe('déjà connecté');
    expect(accountingErrorCode(e)).toBe('already_connected');
  });

  it('retombe sur le message par défaut pour une erreur inconnue', () => {
    expect(accountingErrorMessage(new Error('boom'), 'défaut')).toBe('défaut');
    expect(accountingErrorCode(new Error('boom'))).toBeUndefined();
  });
});

describe('formatDifference', () => {
  it('affiche le signe et le montant en euros', () => {
    expect(formatDifference(0)).toBe('—');
    expect(formatDifference(3000)).toMatch(/^\+30,00\s€$/);
    expect(formatDifference(-1050)).toMatch(/^−10,50\s€$/);
  });
});
