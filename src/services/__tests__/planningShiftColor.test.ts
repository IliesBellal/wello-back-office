/**
 * Tests du helper `resolveShiftColor` + index map.
 *
 * Vitest-style (sert de spec exécutable).
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHIFT_COLOR,
  buildPositionColorIndex,
  colorFromIndex,
  resolveShiftColor,
} from "@/lib/planningShiftColor";
import type { EmployeePosition, PlanningShift } from "@/types/planning";

function pos(over: Partial<EmployeePosition> & Pick<EmployeePosition, "id" | "label" | "color">): EmployeePosition {
  return {
    id: over.id,
    merchant_id: "m1",
    label: over.label,
    color: over.color,
    sort_order: 0,
    active: true,
    employee_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function shift(over: Partial<PlanningShift>): PlanningShift {
  return {
    id: "s1",
    merchant_id: "m1",
    week_id: "w1",
    employee_id: "e1",
    title: null,
    shift_date: "2026-06-01",
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 0,
    position_id: null,
    position: null,
    color: null,
    status: "scheduled",
    notes: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...over,
  } as PlanningShift;
}

const POSITIONS = [
  pos({ id: "pos-1", label: "Manager", color: "#3b82f6" }),
  pos({ id: "pos-2", label: "Serveur", color: "#10b981" }),
];

describe("resolveShiftColor", () => {
  it("retourne la couleur du poste via position_id", () => {
    const s = shift({ position_id: "pos-2", position: "Serveur" });
    expect(resolveShiftColor(s, POSITIONS)).toBe("#10b981");
  });

  it("fallback sur le label si position_id absent", () => {
    const s = shift({ position_id: null, position: "manager" }); // case-insensitive
    expect(resolveShiftColor(s, POSITIONS)).toBe("#3b82f6");
  });

  it("shift sans poste résoluble → couleur par défaut", () => {
    const s = shift({ position_id: null, position: null });
    expect(resolveShiftColor(s, POSITIONS)).toBe(DEFAULT_SHIFT_COLOR);
  });

  it("shift NON ASSIGNÉ garde la couleur de SON poste (pas de surcharge)", () => {
    // employee_id null + position_id renseigné → couleur du poste, identique
    // à un shift assigné sur le même poste.
    const unassigned = shift({ employee_id: null, position_id: "pos-1", position: "Manager" });
    const assigned = shift({ employee_id: "e1", position_id: "pos-1", position: "Manager" });
    expect(resolveShiftColor(unassigned, POSITIONS)).toBe(resolveShiftColor(assigned, POSITIONS));
    expect(resolveShiftColor(unassigned, POSITIONS)).toBe("#3b82f6");
  });

  it("position_id introuvable → tente le label puis défaut", () => {
    const sLabelHit = shift({ position_id: "pos-999", position: "Serveur" });
    expect(resolveShiftColor(sLabelHit, POSITIONS)).toBe("#10b981");

    const sNoHit = shift({ position_id: "pos-999", position: "Inconnu" });
    expect(resolveShiftColor(sNoHit, POSITIONS)).toBe(DEFAULT_SHIFT_COLOR);
  });
});

describe("buildPositionColorIndex + colorFromIndex", () => {
  it("indexe par id ET par label lowercase", () => {
    const idx = buildPositionColorIndex(POSITIONS);
    expect(idx.get("pos-1")).toBe("#3b82f6");
    expect(idx.get("__label__serveur")).toBe("#10b981");
  });

  it("colorFromIndex donne le même résultat que resolveShiftColor", () => {
    const idx = buildPositionColorIndex(POSITIONS);
    const cases = [
      shift({ position_id: "pos-1", position: "Manager" }),
      shift({ position_id: null, position: "Serveur" }),
      shift({ position_id: null, position: null }),
      shift({ employee_id: null, position_id: "pos-2", position: "Serveur" }),
    ];
    for (const c of cases) {
      expect(colorFromIndex(c, idx)).toBe(resolveShiftColor(c, POSITIONS));
    }
  });
});
