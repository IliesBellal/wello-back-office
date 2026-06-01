/**
 * Performance indicators — contract for the FUTURE backend endpoint
 *   GET /planning/performance?from=&to=&granularity=&compare=
 *
 * This file is the source of truth that the backend MUST reproduce when the
 * endpoint is implemented. The current frontend computes the same shape
 * locally (see `services/performanceService.ts`) so the UI works today.
 *
 * Conventions:
 *   - All monetary amounts are integers in CENTIMES (1 € = 100).
 *   - All ratios are floats (0.32 = 32 %).
 *   - Any value that would require a division by zero or a missing source
 *     MUST be returned as `null` (never 0, never -1, never NaN).
 *   - Dates are ISO `YYYY-MM-DD`.
 *   - `worked_hours` and `planned_hours` are floats in DECIMAL HOURS (e.g. 7.5).
 */

/** Granularity of the row breakdown returned by the endpoint. */
export type PerformanceGranularity = "day" | "week" | "month";

/** Comparison mode. `previous` returns a sibling block of equal length. */
export type PerformanceCompare = "previous";

/** Query params the endpoint will accept. */
export interface PerformanceQuery {
  /** Inclusive start date, ISO `YYYY-MM-DD`. */
  from: string;
  /** Inclusive end date, ISO `YYYY-MM-DD`. */
  to: string;
  /** Row breakdown. */
  granularity: PerformanceGranularity;
  /** Optional comparison block. */
  compare?: PerformanceCompare;
}

/**
 * One period row.
 *
 * The `totals` field of the response uses the same shape with
 * `period_start = from`, `period_end = to`, and `label = "Total"`.
 */
export interface PerformancePeriod {
  /** Inclusive start of this row, ISO `YYYY-MM-DD`. */
  period_start: string;
  /** Inclusive end of this row, ISO `YYYY-MM-DD`. */
  period_end: string;
  /** Human-readable label (locale-formatted by the backend). */
  label: string;

  /** Actual net revenue (CA HT) realised on the period, in cents. `null` = no source. */
  revenue_actual_cents: number | null;
  /** Forecasted revenue (CA HT prévisionnel) entered by the operator, in cents. `null` = none. */
  revenue_forecast_cents: number | null;

  /** Planned hours: Σ(end − start − break) over the period's shifts. Decimal hours. */
  planned_hours: number;
  /** Worked hours: Σ(clock_out − clock_in) over CLOSED time-entries. Decimal hours.
   *  Fallback (documented in the service): equals `planned_hours` when no time-entry
   *  source is available. The backend MUST use the time-entry source when present. */
  worked_hours: number;

  /** Distinct employees with ≥ 1 shift on the period. */
  headcount: number;

  /** Loaded payroll cost: Σ_employee (hours × hourly_rate × (1 + employer_charges_pct/100)). Cents. */
  payroll_cost_loaded_cents: number;

  /** payroll_cost_loaded_cents / revenue_actual_cents (float, e.g. 0.32). `null` if CA null or 0. */
  payroll_ratio: number | null;

  /** Value productivity: revenue_actual_cents / worked_hours, in cents per hour. `null` if CA null or worked_hours = 0. */
  revenue_per_hour_cents: number | null;

  /** worked_hours − planned_hours (can be negative). Decimal hours. */
  hours_delta: number;
}

/**
 * Response payload returned by `GET /planning/performance`.
 *
 * Note: when wrapped by the standard Wello envelope this becomes:
 *   `{ status: "success", data: { performance: PerformanceResponse } }`.
 */
export interface PerformanceResponse {
  from: string;
  to: string;
  granularity: PerformanceGranularity;
  /** One row per period (day / week / month). */
  periods: PerformancePeriod[];
  /** Aggregation over the whole [from, to] range. */
  totals: PerformancePeriod;
  /** Equal-length comparison block, present iff `query.compare === "previous"`. */
  previous_period: {
    from: string;
    to: string;
    periods: PerformancePeriod[];
    totals: PerformancePeriod;
  } | null;
  /** Warnings the UI may surface (non-blocking). */
  warnings: {
    /** Count of employees that worked but have no `hourly_rate` and were excluded from payroll. */
    members_without_rate: number;
  };
}
