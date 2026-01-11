import { toast } from "@/hooks/use-toast";

// ============= Configuration =============
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
export const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true';


// ============= Types =============
export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

// ============= Loading State Management =============
type LoadingSubscriber = (isLoading: boolean) => void;
const loadingSubscribers: Set<LoadingSubscriber> = new Set();
let activeRequests = 0;

export const subscribeToLoading = (callback: LoadingSubscriber): (() => void) => {
  loadingSubscribers.add(callback);
  return () => loadingSubscribers.delete(callback);
};

const notifyLoadingState = (isLoading: boolean) => {
  loadingSubscribers.forEach((callback) => callback(isLoading));
};

const incrementLoading = () => {
  activeRequests++;
  if (activeRequests === 1) {
    notifyLoadingState(true);
  }
};

const decrementLoading = () => {
  activeRequests--;
  if (activeRequests === 0) {
    notifyLoadingState(false);
  }
};

// ============= Logging Utilities =============
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'];

const maskSensitiveData = (data: unknown): unknown => {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      masked[key] = '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
};

interface LogContext {
  method: string;
  endpoint: string;
  url: string;
  startTime: number;
}

const startRequestLog = (method: string, endpoint: string, url: string, payload?: unknown): LogContext => {
  const context: LogContext = { method, endpoint, url, startTime: performance.now() };
  
  if (ENABLE_LOGS) {
    console.groupCollapsed(`%c🌐 API Request: [${method}] ${endpoint}`, 'color: #3b82f6; font-weight: bold;');
    console.log('%cURL:', 'color: #6b7280;', url);
    if (payload) {
      console.log('%cPayload:', 'color: #6b7280;', maskSensitiveData(payload));
    }
  }
  
  return context;
};

const endRequestLog = (context: LogContext, status: number, data?: unknown, isError = false) => {
  if (!ENABLE_LOGS) return;
  
  const duration = (performance.now() - context.startTime).toFixed(2);
  
  if (isError) {
    console.log('%cStatus:', 'color: #ef4444;', `${status} ERROR`);
  } else {
    console.log('%cStatus:', 'color: #22c55e;', `${status} OK`);
  }
  console.log('%cDuration:', 'color: #6b7280;', `${duration}ms`);
  
  if (data !== undefined) {
    console.log('%cResponse:', 'color: #6b7280;', data);
  }
  
  console.groupEnd();
};

const endRequestLogWithError = (context: LogContext, error: unknown) => {
  if (!ENABLE_LOGS) return;
  
  const duration = (performance.now() - context.startTime).toFixed(2);
  
  console.log('%cError:', 'color: #ef4444;', error);
  console.log('%cDuration:', 'color: #6b7280;', `${duration}ms`);
  console.groupEnd();
};

// ============= Auth Helpers =============
const getAuthToken = (): string | null => {
  const authData = localStorage.getItem("authData");
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      return parsed.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

const clearAuthAndRedirect = () => {
  localStorage.removeItem("authData");
  window.location.href = "/login";
};

// ============= Error Handlers =============
const handleApiError = (status: number, message?: string) => {
  switch (status) {
    case 400:
      toast({
        title: "Données incorrectes",
        description: message || "Veuillez vérifier les informations saisies.",
        variant: "destructive",
      });
      break;
    case 401:
      toast({
        title: "Session expirée",
        description: "Veuillez vous reconnecter.",
        variant: "destructive",
      });
      clearAuthAndRedirect();
      break;
    case 403:
      toast({
        title: "Accès refusé",
        description: message || "Vous n'avez pas les permissions nécessaires.",
        variant: "destructive",
      });
      break;
    case 404:
      toast({
        title: "Ressource introuvable",
        description: message || "La ressource demandée n'existe pas.",
        variant: "destructive",
      });
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      toast({
        title: `Erreur serveur (${status})`,
        description: "Une erreur serveur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
      break;
    default:
      if (status >= 400) {
        toast({
          title: "Erreur",
          description: message || "Une erreur est survenue.",
          variant: "destructive",
        });
      }
  }
};

const handleNetworkError = () => {
  toast({
    title: "Erreur de connexion",
    description: "Vérifiez votre connexion internet.",
    variant: "destructive",
  });
};

// ============= Main API Client =============
async function request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, skipAuth = false } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const logContext = startRequestLog(method, endpoint, url, body);

  incrementLoading();

  try {
    const authToken = getAuthToken();
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (!skipAuth && authToken) {
      requestHeaders["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage: string | undefined;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error;
      } catch {
        // Response is not JSON
      }
      endRequestLog(logContext, response.status, errorMessage, true);
      handleApiError(response.status, errorMessage);
      throw new Error(errorMessage || `HTTP error ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    const data = text ? JSON.parse(text) as T : {} as T;
    
    endRequestLog(logContext, response.status, data);
    if (ENABLE_LOGS) console.log(`📥 [API RESPONSE] ${method} ${endpoint}`, data);
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      endRequestLogWithError(logContext, "Network Error: Failed to fetch");
      handleNetworkError();
    } else if (!(error instanceof Error && error.message.startsWith("HTTP error"))) {
      endRequestLogWithError(logContext, error);
    }
    if (ENABLE_LOGS) console.error(`❌ [API ERROR] ${method} ${endpoint}`, error);
    throw error;
  } finally {
    decrementLoading();
  }
}

export const apiClient = {
  request,
  
  get<T>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
    return request<T>(endpoint, { ...options, method: "POST", body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  put<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PUT", body });
  },

  delete<T>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

// ============= Mock Helper =============
export const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const withMock = async <T>(
  mockFn: () => T | Promise<T>, 
  realFn: () => Promise<T>,
  logInfo?: { method: string; endpoint: string; payload?: unknown }
): Promise<T> => {
  const url = logInfo ? `${API_BASE_URL}${logInfo.endpoint}` : '';
  const logContext = logInfo ? startRequestLog(logInfo.method, logInfo.endpoint, url, logInfo.payload) : null;
  
  incrementLoading();
  const startTime = performance.now();
  
  try {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const result = await mockFn();
      if (logContext) {
        endRequestLog(logContext, 200, result);
      }
      return result;
    }
    return await realFn();
  } catch (error) {
    if (logContext) {
      endRequestLogWithError(logContext, error);
    }
    throw error;
  } finally {
    decrementLoading();
  }
};

// ============= Legacy Logging (for backward compatibility) =============
export const logAPI = (method: string, endpoint: string, payload?: unknown) => {
  if (ENABLE_LOGS) {
    console.log(`%c[API] ${method} ${endpoint}`, 'color: #6b7280;', payload ? maskSensitiveData(payload) : '');
  }
};
