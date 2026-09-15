/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK: string;
  readonly VITE_ENABLE_LOGS: string;
  readonly VITE_GOOGLE_PLACES_API_KEY: string;
  /** Same OAuth 2.0 client id as the API's GOOGLE_CLIENT_ID — see internal/config/google.go in ib-welloresto-api. */
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
