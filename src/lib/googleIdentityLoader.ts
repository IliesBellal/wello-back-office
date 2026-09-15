/**
 * Google Identity Services (GSI) loader — LOT A Semaine 3, Chantier 14's
 * "Continuer avec Google" button on /creer-mon-compte. Distinct from
 * googlePlacesLoader.ts (a different Google script, `accounts.google.com/gsi`
 * rather than `maps.googleapis.com`, and a different key: VITE_GOOGLE_CLIENT_ID,
 * an OAuth client id — not the Places API key).
 */

interface GoogleCredentialResponse {
  credential: string; // the id_token JWT
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { type?: string; theme?: string; size?: string; width?: number; text?: string; shape?: string },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let gsiScriptPromise: Promise<void> | null = null;

const injectGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('#google-identity-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
};

export const loadGoogleIdentityServices = async (): Promise<GoogleIdentityServices> => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID for Google Sign-In.');
  }

  if (!gsiScriptPromise) {
    gsiScriptPromise = injectGsiScript();
  }
  await gsiScriptPromise;

  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services failed to initialize.');
  }
  return window.google;
};

export const getGoogleClientId = (): string => import.meta.env.VITE_GOOGLE_CLIENT_ID;
