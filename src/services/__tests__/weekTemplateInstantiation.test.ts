/**
 * Tests de la PROJECTION pure (`weekTemplateProjection`) + des méthodes
 * `previewWeekTemplate` / `instantiateWeekTemplate` du service.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  classifyTemplateShift,
  projectDayOfWeekToDate,
  isContractEnded,
  isOnApprovedLeave,
} from "@/lib/weekTemplateProjection";
import {
  WeekTemplateService,
  previewWeekTemplate,
  instantiateWeekTemplate,
  type InstantiationApiBridge,
  type InstantiationContext,
} from "@/services/weekTemplateService";
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

function makeCtx(over: Partial<InstantiationContext> = {}): InstantiationContext {
  return {
    existingShiftsByWeekStart: new Map(),
    leaves: [],
    employees: EMPLOYEES,
    positions: POSITIONS,
    ...over,
  };
}

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

// ─── preview / instantiate via le service ────────────────────────────────────

describe("previewWeekTemplate / instantiateWeekTemplate", () => {
  let tmplId: string;

  beforeEach(async () => {
    WeekTemplateService.__resetForTests();
    const created = await WeekTemplateService.create({
      label: "T1",
      shifts: [
        // lundi 09–13 emp-1 (Manager)
        { day_of_week: 1, employee_id: "emp-1", position_id: "pos-1", title: null, start_time: "09:00", end_time: "13:00", break_minutes: 0, location: null, notes: null },
        // mardi 18–23 BESOIN (emp_id=null)
        { day_of_week: 2, employee_id: null,    position_id: "pos-2", title: null, start_time: "18:00", end_time: "23:00", break_minutes: 0, location: null, notes: null },
        // dimanche 10–14 emp-2
        { day_of_week: 0, employee_id: "emp-2", position_id: "pos-1", title: null, start_time: "10:00", end_time: "14:00", break_minutes: 0, location: null, notes: null },
      ],
    });
    tmplId = created.week_template.id;
  });

  it("preview multi-semaines : agrège compteurs sur 3 semaines, déduplique & trie", () => {
    const ctx = makeCtx();
    const p = previewWeekTemplate(
      tmplId,
      ["2026-06-15", "2026-06-01", "2026-06-08", "2026-06-01"], // doublon + désordre
      ctx,
    );
    expect(p.target_week_starts).toEqual(["2026-06-01", "2026-06-08", "2026-06-15"]);
    // 3 shifts × 3 semaines = 9 shifts à créer (aucun conflit).
    expect(p.to_create_count).toBe(9);
    expect(p.conflicts).toHaveLength(0);
    expect(p.impacted_employee_count).toBe(0);
    expect(p.auto_unassigned_count).toBe(0);
    expect(p.idempotent_skipped_count).toBe(0);
  });

  it("impacted_employee_count distinct (30 conflits / 1 employé ⇒ 1)", () => {
    // 3 semaines, congé qui couvre tout le mois sur emp-1 → 3 shifts auto-unassigned (1 par semaine).
    const ctx = makeCtx({
      leaves: [leave({ employee_id: "emp-1", start_date: "2026-06-01", end_date: "2026-06-30" })],
    });
    const p = previewWeekTemplate(
      tmplId,
      ["2026-06-01", "2026-06-08", "2026-06-15"],
      ctx,
    );
    expect(p.auto_unassigned_count).toBe(3); // 1 shift emp-1 × 3 semaines
    expect(p.impacted_employee_count).toBe(1); // un seul employé impacté
    expect(p.conflicts.every((c) => c.reason === "on_leave")).toBe(true);
  });

  it("idempotence : un shift identique préexistant → skipped, pas de conflit", () => {
    const existing = [
      shift({
        id: "pre-1",
        shift_date: "2026-06-01", // lundi
        employee_id: "emp-1",
        start_time: "09:00",
        end_time: "13:00",
        position: "Manager",
      }),
    ];
    const ctx = makeCtx({
      existingShiftsByWeekStart: new Map([["2026-06-01", existing]]),
    });
    const p = previewWeekTemplate(tmplId, ["2026-06-01"], ctx);
    expect(p.idempotent_skipped_count).toBe(1);
    expect(p.to_create_count).toBe(2); // les 2 autres
    expect(p.conflicts).toHaveLength(0);
  });

  it("instantiate keep_existing : un overlap NON identique ⇒ skip + existant intact", async () => {
    const existing = [
      // chevauche 09–13 sur lundi 06-01 mais horaires différents → pas idempotent
      shift({ id: "pre-1", shift_date: "2026-06-01", employee_id: "emp-1", start_time: "10:00", end_time: "12:00" }),
    ];
    const ctx = makeCtx({ existingShiftsByWeekStart: new Map([["2026-06-01", existing]]) });

    const create = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockResolvedValue(undefined);
    const api: InstantiationApiBridge = {
      ensureWeekIdForStart: async () => "wk-1",
      createShift: create,
      deleteShift: del,
    };

    const r = await instantiateWeekTemplate(tmplId, ["2026-06-01"], "keep_existing", ctx, api);
    expect(del).not.toHaveBeenCalled();
    // 2 shifts créés (mardi besoin + dimanche emp-2), lundi skipped pour overlap.
    expect(r.created_count).toBe(2);
    expect(r.skipped_count).toBe(1);
    expect(r.replaced_count).toBe(0);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("instantiate replace : overlap ⇒ delete + create assigné", async () => {
    const existing = [
      shift({ id: "pre-1", shift_date: "2026-06-01", employee_id: "emp-1", start_time: "10:00", end_time: "12:00" }),
    ];
    const ctx = makeCtx({ existingShiftsByWeekStart: new Map([["2026-06-01", existing]]) });

    const create = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockResolvedValue(undefined);
    const api: InstantiationApiBridge = {
      ensureWeekIdForStart: async () => "wk-1",
      createShift: create,
      deleteShift: del,
    };

    const r = await instantiateWeekTemplate(tmplId, ["2026-06-01"], "replace", ctx, api);
    expect(del).toHaveBeenCalledWith("pre-1");
    expect(r.replaced_count).toBe(1);
    expect(r.created_count).toBe(3); // 3 shifts du template tous créés
    expect(r.assigned_count).toBe(2); // emp-1 lundi + emp-2 dimanche
    expect(r.unassigned_count).toBe(1); // besoin mardi
  });

  it("instantiate template_to_unassigned : overlap ⇒ template en non-assigné, existant intact", async () => {
    const existing = [
      shift({ id: "pre-1", shift_date: "2026-06-01", employee_id: "emp-1", start_time: "10:00", end_time: "12:00" }),
    ];
    const ctx = makeCtx({ existingShiftsByWeekStart: new Map([["2026-06-01", existing]]) });

    const create = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockResolvedValue(undefined);
    const api: InstantiationApiBridge = {
      ensureWeekIdForStart: async () => "wk-1",
      createShift: create,
      deleteShift: del,
    };

    const r = await instantiateWeekTemplate(tmplId, ["2026-06-01"], "template_to_unassigned", ctx, api);
    expect(del).not.toHaveBeenCalled();
    // 3 shifts créés ; le lundi part en non-assigné, mardi reste besoin, dimanche assigné.
    expect(r.created_count).toBe(3);
    expect(r.unassigned_count).toBe(2);
    expect(r.assigned_count).toBe(1);
    // Le shift lundi (avec emp-1) doit avoir été envoyé avec employee_id=null.
    const lundiCall = create.mock.calls.find(([, p]) => (p as { shift_date: string }).shift_date === "2026-06-01");
    expect(lundiCall).toBeDefined();
    expect((lundiCall![1] as { employee_id: string | null }).employee_id).toBeNull();
  });

  it("instantiate on_leave : non-assigné dans le résultat même en mode replace", async () => {
    const ctx = makeCtx({
      leaves: [leave({ employee_id: "emp-1", start_date: "2026-06-01", end_date: "2026-06-07" })],
    });

    const create = vi.fn().mockResolvedValue(undefined);
    const api: InstantiationApiBridge = {
      ensureWeekIdForStart: async () => "wk-1",
      createShift: create,
      deleteShift: vi.fn(),
    };

    const r = await instantiateWeekTemplate(tmplId, ["2026-06-01"], "replace", ctx, api);
    // lundi emp-1 forcé en non-assigné par on_leave (le mode replace ne s'applique PAS).
    const lundiCall = create.mock.calls.find(([, p]) => (p as { shift_date: string }).shift_date === "2026-06-01");
    expect((lundiCall![1] as { employee_id: string | null }).employee_id).toBeNull();
    expect(r.unassigned_count).toBeGreaterThanOrEqual(2); // besoin mardi + lundi forcé
  });
});
