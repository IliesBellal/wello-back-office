// MOCK — à remplacer par /planning/week-templates.
// La forme JSON EST le contrat backend à reproduire (cf. src/types/planning.ts §"Week templates").
//
// Aujourd'hui : stockage en mémoire pendant la session (perdu au reload).
// Demain : remplacer le corps de CHAQUE méthode par UN seul appel `apiClient.*`
// — la signature ne change pas, le composant appelant non plus.
//
// Stratégie de bascule (cf. TODO inline dans chaque méthode) :
//   list()           →  apiClient.get<{ week_templates: WeekTemplate[] }>("/planning/week-templates")
//   get(id)          →  apiClient.get<{ week_template: WeekTemplate; week_template_shifts: WeekTemplateShift[] }>(`/planning/week-templates/${id}`)
//   create(payload)  →  apiClient.post<{ week_template: WeekTemplate; week_template_shifts: WeekTemplateShift[] }>("/planning/week-templates", payload)
//   update(id, p)    →  apiClient.patch<{ week_template: WeekTemplate }>(`/planning/week-templates/${id}`, p)
//   remove(id)       →  apiClient.delete(`/planning/week-templates/${id}`)
//   createFromWeek() →  apiClient.post<{ week_template: WeekTemplate; week_template_shifts: WeekTemplateShift[] }>("/planning/week-templates/from-week", payload)

import { apiClient, type WelloApiResponse } from "@/services/apiClient";
import { unwrap, unwrapList, type ApiEnvelopeData } from "@/services/apiUnwrap";
import type {
  ConflictMode,
  Employee,
  EmployeePosition,
  InstantiationConflict,
  InstantiationPerWeekResult,
  InstantiationPreview,
  InstantiationResult,
  PlanningLeaveRequest,
  PlanningShift,
  PlanningShiftCreateRequest,
  WeekTemplate,
  WeekTemplateCreateRequest,
  WeekTemplateFromWeekRequest,
  WeekTemplateShift,
  WeekTemplateShiftInput,
  WeekTemplateUpdateRequest,
} from "@/types/planning";

import {
  classifyTemplateShift,
  projectDayOfWeekToDate,
} from "@/lib/weekTemplateProjection";

const MERCHANT_ID = "mock-merchant-001";
const NOW = () => new Date().toISOString();

let _seq = 0;
function nextId(prefix: string): string {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}

interface StoredWeekTemplate {
  meta: WeekTemplate;
  shifts: WeekTemplateShift[];
}

const _store: StoredWeekTemplate[] = [];

function delay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function metaOf(t: StoredWeekTemplate): WeekTemplate {
  // shift_count est TOUJOURS dérivé. Ne jamais le matérialiser côté store.
  return { ...t.meta, shift_count: t.shifts.length };
}

function materializeShifts(inputs: WeekTemplateShiftInput[]): WeekTemplateShift[] {
  return inputs.map((s) => ({ id: nextId("wts"), ...s }));
}

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

  /** @internal — utilitaire de tests pour réinitialiser le store. */
  __resetForTests(): void {
    _store.length = 0;
    _seq = 0;
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

// ─────────────────────────────────────────────────────────────────────────────
// INSTANCIATION — preview & instantiate
// ─────────────────────────────────────────────────────────────────────────────
//
// Côté MOCK : on n'a pas accès aux autres mocks (planningMocks tient les shifts/
// employees/leaves) ; le caller doit donc fournir le contexte. Côté BACKEND
// RÉEL, ces deux endpoints chargeront tout en interne à partir du seul
// `template_id` + `target_week_starts[]` (+ `conflict_mode` pour instantiate).
//
// Endpoints visés :
//   POST /planning/week-templates/{id}/preview      → data.preview      (DRY-RUN)
//   POST /planning/week-templates/{id}/instantiate  → data.result
//
// La logique pure de classification est dans `src/lib/weekTemplateProjection.ts`.

/** Contexte minimal nécessaire au mock pour calculer une preview / instanciation. */
export interface InstantiationContext {
  existingShiftsByWeekStart: Map<string, PlanningShift[]>;
  leaves: PlanningLeaveRequest[];
  employees: Employee[];
  positions: EmployeePosition[];
}

/** Bridge vers `planningWeeksApi` injecté par l'appelant — découplage testable. */
export interface InstantiationApiBridge {
  /** Résout (et crée au besoin) une `PlanningWeek` à partir d'un lundi ISO,
   *  retourne son `id`. */
  ensureWeekIdForStart(targetWeekStart: string): Promise<string>;
  /** Crée un shift dans une semaine. */
  createShift(weekId: string, payload: PlanningShiftCreateRequest): Promise<unknown>;
  /** Supprime un shift existant (mode replace). */
  deleteShift(shiftId: string): Promise<void>;
}

/** Normalise (lundis uniques + triés croissants) la liste de semaines cibles. */
function normalizeWeekStarts(input: ReadonlyArray<string>): string[] {
  return Array.from(new Set(input)).sort();
}

function buildEmployeeIndex(employees: Employee[]): Map<string, Employee> {
  const m = new Map<string, Employee>();
  for (const e of employees) m.set(e.id, e);
  return m;
}

function buildPositionLabelIndex(positions: EmployeePosition[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of positions) m.set(p.label.toLowerCase(), p.id);
  return m;
}

function getTemplateOrThrow(templateId: string): WeekTemplate & { shifts: WeekTemplateShift[] } {
  const found = _store.find((t) => t.meta.id === templateId);
  if (!found) throw new Error(`Modèle de semaine introuvable : ${templateId}`);
  return { ...metaOf(found), shifts: found.shifts };
}

/**
 * `POST /planning/week-templates/{id}/preview` — DRY-RUN.
 *
 * Aucun shift n'est créé/modifié/supprimé. Retourne le détail de ce qui se
 * passerait pour le `conflict_mode` choisi (par défaut `keep_existing` —
 * c'est le mode le plus sûr, et la UI rejouera la preview si l'utilisateur
 * change de mode).
 *
 * TODO(backend): replace by
 *   apiClient.post<{ preview: InstantiationPreview }>(
 *     `/planning/week-templates/${templateId}/preview`,
 *     { target_week_starts },
 *   ).then(r => r.preview);
 */
export function previewWeekTemplate(
  templateId: string,
  target_week_starts: string[],
  ctx: InstantiationContext,
  conflict_mode: ConflictMode = "keep_existing",
): InstantiationPreview {
  const tmpl = getTemplateOrThrow(templateId);
  const weekStarts = normalizeWeekStarts(target_week_starts);
  const employeeById = buildEmployeeIndex(ctx.employees);
  const positionIdByLabel = buildPositionLabelIndex(ctx.positions);

  let to_create_count = 0;
  let auto_unassigned_count = 0;
  let idempotent_skipped_count = 0;
  const conflicts: InstantiationConflict[] = [];
  const impactedEmployees = new Set<string>();

  for (const ws of weekStarts) {
    const existing = ctx.existingShiftsByWeekStart.get(ws) ?? [];
    for (const t of tmpl.shifts) {
      const date = projectDayOfWeekToDate(ws, t.day_of_week);
      const c = classifyTemplateShift(t, {
        target_week_start: ws,
        date,
        existingShifts: existing,
        leaves: ctx.leaves,
        employeeById,
        positionIdByLabel,
        conflict_mode,
      });

      switch (c.action.kind) {
        case "create_assigned":
        case "create_unassigned":
          to_create_count++;
          if (c.action.kind === "create_unassigned" && (c.action.reason === "on_leave" || c.action.reason === "contract_ended")) {
            auto_unassigned_count++;
          }
          break;
        case "replace":
          to_create_count++; // un nouveau shift sera bien créé
          break;
        case "skip_idempotent":
          idempotent_skipped_count++;
          break;
        case "skip_overlap":
          // rien créé
          break;
      }

      if (c.conflict) {
        conflicts.push(c.conflict);
        impactedEmployees.add(c.conflict.employee_id);
      }
    }
  }

  return {
    target_week_starts: weekStarts,
    to_create_count,
    conflicts,
    impacted_employee_count: impactedEmployees.size,
    auto_unassigned_count,
    idempotent_skipped_count,
  };
}

/**
 * `POST /planning/week-templates/{id}/instantiate` — exécute l'application.
 *
 * Côté MOCK, on délègue les écritures à l'`api` injecté
 * (`planningWeeksApi.createShift` + `planningShiftsApi.delete`). Cela permet
 * au store mock de PlanningMocks de rester source unique de vérité pour les
 * shifts (et déclencher les invalidations habituelles côté UI).
 *
 * TODO(backend): replace by
 *   apiClient.post<{ result: InstantiationResult }>(
 *     `/planning/week-templates/${templateId}/instantiate`,
 *     { target_week_starts, conflict_mode },
 *   ).then(r => r.result);
 */
export async function instantiateWeekTemplate(
  templateId: string,
  target_week_starts: string[],
  conflict_mode: ConflictMode,
  ctx: InstantiationContext,
  api: InstantiationApiBridge,
): Promise<InstantiationResult> {
  const tmpl = getTemplateOrThrow(templateId);
  const weekStarts = normalizeWeekStarts(target_week_starts);
  const employeeById = buildEmployeeIndex(ctx.employees);
  const positionIdByLabel = buildPositionLabelIndex(ctx.positions);

  const positionLabelById = new Map<string, string>();
  for (const p of ctx.positions) positionLabelById.set(p.id, p.label);

  const totals = {
    created_count: 0,
    assigned_count: 0,
    unassigned_count: 0,
    replaced_count: 0,
    skipped_count: 0,
  };
  const per_week: InstantiationPerWeekResult[] = [];

  for (const ws of weekStarts) {
    const week_id = await api.ensureWeekIdForStart(ws);
    const existing = ctx.existingShiftsByWeekStart.get(ws) ?? [];

    const wTotals: InstantiationPerWeekResult = {
      target_week_start: ws,
      week_id,
      created_count: 0,
      assigned_count: 0,
      unassigned_count: 0,
      replaced_count: 0,
      skipped_count: 0,
    };

    for (const t of tmpl.shifts) {
      const date = projectDayOfWeekToDate(ws, t.day_of_week);
      const c = classifyTemplateShift(t, {
        target_week_start: ws,
        date,
        existingShifts: existing,
        leaves: ctx.leaves,
        employeeById,
        positionIdByLabel,
        conflict_mode,
      });

      // `position` (label) — on stocke le label dans PlanningShift comme le reste
      // du code (cf. `PlanningShift.position` qui est un string).
      const positionLabel = t.position_id ? positionLabelById.get(t.position_id) ?? null : null;

      const basePayload: PlanningShiftCreateRequest = {
        employee_id: null, // surchargé selon l'action
        shift_date: date,
        start_time: t.start_time,
        end_time: t.end_time,
        break_minutes: t.break_minutes,
        position: positionLabel,
        notes: t.notes,
      };

      switch (c.action.kind) {
        case "create_assigned": {
          await api.createShift(week_id, { ...basePayload, employee_id: c.action.employee_id });
          wTotals.created_count++;
          wTotals.assigned_count++;
          break;
        }
        case "create_unassigned": {
          await api.createShift(week_id, { ...basePayload, employee_id: null });
          wTotals.created_count++;
          wTotals.unassigned_count++;
          break;
        }
        case "replace": {
          await api.deleteShift(c.action.existing_shift_id);
          await api.createShift(week_id, { ...basePayload, employee_id: c.action.employee_id });
          wTotals.created_count++;
          wTotals.assigned_count++;
          wTotals.replaced_count++;
          break;
        }
        case "skip_idempotent":
        case "skip_overlap": {
          wTotals.skipped_count++;
          break;
        }
      }
    }

    per_week.push(wTotals);
    totals.created_count += wTotals.created_count;
    totals.assigned_count += wTotals.assigned_count;
    totals.unassigned_count += wTotals.unassigned_count;
    totals.replaced_count += wTotals.replaced_count;
    totals.skipped_count += wTotals.skipped_count;
  }

  return { ...totals, per_week };
}

