/**
 * Tests de la PROJECTION pure (`weekTemplateProjection`). La preview et
 * l’instanciation sont calculées par l’API (/planning/week-templates/{id}/…).
 */

import { describe, expect, it } from "vitest";

import {
  classifyTemplateShift,
  projectDayOfWeekToDate,
  isContractEnded,
  isOnApprovedLeave,
} from "@/lib/weekTemplateProjection";
import type {
  Employee,
  EmployeePosition,
  PlanningLeaveRequest,
  PlanningShift,
  WeekTemplateShift,
} from "@/types/planning";

// ─── Fixtures helpers ────────────────────────────────────────────────────────

function emp(over: Partial<Employee> & Pick<Employee, "id" | "first_name" | "last_name">): Employee {
  return {
    id: over.id,
    merchant_id: "m1",
    first_name: over.first_name,
    last_name: over.last_name,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...over,
  };
}

function pos(id: string, label: string, color = "#3b82f6"): EmployeePosition {
  return {
    id,
    merchant_id: "m1",
    label,
    color,
    sort_order: 0,
    active: true,
    employee_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function tShift(over: Partial<WeekTemplateShift>): WeekTemplateShift {
  return {
    id: "wts1",
    day_of_week: 1,
    employee_id: "emp-1",
    position_id: null,
    title: null,
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 0,
    location: null,
    notes: null,
    ...over,
  };
}

function shift(over: Partial<PlanningShift>): PlanningShift {
  return {
    id: "s1",
    merchant_id: "m1",
    week_id: "w1",
    employee_id: "emp-1",
    shift_date: "2026-06-01",
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 0,
    position: null,
    notes: null,
    status: "draft",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...over,
  };
}

function leave(over: Partial<PlanningLeaveRequest>): PlanningLeaveRequest {
  return {
    id: "lv1",
    merchant_id: "m1",
    employee_id: "emp-1",
    leave_type: "paid",
    start_date: "2026-06-01",
    end_date: "2026-06-05",
    status: "approved",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...over,
  };
}

// Standard ctx fixture: lundi 2026-06-01.
const POSITIONS = [pos("pos-1", "Manager"), pos("pos-2", "Serveur")];
const EMPLOYEES = [
  emp({ id: "emp-1", first_name: "Alice", last_name: "Martin" }),
  emp({ id: "emp-2", first_name: "Bob", last_name: "Dupont" }),
];

const employeeById = new Map(EMPLOYEES.map((e) => [e.id, e]));
const positionIdByLabel = new Map(POSITIONS.map((p) => [p.label.toLowerCase(), p.id]));

// ─── projectDayOfWeekToDate ──────────────────────────────────────────────────

describe("projectDayOfWeekToDate (semaine cible 2026-06-01 = lundi)", () => {
  it("lundi (1) → lundi", () => {
    expect(projectDayOfWeekToDate("2026-06-01", 1)).toBe("2026-06-01");
  });
  it("mardi (2) → mardi", () => {
    expect(projectDayOfWeekToDate("2026-06-01", 2)).toBe("2026-06-02");
  });
  it("samedi (6) → samedi", () => {
    expect(projectDayOfWeekToDate("2026-06-01", 6)).toBe("2026-06-06");
  });
  it("dimanche (0) → dimanche (fin de semaine, +6 jours)", () => {
    expect(projectDayOfWeekToDate("2026-06-01", 0)).toBe("2026-06-07");
  });
});

// ─── Filets de sécurité ──────────────────────────────────────────────────────

describe("isOnApprovedLeave / isContractEnded", () => {
  it("ne compte que les congés APPROUVÉS", () => {
    const leaves = [leave({ status: "pending" })];
    expect(isOnApprovedLeave("emp-1", "2026-06-03", leaves)).toBe(false);
  });
  it("inclus les bornes start/end", () => {
    const leaves = [leave({ start_date: "2026-06-01", end_date: "2026-06-03" })];
    expect(isOnApprovedLeave("emp-1", "2026-06-01", leaves)).toBe(true);
    expect(isOnApprovedLeave("emp-1", "2026-06-03", leaves)).toBe(true);
    expect(isOnApprovedLeave("emp-1", "2026-06-04", leaves)).toBe(false);
  });
  it("contrat terminé strictement avant la date", () => {
    const e = emp({ id: "x", first_name: "X", last_name: "Y", contract_end_date: "2026-05-31" });
    expect(isContractEnded(e, "2026-06-01")).toBe(true);
    expect(isContractEnded(e, "2026-05-31")).toBe(false);
  });
  it("undefined / pas de date → false", () => {
    expect(isContractEnded(undefined, "2026-06-01")).toBe(false);
  });
});

// ─── classifyTemplateShift — les 3 modes + filets ────────────────────────────

describe("classifyTemplateShift — modes de conflit", () => {
  const baseCtx = {
    target_week_start: "2026-06-01",
    date: "2026-06-01",
    leaves: [] as PlanningLeaveRequest[],
    employeeById,
    positionIdByLabel,
  };

  it("besoin (employee_id=null) → create_unassigned('need')", () => {
    const t = tShift({ employee_id: null });
    const c = classifyTemplateShift(t, {
      ...baseCtx,
      existingShifts: [],
      conflict_mode: "keep_existing",
    });
    expect(c.action).toEqual({ kind: "create_unassigned", reason: "need" });
    expect(c.conflict).toBeNull();
  });

  it("idempotence : shift identique présent → skip_idempotent (avant tout)", () => {
    const existing = [shift({ id: "ex-1", shift_date: "2026-06-01", start_time: "09:00", end_time: "17:00" })];
    const t = tShift({ start_time: "09:00", end_time: "17:00" });
    const c = classifyTemplateShift(t, {
      ...baseCtx,
      existingShifts: existing,
      conflict_mode: "replace",
    });
    expect(c.action).toEqual({ kind: "skip_idempotent", existing_shift_id: "ex-1" });
  });

  it("overlap + keep_existing → skip_overlap + conflit signalé", () => {
    const existing = [shift({ id: "ex-1", start_time: "10:00", end_time: "12:00" })];
    const t = tShift({ start_time: "09:00", end_time: "17:00" });
    const c = classifyTemplateShift(t, {
      ...baseCtx,
      existingShifts: existing,
      conflict_mode: "keep_existing",
    });
    expect(c.action).toEqual({ kind: "skip_overlap", existing_shift_id: "ex-1" });
    expect(c.conflict?.reason).toBe("overlap");
    expect(c.conflict?.existing_shift_id).toBe("ex-1");
  });

  it("overlap + replace → action replace (existing supprimé puis recréé)", () => {
    const existing = [shift({ id: "ex-1", start_time: "10:00", end_time: "12:00" })];
    const t = tShift({ start_time: "09:00", end_time: "17:00" });
    const c = classifyTemplateShift(t, {
      ...baseCtx,
      existingShifts: existing,
      conflict_mode: "replace",
    });
    expect(c.action).toEqual({ kind: "replace", existing_shift_id: "ex-1", employee_id: "emp-1" });
    expect(c.conflict?.reason).toBe("overlap");
  });

  it("overlap + template_to_unassigned → create_unassigned('overlap_to_unassigned'), existant intact", () => {
    const existing = [shift({ id: "ex-1", start_time: "10:00", end_time: "12:00" })];
    const t = tShift({ start_time: "09:00", end_time: "17:00" });
    const c = classifyTemplateShift(t, {
      ...baseCtx,
      existingShifts: existing,
      conflict_mode: "template_to_unassigned",
    });
    expect(c.action).toEqual({ kind: "create_unassigned", reason: "overlap_to_unassigned" });
    expect(c.conflict?.reason).toBe("overlap");
  });
});

describe("classifyTemplateShift — filets de sécurité (priorité sur le mode)", () => {
  const baseCtx = {
    target_week_start: "2026-06-01",
    date: "2026-06-01",
    employeeById,
    positionIdByLabel,
  };

  it("on_leave : non-assigné QUEL QUE SOIT le mode", () => {
    const leaves = [leave({ employee_id: "emp-1", start_date: "2026-06-01", end_date: "2026-06-05" })];
    const t = tShift({ employee_id: "emp-1", start_time: "09:00", end_time: "17:00" });

    for (const mode of ["keep_existing", "replace", "template_to_unassigned"] as const) {
      const c = classifyTemplateShift(t, {
        ...baseCtx,
        existingShifts: [],
        leaves,
        conflict_mode: mode,
      });
      expect(c.action).toEqual({ kind: "create_unassigned", reason: "on_leave" });
      expect(c.conflict?.reason).toBe("on_leave");
      expect(c.conflict?.existing_shift_id).toBeNull();
    }
  });

  it("contract_ended : non-assigné QUEL QUE SOIT le mode", () => {
    const employees = [
      emp({ id: "emp-1", first_name: "Alice", last_name: "X", contract_end_date: "2026-05-31" }),
    ];
    const idx = new Map(employees.map((e) => [e.id, e]));
    const t = tShift({ employee_id: "emp-1" });

    for (const mode of ["keep_existing", "replace", "template_to_unassigned"] as const) {
      const c = classifyTemplateShift(t, {
        ...baseCtx,
        employeeById: idx,
        existingShifts: [],
        leaves: [],
        conflict_mode: mode,
      });
      expect(c.action).toEqual({ kind: "create_unassigned", reason: "contract_ended" });
      expect(c.conflict?.reason).toBe("contract_ended");
    }
  });
});
