/**
 * Tests pure-fn pour la prise en charge des shifts non assignés (employee_id === null).
 * Vitest-style; run via `npx vitest run` une fois vitest installé.
 */

import { describe, it, expect } from "vitest";

import { UNASSIGNED_KEY, fromKey, toKey, isUnassigned } from "@/lib/planningUnassigned";
import { computeHeadcount } from "@/services/performanceService";
import type { PlanningShift } from "@/types/planning";

// ─── planningUnassigned helpers ─────────────────────────────────────────────

describe("planningUnassigned mapping", () => {
  it("fromKey maps the sentinel to null and ids to themselves", () => {
    expect(fromKey(UNASSIGNED_KEY)).toBeNull();
    expect(fromKey("emp_42")).toBe("emp_42");
  });

  it("toKey maps null to the sentinel and ids to themselves", () => {
    expect(toKey(null)).toBe(UNASSIGNED_KEY);
    expect(toKey("emp_42")).toBe("emp_42");
  });

  it("round-trips through both directions", () => {
    expect(fromKey(toKey(null))).toBeNull();
    expect(fromKey(toKey("emp_42"))).toBe("emp_42");
  });

  it("isUnassigned recognises null and undefined", () => {
    expect(isUnassigned(null)).toBe(true);
    expect(isUnassigned(undefined)).toBe(true);
    expect(isUnassigned("emp_42")).toBe(false);
  });
});

// ─── Grouping logic (mirrors `shiftsByCell` in PlanningGrid) ────────────────

function groupShiftsByCell(shifts: Array<Pick<PlanningShift, "employee_id" | "shift_date">>) {
  const m = new Map<string, typeof shifts>();
  for (const s of shifts) {
    const key = `${toKey(s.employee_id)}:${s.shift_date}`;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(s);
  }
  return m;
}

describe("grouping shifts with mixed assigned + unassigned", () => {
  const date = "2026-05-31";
  const shifts = [
    { employee_id: "emp_1", shift_date: date },
    { employee_id: "emp_1", shift_date: date },
    { employee_id: null, shift_date: date },
    { employee_id: "emp_2", shift_date: date },
    { employee_id: null, shift_date: date },
  ];

  it("places unassigned shifts under the sentinel key", () => {
    const groups = groupShiftsByCell(shifts);
    expect(groups.get(`${UNASSIGNED_KEY}:${date}`)).toHaveLength(2);
    expect(groups.get(`emp_1:${date}`)).toHaveLength(2);
    expect(groups.get(`emp_2:${date}`)).toHaveLength(1);
  });

  it("does not create a 'null:date' bucket (string coercion bug guard)", () => {
    const groups = groupShiftsByCell(shifts);
    expect(groups.get(`null:${date}`)).toBeUndefined();
  });
});

// ─── Hour totals (assigned vs. unassigned counted separately) ──────────────

function splitHours(shifts: Array<Pick<PlanningShift, "employee_id" | "start_time" | "end_time" | "break_minutes">>) {
  const byEmp = new Map<string, number>();
  let unassigned = 0;
  for (const s of shifts) {
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    mins -= s.break_minutes ?? 0;
    if (mins < 0) mins = 0;
    const h = mins / 60;
    if (s.employee_id == null) unassigned += h;
    else byEmp.set(s.employee_id, (byEmp.get(s.employee_id) ?? 0) + h);
  }
  return { byEmp, unassigned };
}

describe("hour totals split", () => {
  it("never accumulates unassigned hours under an employee id", () => {
    const out = splitHours([
      { employee_id: "emp_1", start_time: "09:00", end_time: "17:00", break_minutes: 0 },
      { employee_id: null, start_time: "11:00", end_time: "15:00", break_minutes: 0 },
      { employee_id: null, start_time: "18:00", end_time: "23:00", break_minutes: 0 },
    ]);
    expect(out.byEmp.get("emp_1")).toBe(8);
    expect(out.byEmp.has("null")).toBe(false);
    expect(out.unassigned).toBe(9);
  });

  it("doesn't crash when the grid is fully unassigned", () => {
    const out = splitHours([
      { employee_id: null, start_time: "11:00", end_time: "15:00", break_minutes: 0 },
    ]);
    expect(out.byEmp.size).toBe(0);
    expect(out.unassigned).toBe(4);
  });
});

// ─── performanceService.computeHeadcount excludes unassigned ────────────────

describe("computeHeadcount excludes unassigned shifts", () => {
  it("counts only distinct real employees", () => {
    const headcount = computeHeadcount([
      { employee_id: "emp_1" },
      { employee_id: "emp_1" },
      { employee_id: null },
      { employee_id: "emp_2" },
      { employee_id: null },
    ]);
    expect(headcount).toBe(2);
  });

  it("returns 0 when every shift is unassigned (no division-by-zero downstream)", () => {
    const headcount = computeHeadcount([
      { employee_id: null },
      { employee_id: null },
    ]);
    expect(headcount).toBe(0);
  });
});

// ─── PATCH payload mapping (mirrors `handleDragEnd` in PlanningPage) ───────

function dragPatch(targetCellId: string, shift: { id: string; employee_id: string | null; shift_date: string }) {
  if (!targetCellId.startsWith("cell:")) return null;
  const [, targetKey, isoDate] = targetCellId.split(":");
  if (!targetKey || !isoDate) return null;
  const targetEmployeeId = fromKey(targetKey);
  if (shift.employee_id === targetEmployeeId && shift.shift_date === isoDate) return null;
  return { id: shift.id, payload: { employee_id: targetEmployeeId, shift_date: isoDate } };
}

describe("DnD PATCH payload", () => {
  const shift = { id: "sh_1", employee_id: "emp_1" as string | null, shift_date: "2026-05-31" };

  it("emits employee_id=null when dropped on the unassigned row", () => {
    const out = dragPatch(`cell:${UNASSIGNED_KEY}:2026-05-31`, shift);
    expect(out).toEqual({ id: "sh_1", payload: { employee_id: null, shift_date: "2026-05-31" } });
  });

  it("emits a real employee_id when dropped on another employee row", () => {
    const out = dragPatch(`cell:emp_2:2026-05-31`, shift);
    expect(out).toEqual({ id: "sh_1", payload: { employee_id: "emp_2", shift_date: "2026-05-31" } });
  });

  it("re-assigns an unassigned shift to an employee", () => {
    const out = dragPatch(`cell:emp_2:2026-05-31`, { ...shift, employee_id: null });
    expect(out).toEqual({ id: "sh_1", payload: { employee_id: "emp_2", shift_date: "2026-05-31" } });
  });

  it("returns null on a no-op drop (same cell)", () => {
    expect(dragPatch(`cell:emp_1:2026-05-31`, shift)).toBeNull();
    expect(dragPatch(`cell:${UNASSIGNED_KEY}:2026-05-31`, { ...shift, employee_id: null })).toBeNull();
  });
});
