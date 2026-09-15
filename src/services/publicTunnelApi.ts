import { API_BASE_URL, type WelloApiResponse } from "./apiClient";

/**
 * Error thrown by publicTunnelApi on a non-2xx response. `code` is the
 * backend's stable `status` string (e.g. "email_already_used",
 * "invalid_siret_format", "invalid_input") from its `{id, data: {status,
 * message, error}}` envelope (see models.SendErrorJSON in ib-welloresto-api)
 * — the tunnel switches on `code`, never on `message` (a display string
 * that can change wording without notice).
 */
export type PublicApiError = Error & {
  status: number;
  code?: string;
  responseBody?: unknown;
};

export const isPublicApiError = (error: unknown): error is PublicApiError =>
  error instanceof Error && typeof (error as Partial<PublicApiError>).status === "number";

/**
 * Dedicated fetch wrapper for LOT A Semaine 3, Chantier 14's pre-account
 * signup tunnel (/creer-mon-compte) and its public API calls (POST
 * /v1/signup, POST /v1/auth/google, POST/GET /v1/public/signup-context,
 * POST /v1/public/companies/resolve).
 *
 * Deliberately NOT `apiClient.post`/`.get`: those unconditionally send
 * `X-App-Source: backoffice` on every request (`apiClient.ts`'s `request()`
 * and `requestWithCustomToken()`), which — per the brief's explicit
 * instruction — must never be sent before the account exists, since
 * authMiddleware reads that header to decide whether to force MFA
 * verification. None of this tunnel's calls carry a session token at all
 * (they're all public, unauthenticated routes), so that header would have
 * no legitimate purpose here anyway. `apiClient` also 401-redirects to
 * /login and fires a generic error toast on any non-2xx response — both
 * wrong for a multi-step form that wants to show its own inline field
 * errors instead.
 */

interface PublicApiOptions {
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
}

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

async function publicApiRequest<T>(endpoint: string, options: PublicApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const parsed = await parseBody(response);

  if (!response.ok) {
    // Envelope is {id, data: {status, message, error}} — see
    // models.SendErrorJSON in ib-welloresto-api. Some routes (e.g. this
    // repo's own SendJSON calls for a plain map) may instead put those
    // fields at the top level, so check both.
    const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
    const dataRecord =
      parsedRecord?.data && typeof parsedRecord.data === "object" ? (parsedRecord.data as Record<string, unknown>) : undefined;
    const code = (typeof dataRecord?.status === "string" && dataRecord.status) || (typeof parsedRecord?.status === "string" && parsedRecord.status) || undefined;
    const message =
      (typeof dataRecord?.message === "string" && dataRecord.message) ||
      (typeof parsedRecord?.message === "string" && parsedRecord.message) ||
      (typeof dataRecord?.error === "string" && dataRecord.error) ||
      (typeof parsedRecord?.error === "string" && parsedRecord.error) ||
      `HTTP error ${response.status}`;
    const error = new Error(message) as PublicApiError;
    error.name = "PublicApiError";
    error.status = response.status;
    error.code = code;
    error.responseBody = parsed;
    throw error;
  }

  // The backend envelope is { id, data }; every tunnel endpoint follows it.
  const envelope = parsed as WelloApiResponse<T>;
  return envelope?.data as T;
}

export const publicTunnelApi = {
  get: <T>(endpoint: string) => publicApiRequest<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    publicApiRequest<T>(endpoint, { method: "POST", body, headers }),
};
