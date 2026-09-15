/**
 * Decodes (never verifies — that's the API's job, server-side) the payload
 * of a JWT, purely to prefill form fields from Google's id_token
 * (given_name/family_name/email) right after "Continuer avec Google", so
 * the visitor isn't asked to retype what Google already told us. Never used
 * for any authorization decision.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(jwt: string): T | null {
  try {
    const [, payload] = jwt.split('.');
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
