/**
 * Disponibilité d'une intention pour l'utilisateur et l'établissement :
 * droit détenu ET module souscrit (capabilities.modules). Utilisée par le moteur
 * (compréhension) et par le panneau (actions rapides, exemples, « que sais-tu
 * faire ») : une fonction hors abonnement n'est jamais proposée.
 */
import type { ModelIntent } from './types';

/**
 * Module requis par intention quand le modèle servi ne le précise pas (modèle
 * serveur plus ancien que le seed). Les noms suivent capabilities.modules.
 */
const FALLBACK_MODULES: Record<string, string> = {
  'info.staff_on_shift': 'planning',
  'info.bookings': 'bookings',
};

export interface AvailabilityContext {
  /** Clés de permission détenues ; `'*'` = tout (administrateur). */
  permissions: Set<string> | '*';
  /** Modules souscrits ; absent = pas de filtrage. */
  modules?: Set<string>;
}

export function isIntentAvailable(
  intent: Pick<ModelIntent, 'key' | 'permission' | 'module'>,
  ctx: AvailabilityContext,
): boolean {
  if (intent.permission && ctx.permissions !== '*' && !ctx.permissions.has(intent.permission)) return false;
  const module = intent.module ?? FALLBACK_MODULES[intent.key];
  if (module && ctx.modules && !ctx.modules.has(module)) return false;
  return true;
}
