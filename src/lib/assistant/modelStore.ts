/**
 * Chargement et cache du « modèle » de l'assistant.
 *
 *  1. au démarrage : modèle en cache local (par établissement) s'il existe,
 *     sinon modèle embarqué (seed) — l'assistant répond tout de suite ;
 *  2. en arrière-plan : GET /assistant/model avec la version connue ; le
 *     serveur ne renvoie le modèle que s'il a changé (nouveaux synonymes
 *     appris ou validés) ;
 *  3. rafraîchi au plus toutes les 10 minutes.
 */
import { USE_MOCK_DATA } from '@/services/apiClient';
import { fetchModel } from './api';
import { buildSeedModel } from './defaultModel';
import type { AssistantModel, Surface } from './types';

const CACHE_PREFIX = 'wello.assistant.model.v1.';
const REFRESH_EVERY_MS = 10 * 60 * 1000;

type Listener = (model: AssistantModel) => void;

function readCache(key: string): AssistantModel | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const model = JSON.parse(raw) as AssistantModel;
    return model?.schema === 1 && Array.isArray(model.intents) && model.intents.length ? model : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, model: AssistantModel) {
  try {
    localStorage.setItem(key, JSON.stringify(model));
  } catch {
    // Quota plein ou stockage bloqué : le modèle reste en mémoire.
  }
}

export class ModelStore {
  private model: AssistantModel;
  private readonly listeners = new Set<Listener>();
  private lastFetch = 0;
  private inflight: Promise<void> | null = null;
  private readonly cacheKey: string;

  constructor(private readonly surface: Surface, scope: string) {
    this.cacheKey = `${CACHE_PREFIX}${surface}.${scope}`;
    this.model = readCache(this.cacheKey) ?? buildSeedModel(surface);
  }

  get current(): AssistantModel {
    return this.model;
  }

  /** Vrai tant que seul le modèle embarqué est disponible. */
  get isSeed(): boolean {
    return this.model.version.startsWith('seed-');
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  refresh(force = false): Promise<void> {
    if (USE_MOCK_DATA) return Promise.resolve();
    if (this.inflight) return this.inflight;
    if (!force && Date.now() - this.lastFetch < REFRESH_EVERY_MS) return Promise.resolve();
    this.lastFetch = Date.now();
    this.inflight = fetchModel(this.surface, this.isSeed ? undefined : this.model.version)
      .then((res) => {
        if (res.unchanged || !('model' in res)) return;
        const model = res.model;
        // Migration pas encore appliquée côté API : on garde le modèle embarqué.
        if (!model?.intents?.length) return;
        this.model = model;
        writeCache(this.cacheKey, model);
        this.listeners.forEach((fn) => fn(model));
      })
      .catch(() => {
        // Hors ligne ou API indisponible : on garde le modèle courant.
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }
}

const stores = new Map<string, ModelStore>();

export function getModelStore(surface: Surface, scope: string): ModelStore {
  const key = `${surface}.${scope}`;
  let store = stores.get(key);
  if (!store) stores.set(key, (store = new ModelStore(surface, scope)));
  return store;
}
