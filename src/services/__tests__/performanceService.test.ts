/**
 * Unit tests for the pure helpers of `performanceService`.
 *
 * Runtime: no test runner is currently configured in this repo. The tests
 * below are written in the standard Vitest API (`describe / it / expect`).
 * To run them, install vitest as a dev dep and add `"test": "vitest run"`:
 *
 *     npm i -D vitest
 *     npx vitest run src/services/__tests__/performanceService.test.ts
 *
 * They are kept here so the pure functions are documented & verifiable when
 * the test harness is added.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";

import {
  aggregateTotals,
  computeHeadcount,
  computePayrollLoaded,
  computePlannedHours,
  computeRatio,
  computeRevenuePerHour,
  computeWorkedHoursFromEntries,
  previousPeriodRange,
  shiftDurationHours,
  splitRangeByGranularity,
} from "../performanceService";

describe("shiftDurationHours", () => {
  it("subtracts the break", () => {
    expect(shiftDurationHours({ start_time: "09:00", end_time: "17:00", break_minutes: 30 })).toBe(7.5);
  });
  it("handles overnight shifts", () => {
    expect(shiftDurationHours({ start_time: "22:00", end_time: "06:00", break_minutes: 0 })).toBe(8);
  });
  it("never returns a negative duration", () => {
    expect(shiftDurationHours({ start_time: "09:00", end_time: "09:00", break_minutes: 30 })).toBe(0);
  });
});

describe("computePlannedHours", () => {
  it("sums per-shift durations", () => {
    const shifts = [
      { start_time: "09:00", end_time: "13:00", break_minutes: 0 },
      { start_time: "14:00", end_time: "18:00", break_minutes: 0 },
    ];
    expect(computePlannedHours(shifts)).toBe(8);
  });
});

describe("computeWorkedHoursFromEntries", () => {
  it("ignores still-open entries (no clock_out)", () => {
    const entries = [
      { clock_in_at: "2026-05-30T09:00:00Z", clock_out_at: "2026-05-30T17:00:00Z" }, // 8h
      { clock_in_at: "2026-05-30T18:00:00Z", clock_out_at: null }, // open → ignored
    ];
    expect(computeWorkedHoursFromEntries(entries)).toBe(8);
  });
});

describe("computeHeadcount", () => {
  it("counts distinct employees", () => {
    expect(computeHeadcount([{ employee_id: "a" }, { employee_id: "a" }, { employee_id: "b" }])).toBe(2);
  });
});

describe("computePayrollLoaded", () => {
  const employees = [
    { id: "a", hourly_rate: 1500, employer_charges_pct: 42 }, // 15 € * 1.42
    { id: "b", hourly_rate: 2000, employer_charges_pct: 0 },
    { id: "c", hourly_rate: null, employer_charges_pct: 42 },
  ];

  it("applies charges and sums in cents", () => {
    const hours = new Map([
      ["a", 10], // 10 * 1500 * 1.42 = 21300
      ["b", 5], // 5 * 2000 * 1.00 = 10000
    ]);
    const r = computePayrollLoaded(hours, employees);
    expect(r.cents).toBe(31300);
    expect(r.members_without_rate).toBe(0);
  });

  it("excludes members without a rate and counts them", () => {
    const hours = new Map([
      ["a", 10],
      ["c", 8], // missing rate → excluded
    ]);
    const r = computePayrollLoaded(hours, employees);
    expect(r.cents).toBe(21300);
    expect(r.members_without_rate).toBe(1);
  });

  it("handles missing employer_charges_pct as 0", () => {
    const r = computePayrollLoaded(new Map([["b", 1]]), employees);
    expect(r.cents).toBe(2000);
  });
});

describe("computeRatio", () => {
  it("returns the ratio when revenue is positive", () => {
    expect(computeRatio(3200, 10000)).toBe(0.32);
  });
  it("returns null when revenue is null", () => {
    expect(computeRatio(3200, null)).toBeNull();
  });
  it("returns null when revenue is zero", () => {
    expect(computeRatio(3200, 0)).toBeNull();
  });
});

describe("computeRevenuePerHour", () => {
  it("computes cents per hour", () => {
    expect(computeRevenuePerHour(10000, 5)).toBe(2000);
  });
  it("returns null when revenue is null", () => {
    expect(computeRevenuePerHour(null, 5)).toBeNull();
  });
  it("returns null when worked_hours is zero", () => {
    expect(computeRevenuePerHour(10000, 0)).toBeNull();
  });
});

describe("aggregateTotals", () => {
  it("sums numeric fields and recomputes ratios", () => {
    const periods = [
      {
        period_start: "2026-05-25",
        period_end: "2026-05-25",
        label: "lun.",
        revenue_actual_cents: 50000,
        revenue_forecast_cents: null,
        planned_hours: 10,
        worked_hours: 10,
        headcount: 3,
        payroll_cost_loaded_cents: 21300,
        payroll_ratio: 21300 / 50000,
        revenue_per_hour_cents: 5000,
        hours_delta: 0,
      },
      {
        period_start: "2026-05-26",
        period_end: "2026-05-26",
        label: "mar.",
        revenue_actual_cents: 50000,
        revenue_forecast_cents: null,
        planned_hours: 10,
        worked_hours: 10,
        headcount: 4,
        payroll_cost_loaded_cents: 21300,
        payroll_ratio: 21300 / 50000,
        revenue_per_hour_cents: 5000,
        hours_delta: 0,
      },
    ];
    const t = aggregateTotals(periods as any, "2026-05-25", "2026-05-26");
    expect(t.revenue_actual_cents).toBe(100000);
    expect(t.payroll_cost_loaded_cents).toBe(42600);
    expect(t.planned_hours).toBe(20);
    expect(t.worked_hours).toBe(20);
    expect(t.payroll_ratio).toBeCloseTo(42600 / 100000);
    expect(t.revenue_per_hour_cents).toBe(5000);
  });

  it("keeps payroll_ratio null when no revenue source", () => {
    const periods = [
      {
        period_start: "2026-05-25",
        period_end: "2026-05-25",
        label: "lun.",
        revenue_actual_cents: null,
        revenue_forecast_cents: null,
        planned_hours: 8,
        worked_hours: 8,
        headcount: 2,
        payroll_cost_loaded_cents: 10000,
        payroll_ratio: null,
        revenue_per_hour_cents: null,
        hours_delta: 0,
      },
    ];
    const t = aggregateTotals(periods as any, "2026-05-25", "2026-05-25");
    expect(t.revenue_actual_cents).toBeNull();
    expect(t.payroll_ratio).toBeNull();
    expect(t.revenue_per_hour_cents).toBeNull();
  });
});

describe("previousPeriodRange", () => {
  it("week granularity → −7 days", () => {
    expect(previousPeriodRange("2026-05-25", "2026-05-31", "week")).toEqual({
      from: "2026-05-18",
      to: "2026-05-24",
    });
  });
  it("day granularity → exactly the previous day(s) of equal length", () => {
    expect(previousPeriodRange("2026-05-25", "2026-05-25", "day")).toEqual({
      from: "2026-05-24",
      to: "2026-05-24",
    });
  });
  it("month granularity → previous calendar month", () => {
    expect(previousPeriodRange("2026-05-01", "2026-05-31", "month")).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
    });
  });
});

describe("splitRangeByGranularity", () => {
  it("day granularity yields one row per calendar day", () => {
    const rows = splitRangeByGranularity("2026-05-25", "2026-05-27", "day");
    expect(rows.map((r) => [r.start, r.end])).toEqual([
      ["2026-05-25", "2026-05-25"],
      ["2026-05-26", "2026-05-26"],
      ["2026-05-27", "2026-05-27"],
    ]);
  });

  it("week granularity clamps to the requested range", () => {
    // Wed 2026-05-27 → Mon 2026-06-01 spans 2 ISO weeks (clamped).
    const rows = splitRangeByGranularity("2026-05-27", "2026-06-01", "week");
    expect(rows[0].start).toBe("2026-05-27");
    expect(rows[rows.length - 1].end).toBe("2026-06-01");
  });
});
