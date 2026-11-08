import { apiClient, isApiHttpError, logAPI, unwrapErrorData, withMock } from '@/services/apiClient';

/**
 * Connexion des plateformes de livraison depuis le back-office
 * (API : docs/marketplace-onboarding.md).
 *
 * - Uber Eats : redirection vers la page de connexion Uber, retour sur
 *   /integrations/uber-eats avec ?uber=select&session=… (choix des
 *   restaurants), ?uber=disconnected ou ?uber=error&reason=….
 * - Deliveroo : pas de redirection. Le restaurateur relie son site à Wello
 *   Resto dans le Partner Hub avec l'identifiant affiché ici, puis on vérifie
 *   la liaison.
 */

type Envelope<T> = { id: string; data: T };

/** Évite que le toast générique masque le message précis affiché par l'écran. */
const OWN_ERRORS = { suppressErrorToast: true } as const;

export type UberStoreStatus = 'available' | 'connected_here' | 'linked_elsewhere';

export interface UberStoreOption {
  store_id: string;
  name: string;
  address: string;
  status: UberStoreStatus;
  /** Uber indique qu'un autre logiciel gère déjà les commandes de ce restaurant. */
  other_software: boolean;
}

export interface UberConnectSession {
  stores: UberStoreOption[];
  expires_at: string;
}

export interface UberConnectResult {
  store_id: string;
  name: string;
  status: 'connected' | 'linked_elsewhere' | 'failed';
}

export interface DeliverooSite {
  location_id: string;
  enabled: boolean;
}

export interface DeliverooConnectInfo {
  /** Identifiant à saisir dans le Partner Hub ("" si plus aucun disponible). */
  location_id: string;
  sites: DeliverooSite[];
}

/** Code d'erreur métier renvoyé par l'API ('not_configured', 'session_expired', 'not_linked'…). */
export const onboardingErrorCode = (error: unknown): string | undefined => {
  if (!isApiHttpError(error)) return undefined;
  const body = unwrapErrorData(error.responseBody as Record<string, unknown> | undefined);
  return body && typeof body.error === 'string' ? body.error : undefined;
};

/** Motifs de retour d'Uber Eats (paramètre `reason` posé par l'API). */
export const UBER_RETURN_REASONS: Record<string, string> = {
  denied: "La connexion a été annulée sur la page Uber Eats.",
  invalid_state: 'La demande a expiré. Recommencez.',
  no_store: "Aucun restaurant n'est rattaché à ce compte Uber Eats. Connectez-vous avec le compte propriétaire ou gérant du restaurant.",
  store_not_in_account: "Ce compte Uber Eats ne donne pas accès à ce restaurant. Connectez-vous avec le compte qui l'a relié.",
  not_configured: "La connexion à Uber Eats n'est pas encore disponible. Contactez le support Wello Resto.",
  failed: 'La connexion à Uber Eats a échoué. Recommencez dans un instant.',
};

export const marketplaceOnboardingService = {
  /** Adresse de la page de connexion Uber Eats : le navigateur y est redirigé. */
  async getUberConnectUrl(): Promise<string> {
    const endpoint = '/integrations/uber-eats/connect';
    logAPI('GET', endpoint);
    return withMock<string>(
      () => '#',
      async () => (await apiClient.get<Envelope<{ url: string }>>(endpoint, OWN_ERRORS)).data.url
    );
  },

  /** Restaurants à choisir après le retour d'Uber Eats. */
  async getUberConnectSession(sessionId: string): Promise<UberConnectSession> {
    const endpoint = `/integrations/uber-eats/connect/sessions/${encodeURIComponent(sessionId)}`;
    logAPI('GET', endpoint);
    return withMock<UberConnectSession>(
      () => ({
        stores: [
          { store_id: 'demo-1', name: 'Mon restaurant', address: '1 rue de la Paix, 57000 Metz', status: 'available', other_software: false },
        ],
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }),
      async () => (await apiClient.get<Envelope<UberConnectSession>>(endpoint, OWN_ERRORS)).data
    );
  },

  /** Connecte les restaurants choisis. */
  async completeUberConnect(sessionId: string, storeIds: string[]): Promise<UberConnectResult[]> {
    const endpoint = `/integrations/uber-eats/connect/sessions/${encodeURIComponent(sessionId)}`;
    logAPI('POST', endpoint, { store_ids: storeIds });
    return withMock<UberConnectResult[]>(
      () => storeIds.map((id) => ({ store_id: id, name: 'Mon restaurant', status: 'connected' as const })),
      async () =>
        (await apiClient.post<Envelope<{ results: UberConnectResult[] }>>(endpoint, { store_ids: storeIds }, OWN_ERRORS)).data.results ?? []
    );
  },

  /** Adresse de la page Uber Eats qui confirme la déconnexion du restaurant. */
  async getUberDisconnectUrl(storeId?: string): Promise<string> {
    const endpoint = `/integrations/uber-eats/disconnect${storeId ? `?store_id=${encodeURIComponent(storeId)}` : ''}`;
    logAPI('POST', endpoint);
    return withMock<string>(
      () => '#',
      async () => (await apiClient.post<Envelope<{ url: string }>>(endpoint, {}, OWN_ERRORS)).data.url
    );
  },

  /** Identifiant à saisir dans le Partner Hub Deliveroo et sites déjà connus. */
  async getDeliverooConnectInfo(): Promise<DeliverooConnectInfo> {
    const endpoint = '/integrations/deliveroo/connect';
    logAPI('GET', endpoint);
    return withMock<DeliverooConnectInfo>(
      () => ({ location_id: '212', sites: [] }),
      async () => {
        const data = (await apiClient.get<Envelope<DeliverooConnectInfo>>(endpoint, OWN_ERRORS)).data;
        return { location_id: data.location_id ?? '', sites: data.sites ?? [] };
      }
    );
  },

  /** Vérifie chez Deliveroo que le site est relié à Wello Resto, puis l'active. */
  async connectDeliveroo(locationId: string): Promise<void> {
    const endpoint = '/integrations/deliveroo/connect';
    logAPI('POST', endpoint, { location_id: locationId });
    return withMock<void>(
      () => undefined,
      async () => {
        await apiClient.post(endpoint, { location_id: locationId }, OWN_ERRORS);
      }
    );
  },
};
