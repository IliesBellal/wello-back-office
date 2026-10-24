import { describe, expect, it } from "vitest";

import {
  dayOfWeekFromIsoDate,
  shiftToTemplateInput,
} from "@/services/weekTemplateService";
import type { EmployeePosition, PlanningShift } from "@/types/planning";

const POSITIONS: Pick<EmployeePosition, "id" | "label">[] = [
  { id: "pos-1", label: "Manager" },
  { id: "pos-2", label: "Serveur" },
];

function shift(over: Partial<PlanningShift>): PlanningShift {
  return {
    id: "s1",
    merchant_id: "m1",
    week_id: "w1",
    employee_id: "emp-1",
    shift_date: "2026-06-01", // lundi
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 30,
    position: "Manager",
    notes: null,
    status: "draft",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...over,
  };
}

describe("dayOfWeekFromIsoDate (0 = dimanche)", () => {
  it("dimanche → 0", () => {
    // 2026-05-31 est un dimanche.
    expect(dayOfWeekFromIsoDate("2026-05-31")).toBe(0);
  });
  it("lundi → 1, samedi → 6", () => {
    expect(dayOfWeekFromIsoDate("2026-06-01")).toBe(1);
    expect(dayOfWeekFromIsoDate("2026-06-06")).toBe(6);
  });
});

describe("shiftToTemplateInput", () => {
  it("mappe shift_date → day_of_week, conserve employee_id ET résout position_id via le label", () => {
    const s = shift({ shift_date: "2026-06-02", employee_id: "emp-42", position: "Manager" });
    const input = shiftToTemplateInput(s, POSITIONS);
    expect(input.day_of_week).toBe(2); // mardi
    expect(input.employee_id).toBe("emp-42"); // ⚠️ PRÉSERVÉ
    expect(input.position_id).toBe("pos-1");
    expect(input.start_time).toBe("09:00");
    expect(input.break_minutes).toBe(30);
  });

  it("shift non assigné (employee_id null) reste non assigné dans le template", () => {
    const s = shift({ employee_id: null, position: "Serveur" });
    const input = shiftToTemplateInput(s, POSITIONS);
    expect(input.employee_id).toBeNull();
    expect(input.position_id).toBe("pos-2");
  });

  it("position introuvable → position_id null (fallback safe)", () => {
    const s = shift({ position: "Inconnu" });
    expect(shiftToTemplateInput(s, POSITIONS).position_id).toBeNull();
  });

  it("dimanche source → day_of_week === 0 (vérifie la convention)", () => {
    const s = shift({ shift_date: "2026-05-31" });
    expect(shiftToTemplateInput(s, POSITIONS).day_of_week).toBe(0);
  });
});
