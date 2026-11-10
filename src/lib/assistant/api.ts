/**
 * Appels réseau de l'assistant.
 *
 * Volontairement hors d'apiClient : ces requêtes partent en tâche de fond et
 * ne doivent ni allumer l'indicateur de chargement global, ni afficher de
 * toast d'erreur. `keepalive` permet l'envoi pendant la fermeture de l'onglet
 * (sendBeacon ne sait pas porter l'en-tête Authorization).
 */
import { API_BASE_URL } from '@/services/apiClient';
import { getStoredAuthToken } from '@/types/auth';
import type { AssistantModel, Surface } from './types';
import type { EventBatch } from './tracking';

function headers(): Record<string, string> {
  const token = getStoredAuthToken();
  return {
    'Content-Type': 'application/json',
    'X-App-Source': 'backoffice',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type ModelResponse = { unchanged: true; version: string } | { unchanged?: false; model: AssistantModel };

/** GET /assistant/model — `version` connu : réponse courte si rien n'a changé. */
export async function fetchModel(surface: Surface, version?: string, signal?: AbortSignal): Promise<ModelResponse> {
  const params = new URLSearchParams({ surface });
  if (version) params.set('version', version);
  const res = await fetch(`${API_BASE_URL}/assistant/model?${params}`, { headers: headers(), signal });
  if (!res.ok) throw new Error(`assistant_model_${res.status}`);
  const body = (await res.json()) as { data: ModelResponse };
  return body.data;
}

/** POST /assistant/events — renvoie false si l'envoi doit être retenté. */
export async function postEvents(batch: EventBatch, keepalive = false): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/assistant/events`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(batch),
      keepalive,
    });
    // 4xx (hors 408/429) : lot invalide ou droits insuffisants, inutile de réessayer.
    if (res.ok) return true;
    return !(res.status >= 500 || res.status === 408 || res.status === 429);
  } catch {
    return false;
  }
}
