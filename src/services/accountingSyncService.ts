import { apiClient, isApiHttpError, logAPI, unwrapErrorData, withMock } from '@/services/apiClient';

/**
 * Synchronisation comptable (API : docs/accounting-sync.md) : l'établissement
 * relie UN logiciel de comptabilité (Pennylane pour l'instant) auquel Wello
 * Resto envoie, chaque jour, l'écriture de ventes de sa clôture fiscale.
 *
 * Les refus métier (jeton refusé, comptes introuvables, correspondance
 * incomplète) arrivent en 400 / 409 / 422 avec un code et un message en
 * français dans `data` : les appels qui peuvent en recevoir désactivent le
 * toast générique et affichent le message eux-mêmes (accountingErrorMessage).
 */

export const AUTH_API_TOKEN = 'api_token';
export const AUTH_OAUTH = 'oauth';

/** Correspondance de comptes : numéros du plan comptable, propres à l'établissement. */
export interface AccountingMapping {
  journal_code: string;
  /** Compte de produits par taux de TVA ("20", "10", "5.5"…) ; "default" obligatoire. */
  sales_accounts: Record<string, string>;
  /** Compte de TVA collectée par taux ; "default" obligatoire. */
  vat_accounts: Record<string, string>;
  /** Compte d'encaissement par moyen de paiement ("ES", "CB"…) ; "default" obligatoire. */
  payment_accounts: Record<string, string>;
  /** Absorbe l'écart entre ventes et encaissements du jour. */
  difference_account: string;
}

export interface AccountingProvider {
  key: string;
  name: string;
  description: string;
  /** Modes de connexion disponibles maintenant ('api_token', 'oauth'). */
  auth_methods: string[];
  /** Correspondance proposée par défaut (plan comptable général), à confirmer. */
  suggested_mapping: AccountingMapping;
}

/** setup : connecté, correspondance à valider · active : synchro en marche · error : identifiants refusés. */
export type AccountingConnectionStatus = 'setup' | 'active' | 'error';

export interface AccountingConnection {
  provider: string;
  provider_name: string;
  status: AccountingConnectionStatus;
  account_label?: string;
  mapping: AccountingMapping;
  /** Premier jour envoyé (AAAA-MM-JJ). */
  sync_from?: string;
  connected_at: string;
  last_sync_at?: string;
  last_error?: string;
}

export type AccountingItemStatus = 'sent' | 'failed' | 'uncertain' | 'skipped' | 'abandoned';

export interface AccountingSyncItem {
  /** AAAA-MM-JJ, jour local de l'établissement. */
  date: string;
  status: AccountingItemStatus;
  attempts: number;
  external_id?: string;
  /** Ventes − encaissements du jour, en centimes (porté par le compte d'écart). */
  difference: number;
  last_error?: string;
  sent_at?: string;
  /** L'écriture telle qu'envoyée. */
  entry?: { reference?: string; label?: string };
}

/** Résultat d'une synchronisation manuelle. */
export interface AccountingSyncNowResult {
  sent: number;
  failed: number;
  uncertain: number;
  /** Un autre envoi était déjà en cours : rien n'a été fait. */
  busy: boolean;
}

export interface AccountingOverview {
  providers: AccountingProvider[];
  connection: AccountingConnection | null;
}

const ENDPOINT = '/accounting-integrations';

type Envelope<T> = { id: string; data: { status: string } & T };

/** Évite que le toast générique masque le message précis renvoyé par l'API. */
const OWN_ERRORS = { suppressErrorToast: true } as const;

const emptyMapping = (): AccountingMapping => ({
  journal_code: 'VE',
  sales_accounts: { default: '707000' },
  vat_accounts: { default: '445710' },
  payment_accounts: { default: '580000', ES: '531000' },
  difference_account: '471000',
});

const DEMO_PROVIDER: AccountingProvider = {
  key: 'pennylane',
  name: 'Pennylane',
  description: "Envoie chaque jour l'écriture de ventes de la clôture dans le journal de ventes de Pennylane.",
  auth_methods: [AUTH_API_TOKEN],
  suggested_mapping: emptyMapping(),
};

export const accountingSyncService = {
  async get(): Promise<AccountingOverview> {
    logAPI('GET', ENDPOINT);
    return withMock<AccountingOverview>(
      () => ({ providers: [DEMO_PROVIDER], connection: null }),
      async () => {
        const response = await apiClient.get<Envelope<{ providers: AccountingProvider[]; connection: AccountingConnection | null }>>(`${ENDPOINT}/`);
        return { providers: response.data.providers ?? [], connection: response.data.connection ?? null };
      }
    );
  },

  /** Relie l'établissement à l'outil avec un jeton d'API ; le jeton n'est jamais renvoyé ensuite. */
  async connectWithToken(provider: string, token: string): Promise<AccountingConnection> {
    const endpoint = `${ENDPOINT}/${encodeURIComponent(provider)}/connect/token`;
    logAPI('POST', endpoint, { token });
    return withMock<AccountingConnection>(
      () => ({
        provider, provider_name: DEMO_PROVIDER.name, status: 'setup', account_label: 'Société démo',
        mapping: { journal_code: '', sales_accounts: {}, vat_accounts: {}, payment_accounts: {}, difference_account: '' },
        connected_at: new Date().toISOString(),
      }),
      async () => {
        const response = await apiClient.post<Envelope<{ connection: AccountingConnection }>>(endpoint, { token }, OWN_ERRORS);
        return response.data.connection;
      }
    );
  },

  /** Adresse d'autorisation chez l'outil : le navigateur y est redirigé. */
  async getOAuthUrl(provider: string): Promise<string> {
    const endpoint = `${ENDPOINT}/${encodeURIComponent(provider)}/connect/oauth`;
    logAPI('GET', endpoint);
    return withMock<string>(
      () => '#',
      async () => {
        const response = await apiClient.get<Envelope<{ url: string }>>(endpoint, OWN_ERRORS);
        return response.data.url;
      }
    );
  },

  /** Valide la correspondance chez l'outil et active la synchronisation. */
  async saveMapping(mapping: AccountingMapping): Promise<AccountingConnection> {
    const endpoint = `${ENDPOINT}/mapping`;
    logAPI('PUT', endpoint, mapping);
    return withMock<AccountingConnection>(
      () => ({
        provider: 'pennylane', provider_name: DEMO_PROVIDER.name, status: 'active', account_label: 'Société démo',
        mapping, sync_from: new Date().toISOString().slice(0, 10), connected_at: new Date().toISOString(),
      }),
      async () => {
        const response = await apiClient.put<Envelope<{ connection: AccountingConnection }>>(endpoint, mapping, OWN_ERRORS);
        return response.data.connection;
      }
    );
  },

  /** Supprime la connexion ; le journal des jours déjà envoyés est conservé. */
  async disconnect(): Promise<void> {
    logAPI('DELETE', `${ENDPOINT}/`);
    return withMock<void>(
      () => undefined,
      async () => {
        await apiClient.delete(`${ENDPOINT}/`);
      }
    );
  },

  async listItems(): Promise<AccountingSyncItem[]> {
    const endpoint = `${ENDPOINT}/items`;
    logAPI('GET', endpoint);
    return withMock<AccountingSyncItem[]>(
      () => [],
      async () => {
        const response = await apiClient.get<Envelope<{ items: AccountingSyncItem[] }>>(endpoint);
        return response.data.items ?? [];
      }
    );
  },

  /** Envoie tout de suite les journées clôturées en attente (sans attendre l'heure pleine). */
  async syncNow(): Promise<AccountingSyncNowResult> {
    const endpoint = `${ENDPOINT}/sync`;
    logAPI('POST', endpoint);
    return withMock<AccountingSyncNowResult>(
      () => ({ sent: 0, failed: 0, uncertain: 0, busy: false }),
      async () => {
        const response = await apiClient.post<Envelope<AccountingSyncNowResult>>(endpoint, {}, OWN_ERRORS);
        return {
          sent: response.data.sent ?? 0,
          failed: response.data.failed ?? 0,
          uncertain: response.data.uncertain ?? 0,
          busy: !!response.data.busy,
        };
      }
    );
  },

  /** Relance un jour en échec, à vérifier ou abandonné. */
  async retryItem(date: string): Promise<void> {
    const endpoint = `${ENDPOINT}/items/${encodeURIComponent(date)}/retry`;
    logAPI('POST', endpoint);
    return withMock<void>(
      () => undefined,
      async () => {
        await apiClient.post(endpoint, {}, OWN_ERRORS);
      }
    );
  },
};

// ---- Aides pures (testables) -------------------------------------------------

/** Taux de TVA proposés en saisie précise (un compte différent par taux, facultatif). */
export const VAT_RATE_KEYS = ['5.5', '10', '20'] as const;

/** Moyens de paiement proposés en saisie précise (payments.mop), avec leur libellé. */
export const PAYMENT_MOP_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'ES', label: 'Espèces' },
  { key: 'CB', label: 'Carte bancaire' },
  { key: 'TR', label: 'Titres-restaurant' },
  { key: 'STRIPE', label: 'Paiement en ligne' },
  { key: 'KIOSK', label: 'Borne de commande' },
  { key: 'UBER_EATS', label: 'Uber Eats' },
  { key: 'DELIVEROO', label: 'Deliveroo' },
];

const ACCOUNT_NUMBER = /^[0-9]{1,20}$/;

export const isValidAccountNumber = (value: string): boolean => ACCOUNT_NUMBER.test(value.trim());

const cleanTable = (table: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(table ?? {})) {
    const v = (value ?? '').trim();
    if (v) out[key.trim()] = v;
  }
  return out;
};

/** Retire les espaces et les lignes vides avant l'envoi (une ligne vide = « comme le compte par défaut »). */
export const cleanMapping = (mapping: AccountingMapping): AccountingMapping => ({
  journal_code: (mapping.journal_code ?? '').trim(),
  sales_accounts: cleanTable(mapping.sales_accounts),
  vat_accounts: cleanTable(mapping.vat_accounts),
  payment_accounts: cleanTable(mapping.payment_accounts),
  difference_account: (mapping.difference_account ?? '').trim(),
});

/**
 * Premier problème de saisie de la correspondance, en français ; null si elle
 * peut être envoyée. L'API refait ces contrôles et vérifie en plus que les
 * comptes existent chez l'outil.
 */
export const validateMapping = (mapping: AccountingMapping): string | null => {
  const m = cleanMapping(mapping);
  if (!m.journal_code) return 'Indiquez le code du journal de ventes (par exemple VE).';
  if (!m.sales_accounts.default) return 'Indiquez le compte de ventes par défaut.';
  if (!m.vat_accounts.default) return 'Indiquez le compte de TVA collectée par défaut.';
  if (!m.payment_accounts.default) return "Indiquez le compte d'encaissement par défaut.";
  if (!m.difference_account) return "Indiquez le compte d'écart.";
  const numbers = [
    ...Object.values(m.sales_accounts),
    ...Object.values(m.vat_accounts),
    ...Object.values(m.payment_accounts),
    m.difference_account,
  ];
  const bad = numbers.find((n) => !isValidAccountNumber(n));
  if (bad) return `Numéro de compte invalide : « ${bad} » (chiffres uniquement).`;
  return null;
};

/** Fusionne une correspondance partielle (connexion à peine créée) avec la proposition de l'outil. */
export const mappingOrSuggestion = (current: AccountingMapping | undefined, suggested: AccountingMapping | undefined): AccountingMapping => {
  const hasContent = !!current && (current.journal_code || Object.keys(current.sales_accounts ?? {}).length > 0);
  if (hasContent) {
    return {
      journal_code: current.journal_code ?? '',
      sales_accounts: { ...(current.sales_accounts ?? {}) },
      vat_accounts: { ...(current.vat_accounts ?? {}) },
      payment_accounts: { ...(current.payment_accounts ?? {}) },
      difference_account: current.difference_account ?? '',
    };
  }
  const base = suggested ?? emptyMapping();
  return {
    journal_code: base.journal_code,
    sales_accounts: { ...base.sales_accounts },
    vat_accounts: { ...base.vat_accounts },
    payment_accounts: { ...base.payment_accounts },
    difference_account: base.difference_account,
  };
};

/** Message à afficher pour une erreur de l'API (corps `data.message` en français), sinon `fallback`. */
export const accountingErrorMessage = (error: unknown, fallback = "Une erreur est survenue. Réessayez dans un instant."): string => {
  if (isApiHttpError(error)) {
    const body = unwrapErrorData(error.responseBody as Record<string, unknown> | undefined);
    if (body && typeof body.message === 'string' && body.message) return body.message;
  }
  return fallback;
};

/** Code métier de l'erreur ('unknown_accounts', 'credentials_rejected', 'already_connected'…), s'il y en a un. */
export const accountingErrorCode = (error: unknown): string | undefined => {
  if (!isApiHttpError(error)) return undefined;
  const body = unwrapErrorData(error.responseBody as Record<string, unknown> | undefined);
  return body && typeof body.error === 'string' ? body.error : undefined;
};

/** Écart ventes − encaissements (centimes) en euros, avec signe. */
export const formatDifference = (cents: number): string => {
  if (!cents) return '—';
  const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Math.abs(cents) / 100);
  return `${cents > 0 ? '+' : '−'}${euros}`;
};

/** Phrase de bilan d'une synchronisation manuelle. */
export const describeSyncNow = (r: AccountingSyncNowResult): string => {
  if (r.busy) return 'Une synchronisation est déjà en cours. Réessayez dans un instant.';
  const parts: string[] = [];
  if (r.sent > 0) parts.push(`${r.sent} journée${r.sent > 1 ? 's' : ''} envoyée${r.sent > 1 ? 's' : ''}`);
  if (r.failed > 0) parts.push(`${r.failed} en échec`);
  if (r.uncertain > 0) parts.push(`${r.uncertain} à vérifier`);
  return parts.length > 0 ? `${parts.join(', ')}.` : 'Rien à envoyer : aucune journée clôturée en attente.';
};
