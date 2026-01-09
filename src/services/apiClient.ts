import { toast } from "@/hooks/use-toast";

// ============= Configuration =============
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK !== 'false'; // Defaults to true if not set
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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

// ============= API Logger =============
export const logAPI = (method: string, url: string, payload?: unknown) => {
  console.log(`[API] ${method} ${url}`);
  if (payload) {
    console.log("Payload:", payload);
  }
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
        description: "Vous n'avez pas les permissions nécessaires.",
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
      toast({
        title: "Erreur serveur",
        description: "Une erreur serveur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
      break;
    default:
      toast({
        title: "Erreur",
        description: message || "Une erreur est survenue.",
        variant: "destructive",
      });
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

  logAPI(method, endpoint, body);

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
      handleApiError(response.status, errorMessage);
      throw new Error(errorMessage || `HTTP error ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      handleNetworkError();
    }
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

export const withMock = async <T>(mockFn: () => T | Promise<T>, realFn: () => Promise<T>): Promise<T> => {
  incrementLoading();
  try {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return await mockFn();
    }
    return await realFn();
  } finally {
    decrementLoading();
  }
};
