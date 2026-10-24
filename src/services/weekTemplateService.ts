// Modèles de semaine du planning : appels à /planning/week-templates.
// La preview et l’instanciation sont calculées par l’API (previewWeekTemplateApi,
// instantiateWeekTemplateApi) ; la logique de classification de référence reste
// dans src/lib/weekTemplateProjection.ts.

import { apiClient, type WelloApiResponse } from "@/services/apiClient";
import { unwrap, unwrapList, type ApiEnvelopeData } from "@/services/apiUnwrap";
import type {
  ConflictMode,
  EmployeePosition,
  InstantiationConflict,
  InstantiationPerWeekResult,
  InstantiationPreview,
  InstantiationResult,
  PlanningShift,
  WeekTemplate,
  WeekTemplateCreateRequest,
  WeekTemplateFromWeekRequest,
  WeekTemplateShift,
  WeekTemplateShiftInput,
  WeekTemplateUpdateRequest,
} from "@/types/planning";

function normalizeTime(value: string): string {
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value;
}

function normalizeWeekTemplateShift(shift: WeekTemplateShift): WeekTemplateShift {
  return {
    ...shift,
    start_time: normalizeTime(shift.start_time),
    end_time: normalizeTime(shift.end_time),
  };
}

function normalizeWeekTemplate(weekTemplate: WeekTemplate): WeekTemplate {
  return { ...weekTemplate };
}

function normalizeWeekTemplateBundle(bundle: {
  week_template: WeekTemplate;
  week_template_shifts: WeekTemplateShift[];
}): {
  week_template: WeekTemplate;
  week_template_shifts: WeekTemplateShift[];
} {
  return {
    week_template: normalizeWeekTemplate(bundle.week_template),
    week_template_shifts: bundle.week_template_shifts.map(normalizeWeekTemplateShift),
  };
}

function normalizeInstantiationConflict(conflict: InstantiationConflict): InstantiationConflict {
  return {
    ...conflict,
    target_week_start: conflict.target_week_start.slice(0, 10),
    day: conflict.day.slice(0, 10),
    template_shift: {
      ...conflict.template_shift,
      start_time: normalizeTime(conflict.template_shift.start_time),
      end_time: normalizeTime(conflict.template_shift.end_time),
    },
  };
}

function normalizeInstantiationPreview(preview: InstantiationPreview): InstantiationPreview {
  return {
    ...preview,
    target_week_starts: preview.target_week_starts.map((value) => value.slice(0, 10)),
    conflicts: preview.conflicts.map(normalizeInstantiationConflict),
  };
}

function normalizeInstantiationPerWeekResult(result: InstantiationPerWeekResult): InstantiationPerWeekResult {
  return {
    ...result,
    target_week_start: result.target_week_start.slice(0, 10),
  };
}

function normalizeInstantiationResult(result: InstantiationResult): InstantiationResult {
  return {
    ...result,
    per_week: result.per_week.map(normalizeInstantiationPerWeekResult),
  };
}

function normalizeTemplateList(items: WeekTemplate[]): WeekTemplate[] {
  return items.map(normalizeWeekTemplate);
}

/**
 * Convertit une date ISO "YYYY-MM-DD" en `day_of_week` 0..6 (0 = dimanche).
 * Standard du module Planning — JavaScript `Date.getDay()` natif.
 */
export function dayOfWeekFromIsoDate(iso: string): number {
  const d = new Date(iso + "T00:00:00");
  return d.getDay();
}

/**
 * Mappe un `PlanningShift` (instance) en `WeekTemplateShiftInput` (gabarit).
 *
 * Règles clés (cf. contrat) :
 * - `shift_date` → `day_of_week` (0 = dimanche).
 * - `employee_id`   : **conservé tel quel** — l'assignation nominative est
 *   PRÉSERVÉE (c'est tout l'intérêt de `createFromWeek`).
 * - `position_id`   : résolu via `positions[]` par matching du label `shift.position`
 *   (`PlanningShift` n'expose pas `position_id` aujourd'hui — fallback case-insensitive).
 *   Si introuvable → `null`.
 *
 * @internal Exporté pour les tests uniquement.
 */
export function shiftToTemplateInput(
  shift: PlanningShift,
  positions: ReadonlyArray<Pick<EmployeePosition, "id" | "label">>,
): WeekTemplateShiftInput {
  let position_id: string | null = null;
  if (shift.position) {
    const target = shift.position.toLowerCase();
    const found = positions.find((p) => p.label.toLowerCase() === target);
    if (found) position_id = found.id;
  }
  return {
    day_of_week: dayOfWeekFromIsoDate(shift.shift_date),
    employee_id: shift.employee_id, // ⚠️ PRÉSERVÉ — pas de strip.
    position_id,
    // Le shift live n'a plus de titre/lieu propre (retirés — le poste sert
    // de libellé) ; le modèle garde ses champs `title`/`location` pour un
    // usage futur, mais rien ne peut plus les alimenter depuis une semaine réelle.
    title: null,
    start_time: shift.start_time,
    end_time: shift.end_time,
    break_minutes: shift.break_minutes,
    location: null,
    notes: shift.notes ?? null,
  };
}

export const WeekTemplateService = {
  list(): Promise<WeekTemplate[]> {
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/planning/week-templates")
      .then((resp) => normalizeTemplateList(unwrapList<WeekTemplate>(resp, "week_templates").items));
  },

  get(id: string): Promise<{ week_template: WeekTemplate; week_template_shifts: WeekTemplateShift[] }> {
    const path = `/planning/week-templates/${id}`;
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => normalizeWeekTemplateBundle(unwrap(resp)));
  },

  create(payload: WeekTemplateCreateRequest): Promise<{
    week_template: WeekTemplate;
    week_template_shifts: WeekTemplateShift[];
  }> {
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(
        "/planning/week-templates",
        payload,
      )
      .then((resp) => normalizeWeekTemplateBundle(unwrap(resp)));
  },

  update(
    id: string,
    payload: WeekTemplateUpdateRequest,
  ): Promise<{ week_template: WeekTemplate; week_template_shifts: WeekTemplateShift[] }> {
    const path = `/planning/week-templates/${id}`;
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => normalizeWeekTemplateBundle(unwrap(resp)));
  },

  remove(id: string): Promise<void> {
    return apiClient.delete<WelloApiResponse<ApiEnvelopeData>>(`/planning/week-templates/${id}`).then(() => undefined);
  },

  createFromWeek(
    payload: WeekTemplateFromWeekRequest,
    sourceShifts: PlanningShift[],
    positions: ReadonlyArray<Pick<EmployeePosition, "id" | "label">>,
  ): Promise<{ week_template: WeekTemplate; week_template_shifts: WeekTemplateShift[] }> {
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(
        "/planning/week-templates/from-week",
        payload,
      )
      .then((resp) => normalizeWeekTemplateBundle(unwrap(resp)));
  },

};

/**
 * POST /planning/week-templates/{id}/preview
 */
export function previewWeekTemplateApi(
  templateId: string,
  target_week_starts: string[],
): Promise<InstantiationPreview> {
  const path = `/planning/week-templates/${templateId}/preview`;
  return apiClient
    .post<WelloApiResponse<ApiEnvelopeData>>(path, { target_week_starts })
    .then((resp) => normalizeInstantiationPreview(unwrap(resp).preview));
}

/**
 * POST /planning/week-templates/{id}/instantiate
 */
export function instantiateWeekTemplateApi(
  templateId: string,
  target_week_starts: string[],
  conflict_mode: ConflictMode,
): Promise<InstantiationResult> {
  const path = `/planning/week-templates/${templateId}/instantiate`;
  return apiClient
    .post<WelloApiResponse<ApiEnvelopeData>>(path, { target_week_starts, conflict_mode })
    .then((resp) => normalizeInstantiationResult(unwrap(resp).result));
}
