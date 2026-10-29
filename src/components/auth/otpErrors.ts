import { isApiHttpError } from '@/services/apiClient';

/**
 * Erreurs des codes de vérification (MFA, e-mail, téléphone) renvoyées par
 * l'API. Le texte de l'API est en anglais : on affiche le français, choisi
 * d'après le code (`status` du corps de l'erreur).
 *
 * - otp_mismatch : code faux, l'utilisateur peut réessayer.
 * - mfa_expired : code expiré, ou retiré après 5 essais faux — il faut en
 *   demander un nouveau.
 * - otp_wait_time : un code a été envoyé il y a moins de 60 s.
 */
export type OTPErrorCode = 'otp_mismatch' | 'mfa_expired' | 'otp_wait_time';

export const OTP_ERROR_MESSAGES: Record<OTPErrorCode, { title: string; description: string }> = {
  otp_mismatch: {
    title: 'Code incorrect',
    description: 'Le code saisi est incorrect. Vérifiez-le et réessayez.',
  },
  mfa_expired: {
    title: 'Nouveau code nécessaire',
    description: 'Ce code a expiré ou a reçu trop d’essais erronés. Demandez un nouveau code.',
  },
  otp_wait_time: {
    title: 'Code déjà envoyé',
    description: 'Un code vient d’être envoyé. Patientez avant d’en demander un nouveau.',
  },
};

export function otpErrorCode(err: unknown): OTPErrorCode | undefined {
  if (!isApiHttpError(err)) return undefined;
  const status = (err.responseBody as { status?: unknown } | undefined)?.status;
  return typeof status === 'string' && status in OTP_ERROR_MESSAGES ? (status as OTPErrorCode) : undefined;
}

/** Message à afficher pour une erreur, `fallback` si le code n'est pas connu. */
export function otpErrorMessage(err: unknown, fallback: { title: string; description: string }) {
  const code = otpErrorCode(err);
  return code ? OTP_ERROR_MESSAGES[code] : fallback;
}
