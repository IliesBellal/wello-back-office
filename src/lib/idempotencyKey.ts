/**
 * LOT A Semaine 3, Chantier 14 — POST /v1/signup requires an `Idempotency-Key`
 * header (24h replay window server-side, see ib-welloresto-api's
 * signup/handler.go). The tunnel generates one key when the visitor starts
 * (or resumes) the flow and reuses it for every submit attempt of that same
 * session, so a retry after a dropped connection replays the cached result
 * instead of risking a duplicate signup.
 *
 * sessionStorage, not localStorage: scoped to this tab/session on purpose —
 * a genuinely new attempt (new tab, browser restart) should get a fresh key,
 * not silently replay a stale one.
 */
const STORAGE_KEY = 'signup-tunnel:idempotency-key';

export function getOrCreateIdempotencyKey(): string {
  const existing = sessionStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const key = crypto.randomUUID();
  sessionStorage.setItem(STORAGE_KEY, key);
  return key;
}

/** Called once the tunnel completes (success or an abandoned restart). */
export function clearIdempotencyKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
