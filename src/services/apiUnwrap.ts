import type { WelloApiResponse } from "@/services/apiClient";

// ============= Types =============

/**
 * Pagination block returned on paginated list responses.
 * Matches the backend shape documented in PLANNING_AND_USERS_INTEGRATION_GUIDE.md.
 */
export interface ApiPagination {
  total_items: number;
  total_pages: number;
  current_page: number;
  limit: number;
}

/**
 * Inner `data` payload shared by all wrapped responses.
 * `status` is "success" on the standard handlers; error handlers send a
 * business message alongside a non-success status.
 */
export interface ApiEnvelopeData {
  status?: string;
  message?: string;
  error?: string;
  pagination?: ApiPagination;
  [key: string]: unknown;
}

/** Result returned by {@link unwrapList}. */
export interface UnwrappedList<T> {
  items: T[];
  pagination?: ApiPagination;
}

// ============= Helpers =============

/**
 * Error thrown when a wrapped response carries a business failure.
 * Keeps the original envelope id and inner data for debugging.
 */
export class ApiBusinessError extends Error {
  readonly id?: string;
  readonly status?: string;
  readonly data: ApiEnvelopeData;

  constructor(message: string, data: ApiEnvelopeData, id?: string) {
    super(message);
    this.name = "ApiBusinessError";
    this.id = id;
    this.status = data.status;
    this.data = data;
  }
}

/** A status value is considered a failure when it is set and not "success". */
const isFailureStatus = (status: unknown): boolean =>
  typeof status === "string" && status.length > 0 && status.toLowerCase() !== "success";

/** Extract a human-readable business message from a wrapped error payload. */
const extractBusinessMessage = (data: ApiEnvelopeData): string => {
  if (typeof data.message === "string" && data.message.length > 0) return data.message;
  if (typeof data.error === "string" && data.error.length > 0) return data.error;
  if (typeof data.status === "string" && data.status.length > 0) return data.status;
  return "Une erreur est survenue.";
};

/**
 * Unwraps the top-level `{ id, data }` envelope.
 *
 * - Throws an {@link ApiBusinessError} with a readable message when `data.status`
 *   indicates a failure (i.e. set and not "success"), or when the payload looks
 *   like a wrapped error (carries a `message`/`error` field without success).
 * - Otherwise returns the inner `data`.
 */
export function unwrap<T extends ApiEnvelopeData = ApiEnvelopeData>(
  resp: WelloApiResponse<ApiEnvelopeData>
): T {
  const data = (resp?.data ?? {}) as T;

  const looksLikeError =
    isFailureStatus(data.status) ||
    ((typeof data.message === "string" || typeof data.error === "string") &&
      data.status !== "success");

  if (looksLikeError) {
    throw new ApiBusinessError(extractBusinessMessage(data), data, resp?.id);
  }

  return data;
}

/**
 * Unwraps a paginated/collection response, returning the collection found at
 * `key` together with the optional `pagination` block.
 *
 * @example
 * const { items, pagination } = unwrapList<MerchantUserListItem>(resp, "users");
 */
export function unwrapList<T>(
  resp: WelloApiResponse<ApiEnvelopeData>,
  key: string
): UnwrappedList<T> {
  const data = unwrap(resp);
  const collection = data[key];
  const items = Array.isArray(collection) ? (collection as T[]) : [];

  return { items, pagination: data.pagination };
}
