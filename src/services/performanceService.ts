/**
 * MOCK — à remplacer par GET /planning/performance?from=&to=&granularity=&compare=
 *
 * La forme de PerformanceResponse (cf. `@/types/performance`) EST le contrat
 * backend à reproduire. Tant que l'endpoint n'existe pas, ce service calcule
 * localement les indicateurs à partir des données déjà chargées dans l'app :
 *   - shifts de la période (planning weeks)
 *   - fiches employés (hourly_rate / employer_charges_pct)
 *   - (à venir) time-entries fermées
 *
 * Le composant UI n'appelle QUE `PerformanceService.getForRange(query)`.
 * Le jour où l'endpoint existera, le corps de cette fonction devient un
 * `apiClient.get(...)` ; la signature et `PerformanceResponse` ne changent
 * PAS. C'est le seul point de bascule mock → API.
 */

import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";

import { apiClient } from "@/services/apiClient";
import type { WelloApiResponse } from "@/services/apiClient";
import { unwrap } from "@/services/apiUnwrap";
import type { ApiEnvelopeData } from "@/services/apiUnwrap";
import { planningEmployeesApi, planningWeeksApi } from "@/services/welloApi";
import type { Employee, PlanningShift } from "@/types/planning";
import type {
  PerformanceGranularity,
  PerformancePeriod,
  PerformanceQuery,
  PerformanceResponse,
} from "@/types/performance";

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for unit tests / reuse)
// ─────────────────────────────────────────────────────────────────────────────

/** Parse a `HH:mm[:ss]` time string to minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** Net duration of a single shift in decimal hours, accounting for the break. */
export function shiftDurationHours(shift: Pick<PlanningShift, "start_time" | "end_time" | "break_minutes">): number {
  const start = parseTimeToMinutes(shift.start_time);
  let end = parseTimeToMinutes(shift.end_time);
  // Overnight shifts: end <= start means the shift wraps past midnight.
  if (end <= start) end += 24 * 60;
  const net = Math.max(0, end - start - (shift.break_minutes ?? 0));
  return net / 60;
}

/** Σ planned hours for the given shifts. */
export function computePlannedHours(shifts: Array<Pick<PlanningShift, "start_time" | "end_time" | "break_minutes">>): number {
  return round2(shifts.reduce((sum, s) => sum + shiftDurationHours(s), 0));
}

/**
 * Σ worked hours from CLOSED time-entries (clock_out present).
 * If no time-entry source is available, callers should fall back to
 * `planned_hours` and surface a notice — handled by the service below.
 */
export function computeWorkedHoursFromEntries(
  entries: Array<{ clock_in_at: string; clock_out_at: string | null }>,
): number {
  const total = entries.reduce((sum, e) => {
    if (!e.clock_out_at) return sum;
    const diffMs = new Date(e.clock_out_at).getTime() - new Date(e.clock_in_at).getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return sum;
    return sum + diffMs / 3_600_000;
  }, 0);
  return round2(total);
}

/** Distinct employees with ≥ 1 shift in the input. */
/**
 * Effectifs distincts planifiés.
 * Les shifts non assignés (`employee_id === null`) représentent un BESOIN,
 * pas une personne — ils sont exclus du décompte.
 */
export function computeHeadcount(shifts: Array<Pick<PlanningShift, "employee_id">>): number {
  const set = new Set<string>();
  for (const s of shifts) {
    if (s.employee_id != null) set.add(s.employee_id);
  }
  return set.size;
}

/**
 * Loaded payroll cost in cents.
 *
 * Reuses `hours_by_employee` (typically planned or worked hours by employee).
 * Employees without an `hourly_rate` are EXCLUDED from the sum and counted
 * in `members_without_rate` so the UI can surface a warning.
 */
export function computePayrollLoaded(
  hoursByEmployee: Map<string, number>,
  employees: Array<Pick<Employee, "id" | "hourly_rate" | "employer_charges_pct">>,
): { cents: number; members_without_rate: number } {
  const byId = new Map(employees.map((e) => [e.id, e] as const));
  let cents = 0;
  let missing = 0;
  for (const [empId, hours] of hoursByEmployee) {
    if (hours <= 0) continue;
    const emp = byId.get(empId);
    const rate = emp?.hourly_rate ?? null;
    if (rate == null) {
      missing += 1;
      continue;
    }
    const chargesPct = emp?.employer_charges_pct ?? 0;
    cents += Math.round(hours * rate * (1 + chargesPct / 100));
  }
  return { cents, members_without_rate: missing };
}

/** payroll_cost / revenue. Returns null when revenue is null or 0. */
export function computeRatio(costCents: number, revenueCents: number | null): number | null {
  if (revenueCents == null || revenueCents === 0) return null;
  return costCents / revenueCents;
}

/** revenue / worked_hours, in cents per hour. Null when revenue is null or hours = 0. */
export function computeRevenuePerHour(revenueCents: number | null, workedHours: number): number | null {
  if (revenueCents == null || workedHours <= 0) return null;
  return Math.round(revenueCents / workedHours);
}

/** Aggregate a list of period rows into a single totals row. */
export function aggregateTotals(periods: PerformancePeriod[], from: string, to: string): PerformancePeriod {
  const revenueActual = sumNullable(periods.map((p) => p.revenue_actual_cents));
  const revenueForecast = sumNullable(periods.map((p) => p.revenue_forecast_cents));
  const plannedHours = round2(periods.reduce((s, p) => s + p.planned_hours, 0));
  const workedHours = round2(periods.reduce((s, p) => s + p.worked_hours, 0));
  // Headcount: best-effort — we don't have raw shifts at this layer, so we
  // take the max across rows (a person counted once per row max). The real
  // backend MUST recompute headcount over distinct employees on [from, to].
  const headcount = periods.reduce((m, p) => Math.max(m, p.headcount), 0);
  const payrollCost = periods.reduce((s, p) => s + p.payroll_cost_loaded_cents, 0);
  return {
    period_start: from,
    period_end: to,
    label: "Total",
    revenue_actual_cents: revenueActual,
    revenue_forecast_cents: revenueForecast,
    planned_hours: plannedHours,
    worked_hours: workedHours,
    headcount,
    payroll_cost_loaded_cents: payrollCost,
    payroll_ratio: computeRatio(payrollCost, revenueActual),
    revenue_per_hour_cents: computeRevenuePerHour(revenueActual, workedHours),
    hours_delta: round2(workedHours - plannedHours),
  };
}

/**
 * Equal-length comparison range that ends right before `from`.
 *   - day / week granularity → shift by N calendar days (N = #days in range).
 *   - month granularity      → previous calendar month relative to `from`.
 */
export function previousPeriodRange(
  from: string,
  to: string,
  granularity: PerformanceGranularity,
): { from: string; to: string } {
  const fromD = parseISO(from);
  const toD = parseISO(to);

  if (granularity === "month") {
    const prev = addMonths(fromD, -1);
    return {
      from: isoDay(startOfMonth(prev)),
      to: isoDay(endOfMonth(prev)),
    };
  }

  const lengthDays = differenceInCalendarDays(toD, fromD) + 1; // inclusive
  const prevTo = addDays(fromD, -1);
  const prevFrom = addDays(prevTo, -(lengthDays - 1));
  return { from: isoDay(prevFrom), to: isoDay(prevTo) };
}

/** Build the [start, end, label] rows for the requested granularity. */
export function splitRangeByGranularity(
  from: string,
  to: string,
  granularity: PerformanceGranularity,
): Array<{ start: string; end: string; label: string }> {
  const out: Array<{ start: string; end: string; label: string }> = [];
  let cursor = parseISO(from);
  const last = parseISO(to);

  if (granularity === "day") {
    while (cursor <= last) {
      const iso = isoDay(cursor);
      out.push({
        start: iso,
        end: iso,
        label: format(cursor, "EEE d MMM", { locale: fr }),
      });
      cursor = addDays(cursor, 1);
    }
    return out;
  }

  if (granularity === "week") {
    cursor = startOfWeek(cursor, { weekStartsOn: 1 });
    while (cursor <= last) {
      const end = addDays(cursor, 6);
      const clampedStart = cursor < parseISO(from) ? parseISO(from) : cursor;
      const clampedEnd = end > last ? last : end;
      out.push({
        start: isoDay(clampedStart),
        end: isoDay(clampedEnd),
        label: `S. du ${format(clampedStart, "d MMM", { locale: fr })}`,
      });
      cursor = addDays(cursor, 7);
    }
    return out;
  }

  // month
  cursor = startOfMonth(cursor);
  while (cursor <= last) {
    const end = endOfMonth(cursor);
    const clampedStart = cursor < parseISO(from) ? parseISO(from) : cursor;
    const clampedEnd = end > last ? last : end;
    out.push({
      start: isoDay(clampedStart),
      end: isoDay(clampedEnd),
      label: format(cursor, "LLLL yyyy", { locale: fr }),
    });
    cursor = addMonths(cursor, 1);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumNullable(values: Array<number | null>): number | null {
  let total: number | null = null;
  for (const v of values) {
    if (v == null) continue;
    total = (total ?? 0) + v;
  }
  return total;
}

/** Group shifts by ISO calendar day for fast lookup. */
function indexShiftsByDate(shifts: PlanningShift[]): Map<string, PlanningShift[]> {
  const map = new Map<string, PlanningShift[]>();
  for (const s of shifts) {
    const arr = map.get(s.shift_date);
    if (arr) arr.push(s);
    else map.set(s.shift_date, [s]);
  }
  return map;
}

/**
 * Hours by employee within a date range, based on planned shift durations.
 * Les shifts non assignés sont ignorés (pas de personne → pas de masse salariale).
 */
function plannedHoursByEmployeeInRange(
  shifts: PlanningShift[],
  from: string,
  to: string,
): Map<string, number> {
  const out = new Map<string, number>();
  const fromD = parseISO(from);
  const toD = parseISO(to);
  for (const s of shifts) {
    if (s.employee_id == null) continue;
    const d = parseISO(s.shift_date);
    if (!isWithinInterval(d, { start: fromD, end: toD })) continue;
    const h = shiftDurationHours(s);
    out.set(s.employee_id, (out.get(s.employee_id) ?? 0) + h);
  }
  return out;
}

/**
 * Load every shift that intersects [from, to] by iterating the planning
 * weeks the merchant has. We rely on `planningWeeksApi.list()` and then
 * fetch the shifts of any week whose range overlaps the query range.
 *
 * NB: this is the MOCK strategy — the real endpoint will compute everything
 * server-side in one query.
 */
async function loadShiftsForRange(from: string, to: string): Promise<PlanningShift[]> {
  const weeks = await planningWeeksApi.list();
  const fromD = parseISO(from);
  const toD = parseISO(to);
  const matching = weeks.filter((w) => {
    const ws = parseISO(w.start_date);
    const we = parseISO(w.end_date);
    return !(we < fromD || ws > toD);
  });
  if (matching.length === 0) return [];
  const all = await Promise.all(matching.map((w) => planningWeeksApi.getShifts(w.id)));
  // De-duplicate by id (a shift only belongs to one week, but defensive).
  const seen = new Set<string>();
  const out: PlanningShift[] = [];
  for (const arr of all) {
    for (const s of arr) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service entry point — single switch from mock to API
// ─────────────────────────────────────────────────────────────────────────────

const PERFORMANCE_FORCE_MOCK = false;

export const PerformanceService = {
  async getForRange(query: PerformanceQuery): Promise<PerformanceResponse> {
    if (!PERFORMANCE_FORCE_MOCK) {
      const params = new URLSearchParams({
        from: query.from,
        to: query.to,
        granularity: query.granularity,
      });
      if (query.compare) {
        params.set("compare", query.compare);
      }

      return apiClient
        .get<WelloApiResponse<ApiEnvelopeData>>(`/planning/performance?${params.toString()}`)
        .then((resp) => unwrap<{ performance: PerformanceResponse } & Record<string, unknown>>(resp).performance);
    }

    const [shifts, employeesList] = await Promise.all([
      loadShiftsForRange(query.from, query.to),
      planningEmployeesApi.list({ active: true, page_size: 200 }),
    ]);
    const employees = employeesList.items;

    const main = buildBlock(query.from, query.to, query.granularity, shifts, employees);

    let previous: PerformanceResponse["previous_period"] = null;
    if (query.compare === "previous") {
      const prevRange = previousPeriodRange(query.from, query.to, query.granularity);
      const prevShifts = await loadShiftsForRange(prevRange.from, prevRange.to);
      const prevBlock = buildBlock(
        prevRange.from,
        prevRange.to,
        query.granularity,
        prevShifts,
        employees,
      );
      previous = {
        from: prevRange.from,
        to: prevRange.to,
        periods: prevBlock.periods,
        totals: prevBlock.totals,
      };
    }

    return {
      from: query.from,
      to: query.to,
      granularity: query.granularity,
      periods: main.periods,
      totals: main.totals,
      previous_period: previous,
      warnings: { members_without_rate: main.members_without_rate },
    };
  },

  upsertForecasts(forecasts: { date: string; amount_cents: number | null }[]): Promise<void> {
    return apiClient
      .put<WelloApiResponse<ApiEnvelopeData>>("/planning/revenue-forecast", { forecasts })
      .then((resp) => { unwrap(resp); });
  },
};

interface Block {
  periods: PerformancePeriod[];
  totals: PerformancePeriod;
  members_without_rate: number;
}

function buildBlock(
  from: string,
  to: string,
  granularity: PerformanceGranularity,
  shifts: PlanningShift[],
  employees: Employee[],
): Block {
  const byDate = indexShiftsByDate(shifts);
  const rows = splitRangeByGranularity(from, to, granularity);
  const periods: PerformancePeriod[] = [];
  let totalMissing = 0;

  for (const row of rows) {
    const rowShifts = collectShifts(byDate, row.start, row.end);
    const hoursByEmp = plannedHoursByEmployeeInRange(rowShifts, row.start, row.end);
    const planned = computePlannedHours(rowShifts);
    // FALLBACK: no time-entries source available in the mock, so we use the
    // planned hours as a stand-in. The backend MUST replace this with the
    // closed time-entries on [start, end].
    const worked = planned;
    const headcount = computeHeadcount(rowShifts);
    const payroll = computePayrollLoaded(hoursByEmp, employees);
    totalMissing = Math.max(totalMissing, payroll.members_without_rate);

    // No revenue source for now: null everywhere.
    const revenueActual: number | null = null;
    const revenueForecast: number | null = null;

    periods.push({
      period_start: row.start,
      period_end: row.end,
      label: row.label,
      revenue_actual_cents: revenueActual,
      revenue_forecast_cents: revenueForecast,
      planned_hours: planned,
      worked_hours: worked,
      headcount,
      payroll_cost_loaded_cents: payroll.cents,
      payroll_ratio: computeRatio(payroll.cents, revenueActual),
      revenue_per_hour_cents: computeRevenuePerHour(revenueActual, worked),
      hours_delta: round2(worked - planned),
    });
  }

  // Recompute totals headcount globally (distinct over the whole range).
  const totals = aggregateTotals(periods, from, to);
  const allShiftsInRange = collectShifts(byDate, from, to);
  totals.headcount = computeHeadcount(allShiftsInRange);

  return { periods, totals, members_without_rate: totalMissing };
}

function collectShifts(byDate: Map<string, PlanningShift[]>, from: string, to: string): PlanningShift[] {
  const out: PlanningShift[] = [];
  const fromD = parseISO(from);
  const toD = parseISO(to);
  let cursor = fromD;
  while (cursor <= toD) {
    const arr = byDate.get(isoDay(cursor));
    if (arr) out.push(...arr);
    cursor = addDays(cursor, 1);
  }
  return out;
}
