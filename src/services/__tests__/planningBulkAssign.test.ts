/**
 * Tests des helpers d'assignation en masse (Planning).
 *
 * Vitest-style (pas exécuté tant que vitest n'est pas installé) — sert de
 * spec exécutable pour les invariants côté UI.
 */

import { describe, expect, it } from "vitest";

import {
  findOverlap,
  partitionForBulkAssign,
  shiftsOfRowInRange,
  timesOverlap,
} from "@/lib/planningOverlap";
import type { PlanningShift } from "@/types/planning";

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeShift(over: Partial<PlanningShift> & Pick<PlanningShift, "id">): PlanningShift {
  return {
    id: over.id,
    merchant_id: "m1",
    week_id: "w1",
    employee_id: over.employee_id ?? null,
    title: null,
    shift_date: over.shift_date ?? "2026-06-01",
    start_time: over.start_time ?? "09:00",
    end_time: over.end_time ?? "17:00",
    break_minutes: 0,
    position: null,
    color: null,
    status: "scheduled",
    notes: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...over,
  } as PlanningShift;
}

// ─── timesOverlap ──────────────────────────────────────────────────────────

describe("timesOverlap", () => {
  it("se chevauchent", () => {
    expect(timesOverlap("09:00", "12:00", "11:00", "13:00")).toBe(true);
  });
  it("touches not overlap (end === start)", () => {
    expect(timesOverlap("09:00", "12:00", "12:00", "15:00")).toBe(false);
  });
  it("disjoints", () => {
    expect(timesOverlap("09:00", "12:00", "13:00", "15:00")).toBe(false);
  });
});

// ─── findOverlap ───────────────────────────────────────────────────────────

describe("findOverlap", () => {
  const base = [
    makeShift({ id: "a", employee_id: "e1", shift_date: "2026-06-01", start_time: "09:00", end_time: "12:00" }),
    makeShift({ id: "b", employee_id: "e2", shift_date: "2026-06-01", start_time: "09:00", end_time: "12:00" }),
  ];

  it("aucun conflit pour un employé non concerné", () => {
    expect(findOverlap(base, "e3", "2026-06-01", "09:00", "12:00")).toBeNull();
  });
  it("aucun conflit si employee_id null (besoin, jamais en conflit personnel)", () => {
    expect(findOverlap(base, null, "2026-06-01", "09:00", "12:00")).toBeNull();
  });
  it("détecte le conflit pour le bon employé", () => {
    expect(findOverlap(base, "e1", "2026-06-01", "11:00", "13:00")?.id).toBe("a");
  });
  it("ignore l'id passé en ignoreShiftId (cas update)", () => {
    expect(findOverlap(base, "e1", "2026-06-01", "11:00", "13:00", "a")).toBeNull();
  });
});

// ─── shiftsOfRowInRange ────────────────────────────────────────────────────

describe("shiftsOfRowInRange", () => {
  const all = [
    makeShift({ id: "1", employee_id: "e1", shift_date: "2026-06-01" }),
    makeShift({ id: "2", employee_id: "e1", shift_date: "2026-06-03" }),
    makeShift({ id: "3", employee_id: "e1", shift_date: "2026-06-08" }), // hors fenêtre
    makeShift({ id: "4", employee_id: "e2", shift_date: "2026-06-02" }), // autre employé
    makeShift({ id: "5", employee_id: null, shift_date: "2026-06-02" }), // unassigned
  ];

  it("filtre par employee_id et fenêtre [from, to]", () => {
    const got = shiftsOfRowInRange(all, "e1", "2026-06-01", "2026-06-07").map((s) => s.id);
    expect(got).toEqual(["1", "2"]);
  });

  it("retourne les non assignés quand sourceEmployeeId = null", () => {
    const got = shiftsOfRowInRange(all, null, "2026-06-01", "2026-06-07").map((s) => s.id);
    expect(got).toEqual(["5"]);
  });

  it("retourne [] si aucun shift dans la fenêtre", () => {
    expect(shiftsOfRowInRange(all, "e1", "2026-07-01", "2026-07-07")).toEqual([]);
  });
});

// ─── partitionForBulkAssign ────────────────────────────────────────────────

describe("partitionForBulkAssign", () => {
  it("cas 0 conflit : tout est assignable", () => {
    const toMove = [
      makeShift({ id: "1", employee_id: null, shift_date: "2026-06-01", start_time: "09:00", end_time: "12:00" }),
      makeShift({ id: "2", employee_id: null, shift_date: "2026-06-02", start_time: "09:00", end_time: "12:00" }),
    ];
    const all = [...toMove];
    const { assignable, conflicting } = partitionForBulkAssign(toMove, all, "e1");
    expect(assignable.map((s) => s.id)).toEqual(["1", "2"]);
    expect(conflicting).toEqual([]);
  });

  it("cas partiel : un seul chevauche", () => {
    const conflictingExisting = makeShift({
      id: "blocker",
      employee_id: "e1",
      shift_date: "2026-06-02",
      start_time: "10:00",
      end_time: "14:00",
    });
    const toMove = [
      makeShift({ id: "1", employee_id: null, shift_date: "2026-06-01", start_time: "09:00", end_time: "12:00" }),
      makeShift({ id: "2", employee_id: null, shift_date: "2026-06-02", start_time: "09:00", end_time: "12:00" }),
    ];
    const all = [...toMove, conflictingExisting];
    const { assignable, conflicting } = partitionForBulkAssign(toMove, all, "e1");
    expect(assignable.map((s) => s.id)).toEqual(["1"]);
    expect(conflicting.map((s) => s.id)).toEqual(["2"]);
  });

  it("cas 100% conflit : rien d'assignable", () => {
    const existing = [
      makeShift({ id: "x", employee_id: "e1", shift_date: "2026-06-01", start_time: "08:00", end_time: "18:00" }),
      makeShift({ id: "y", employee_id: "e1", shift_date: "2026-06-02", start_time: "08:00", end_time: "18:00" }),
    ];
    const toMove = [
      makeShift({ id: "1", employee_id: null, shift_date: "2026-06-01", start_time: "09:00", end_time: "12:00" }),
      makeShift({ id: "2", employee_id: null, shift_date: "2026-06-02", start_time: "09:00", end_time: "12:00" }),
    ];
    const all = [...toMove, ...existing];
    const { assignable, conflicting } = partitionForBulkAssign(toMove, all, "e1");
    expect(assignable).toEqual([]);
    expect(conflicting.map((s) => s.id)).toEqual(["1", "2"]);
  });

  it("ne se compare pas à soi-même (transfert employé → employé)", () => {
    // Les shifts qu'on déplace ne doivent pas être vus comme des conflits
    // contre eux-mêmes (sinon transfert intra-mêmes plages échouerait).
    const toMove = [
      makeShift({ id: "1", employee_id: "e1", shift_date: "2026-06-01", start_time: "09:00", end_time: "12:00" }),
    ];
    const all = [...toMove];
    const { assignable, conflicting } = partitionForBulkAssign(toMove, all, "e2");
    expect(assignable.map((s) => s.id)).toEqual(["1"]);
    expect(conflicting).toEqual([]);
  });

  it("transfert employé→employé et assignation nonAssigné→employé donnent la même partition", () => {
    const blocker = makeShift({
      id: "x",
      employee_id: "e2",
      shift_date: "2026-06-02",
      start_time: "10:00",
      end_time: "14:00",
    });
    const baseShifts = [
      makeShift({ id: "1", shift_date: "2026-06-01", start_time: "09:00", end_time: "12:00" }),
      makeShift({ id: "2", shift_date: "2026-06-02", start_time: "09:00", end_time: "12:00" }),
    ];

    // Variante A : depuis unassigned
    const fromUnassigned = baseShifts.map((s) => ({ ...s, employee_id: null as string | null }));
    const partA = partitionForBulkAssign(fromUnassigned, [...fromUnassigned, blocker], "e2");

    // Variante B : depuis e1
    const fromE1 = baseShifts.map((s) => ({ ...s, employee_id: "e1" as string | null }));
    const partB = partitionForBulkAssign(fromE1, [...fromE1, blocker], "e2");

    expect(partA.assignable.map((s) => s.id)).toEqual(partB.assignable.map((s) => s.id));
    expect(partA.conflicting.map((s) => s.id)).toEqual(partB.conflicting.map((s) => s.id));
  });
});
