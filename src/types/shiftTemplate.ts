/**
 * Shift templates — réutilisables sur le Planning.
 *
 * ⚠️ Ces types sont la **source de vérité** du futur endpoint backend.
 *    Le service correspondant (`shiftTemplateService.ts`) est aujourd'hui
 *    un mock en mémoire, mais sa forme JSON reproduit fidèlement ce que
 *    l'API devra retourner. Toute évolution se fait ICI d'abord.
 *
 * Futurs endpoints (à implémenter côté backend) :
 *
 *   GET    /planning/shift-templates           → data.shift_templates: ShiftTemplate[]
 *   POST   /planning/shift-templates           → data.shift_template:  ShiftTemplate
 *   PATCH  /planning/shift-templates/{id}      → data.shift_template:  ShiftTemplate
 *   DELETE /planning/shift-templates/{id}      → 204 / { status: "success" }
 *
 * Enveloppe Wello habituelle : `{ id, data: { status: "success", ... } }`.
 *
 * Conventions :
 * - `start_time`, `end_time`   → "HH:MM" 24h, locale établissement (pas d'ISO/TZ).
 * - `break_minutes`            → entier (≥ 0).
 * - `position_id`              → id d'`EmployeePosition`, ou `null` = "toutes positions".
 * - `color`                    → hex (`"#RRGGBB"`) pour l'identification visuelle.
 * - `sort_order`               → entier croissant ; ordonne l'affichage et le menu de sélection.
 * - `active = false`           → suppression logique (le template n'apparaît plus dans le sélecteur,
 *                                mais reste consultable dans la modale de gestion).
 * - `created_at` / `updated_at`→ ISO-8601 UTC, renseignés par le backend.
 */

export interface ShiftTemplate {
  id: string;
  label: string;
  start_time: string;   // "HH:MM"
  end_time: string;     // "HH:MM"
  break_minutes: number;
  position_id: string | null;
  color: string;        // "#RRGGBB"
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** POST `/planning/shift-templates`. */
export interface ShiftTemplateCreateRequest {
  label: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  position_id: string | null;
  color: string;
  sort_order?: number;
  active?: boolean;
}

/** PATCH `/planning/shift-templates/{id}` — tous les champs sont optionnels. */
export interface ShiftTemplateUpdateRequest {
  label?: string;
  start_time?: string;
  end_time?: string;
  break_minutes?: number;
  position_id?: string | null;
  color?: string;
  sort_order?: number;
  active?: boolean;
}
