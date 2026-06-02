import { apiClient, type WelloApiResponse } from "@/services/apiClient";
import { unwrap, type ApiEnvelopeData } from "@/services/apiUnwrap";
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
  list(): Promise<ShiftTemplate[]> {
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/planning/shift-templates")
      .then((resp) => unwrap(resp).shift_templates.sort((a, b) => a.sort_order - b.sort_order));
  },

  create(payload: ShiftTemplateCreateRequest): Promise<ShiftTemplate> {
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/planning/shift-templates", payload)
      .then((resp) => unwrap(resp).shift_template);
  },

  update(id: string, payload: ShiftTemplateUpdateRequest): Promise<ShiftTemplate> {
    const path = `/planning/shift-templates/${id}`;
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap(resp).shift_template);
  },

  remove(id: string): Promise<void> {
    return apiClient.delete<WelloApiResponse<ApiEnvelopeData>>(`/planning/shift-templates/${id}`).then(() => undefined);
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
