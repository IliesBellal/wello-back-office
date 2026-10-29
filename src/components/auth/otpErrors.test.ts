/**
 * Tests des messages d'erreur des codes de vérification (otpErrors.ts).
 */

import { describe, expect, it } from 'vitest';

import { OTP_ERROR_MESSAGES, otpErrorCode, otpErrorMessage } from './otpErrors';

const apiError = (status: number, body: unknown) =>
  Object.assign(new Error('HTTP error'), { name: 'ApiHttpError', status, responseBody: body });

const fallback = { title: 'Erreur', description: 'Erreur générique.' };

describe('otpErrorCode', () => {
  it('lit le code renvoyé par l’API', () => {
    expect(otpErrorCode(apiError(401, { status: 'otp_mismatch' }))).toBe('otp_mismatch');
    expect(otpErrorCode(apiError(401, { status: 'mfa_expired' }))).toBe('mfa_expired');
    expect(otpErrorCode(apiError(403, { status: 'otp_wait_time' }))).toBe('otp_wait_time');
  });

  it('ignore les codes inconnus et les erreurs hors API', () => {
    expect(otpErrorCode(apiError(500, { status: 'internal_server_error' }))).toBeUndefined();
    expect(otpErrorCode(apiError(500, undefined))).toBeUndefined();
    expect(otpErrorCode(new Error('réseau'))).toBeUndefined();
    expect(otpErrorCode('texte')).toBeUndefined();
  });
});

describe('otpErrorMessage', () => {
  it('affiche le français du code, jamais le texte anglais de l’API', () => {
    const err = apiError(401, { status: 'mfa_expired', message: 'The code has expired' });
    expect(otpErrorMessage(err, fallback)).toEqual(OTP_ERROR_MESSAGES.mfa_expired);
  });

  it('retombe sur le message fourni pour une erreur inconnue', () => {
    expect(otpErrorMessage(new Error('x'), fallback)).toEqual(fallback);
  });
});
