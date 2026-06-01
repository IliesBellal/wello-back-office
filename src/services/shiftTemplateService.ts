// MOCK — à remplacer par /planning/shift-templates.
// La forme JSON EST le contrat backend à reproduire (cf. src/types/shiftTemplate.ts).
//
// Aujourd'hui : stockage en mémoire pendant la session (perdu au reload).
// Demain : remplacer le corps de CHAQUE méthode par UN seul appel `apiClient.*`
// — la signature ne change pas, le composant appelant non plus.
//
// Stratégie de bascule (cf. TODO inline dans chaque méthode) :
//   list()   →  apiClient.get<{ shift_templates: ShiftTemplate[] }>("/planning/shift-templates")
//   create() →  apiClient.post<{ shift_template: ShiftTemplate }>("/planning/shift-templates", payload)
//   update() →  apiClient.patch<{ shift_template: ShiftTemplate }>(`/planning/shift-templates/${id}`, payload)
//   remove() →  apiClient.delete(`/planning/shift-templates/${id}`)

import type {
  ShiftTemplate,
  ShiftTemplateCreateRequest,
  ShiftTemplateUpdateRequest,
} from "@/types/shiftTemplate";

// ─── In-memory store (mock) ──────────────────────────────────────────────────
// On stocke uniquement les templates ACTIFS + INACTIFS (suppression logique).
// Pré-rempli avec quelques exemples typiques restauration.

const NOW = () => new Date().toISOString();

let _seq = 0;
function nextId(): string {
  _seq += 1;
  return `tmpl_${Date.now().toString(36)}_${_seq}`;
}

const _store: ShiftTemplate[] = [
  {
    id: "tmpl_seed_midi",
    label: "Service midi",
    start_time: "11:00",
    end_time: "15:00",
    break_minutes: 0,
    position_id: null,
    color: "#10b981",
    sort_order: 0,
    active: true,
    created_at: NOW(),
    updated_at: NOW(),
  },
  {
    id: "tmpl_seed_soir",
    label: "Service soir",
    start_time: "18:00",
    end_time: "23:30",
    break_minutes: 30,
    position_id: null,
    color: "#6366f1",
    sort_order: 1,
    active: true,
    created_at: NOW(),
    updated_at: NOW(),
  },
  {
    id: "tmpl_seed_coupure",
    label: "Coupure",
    start_time: "11:00",
    end_time: "23:00",
    break_minutes: 180,
    position_id: null,
    color: "#f59e0b",
    sort_order: 2,
    active: true,
    created_at: NOW(),
    updated_at: NOW(),
  },
];

// Simule la latence réseau et l'asynchronicité du futur fetch.
function delay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const ShiftTemplateService = {
  /**
   * GET /planning/shift-templates → data.shift_templates[]
   * Retourne TOUS les templates (actifs et inactifs) triés par `sort_order`.
   * Filtrer côté composant si besoin (`.filter(t => t.active)`).
   */
  list(): Promise<ShiftTemplate[]> {
    // TODO(backend): replace with
    //   apiClient.get<{ shift_templates: ShiftTemplate[] }>("/planning/shift-templates")
    //     .then(r => r.shift_templates);
    const sorted = [..._store].sort((a, b) => a.sort_order - b.sort_order);
    return delay(sorted);
  },

  /**
   * POST /planning/shift-templates → data.shift_template
   * `sort_order` par défaut = max(existing.sort_order) + 1.
   * `active` par défaut = true.
   */
  create(payload: ShiftTemplateCreateRequest): Promise<ShiftTemplate> {
    // TODO(backend): replace with
    //   apiClient.post<{ shift_template: ShiftTemplate }>("/planning/shift-templates", payload)
    //     .then(r => r.shift_template);
    const maxOrder = _store.reduce((m, t) => Math.max(m, t.sort_order), -1);
    const created: ShiftTemplate = {
      id: nextId(),
      label: payload.label,
      start_time: payload.start_time,
      end_time: payload.end_time,
      break_minutes: payload.break_minutes,
      position_id: payload.position_id,
      color: payload.color,
      sort_order: payload.sort_order ?? maxOrder + 1,
      active: payload.active ?? true,
      created_at: NOW(),
      updated_at: NOW(),
    };
    _store.push(created);
    return delay(created);
  },

  /**
   * PATCH /planning/shift-templates/{id} → data.shift_template
   * Patch partiel. Lève si l'id est inconnu.
   */
  update(id: string, payload: ShiftTemplateUpdateRequest): Promise<ShiftTemplate> {
    // TODO(backend): replace with
    //   apiClient.patch<{ shift_template: ShiftTemplate }>(`/planning/shift-templates/${id}`, payload)
    //     .then(r => r.shift_template);
    const idx = _store.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error(`Template introuvable : ${id}`));
    const next: ShiftTemplate = {
      ..._store[idx],
      ...payload,
      updated_at: NOW(),
    };
    _store[idx] = next;
    return delay(next);
  },

  /**
   * DELETE /planning/shift-templates/{id}
   * Suppression LOGIQUE : on bascule `active=false`. Le record reste consultable.
   */
  remove(id: string): Promise<void> {
    // TODO(backend): replace with
    //   apiClient.delete(`/planning/shift-templates/${id}`).then(() => undefined);
    const idx = _store.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error(`Template introuvable : ${id}`));
    _store[idx] = { ..._store[idx], active: false, updated_at: NOW() };
    return delay(undefined);
  },
};

// ─── Pure helper réutilisé par le sidesheet de shift ─────────────────────────

/**
 * Forme minimale du formulaire de shift que `applyTemplateToShiftForm` sait
 * pré-remplir. Le sidesheet réel a d'autres champs (employé, date, notes…)
 * qui ne sont **jamais** modifiés par un template.
 */
export interface ShiftFormPatchable {
  start_time: string;
  end_time: string;
  break_minutes: number;
  /** Le formulaire stocke désormais l'ID du poste (cf. `ShiftSheet`). */
  position_id: string;
  // …autres champs (employee_id, shift_date, notes…) — ignorés ici par design.
}

/**
 * Applique un template à un formulaire shift.
 *
 * Règles :
 * - Écrase systématiquement les champs portés par le template
 *   (`start_time`, `end_time`, `break_minutes`, `position_id`).
 * - **Ne touche pas** aux autres champs du formulaire (employee_id, shift_date,
 *   notes, title, location, status…) — c'est l'invariant central testé.
 * - `position_id` : si `template.position_id` est `null` → champ vidé
 *   ("toutes positions"). Sinon → l'id est recopié si connu dans `positions`,
 *   sinon le champ est vidé (fallback safe).
 *
 * NOTE : `template.color` n'est pas appliqué au shift (le modèle de shift n'a
 * pas de couleur ; c'est une métadonnée visuelle du template uniquement).
 */
export function applyTemplateToShiftForm<TForm extends ShiftFormPatchable>(
  form: TForm,
  template: Pick<ShiftTemplate, "start_time" | "end_time" | "break_minutes" | "position_id">,
  positions: ReadonlyArray<{ id: string; label: string }>,
): TForm {
  const positionId =
    template.position_id == null
      ? ""
      : (positions.find((p) => p.id === template.position_id)?.id ?? "");
  return {
    ...form,
    start_time: template.start_time,
    end_time: template.end_time,
    break_minutes: template.break_minutes,
    position_id: positionId,
  };
}
