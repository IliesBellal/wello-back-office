/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK: string;
  readonly VITE_ENABLE_LOGS: string;
  readonly VITE_GOOGLE_PLACES_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
