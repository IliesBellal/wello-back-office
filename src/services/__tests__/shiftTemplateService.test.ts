/**
 * Unit tests for `applyTemplateToShiftForm`.
 * Vitest-style; run with `npx vitest run` once vitest is installed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";

import { applyTemplateToShiftForm } from "../shiftTemplateService";

const positions = [
  { id: "pos_bar", label: "Bar" },
  { id: "pos_salle", label: "Salle" },
];

const baseTemplate = {
  start_time: "11:00",
  end_time: "15:00",
  break_minutes: 30,
  position_id: "pos_bar",
};

describe("applyTemplateToShiftForm", () => {
  it("fills an empty form with the template values", () => {
    const empty = {
      employee_id: "",
      shift_date: "2026-05-31",
      start_time: "09:00",
      end_time: "17:00",
      break_minutes: 0,
      position_id: "",
      notes: "",
    };
    const next = applyTemplateToShiftForm(empty, baseTemplate, positions);
    expect(next.start_time).toBe("11:00");
    expect(next.end_time).toBe("15:00");
    expect(next.break_minutes).toBe(30);
    expect(next.position_id).toBe("pos_bar");
  });

  it("overrides template-bearing fields on a partially filled form, keeps the rest", () => {
    const partial = {
      employee_id: "emp_123",
      shift_date: "2026-05-31",
      start_time: "08:00",
      end_time: "12:00",
      break_minutes: 0,
      position_id: "pos_salle",
      notes: "Mes notes",
      title: "Custom title",
    };
    const next = applyTemplateToShiftForm(partial, baseTemplate, positions);
    // Overridden:
    expect(next.start_time).toBe("11:00");
    expect(next.end_time).toBe("15:00");
    expect(next.break_minutes).toBe(30);
    expect(next.position_id).toBe("pos_bar");
    // Untouched:
    expect(next.employee_id).toBe("emp_123");
    expect(next.shift_date).toBe("2026-05-31");
    expect((next as any).notes).toBe("Mes notes");
    expect((next as any).title).toBe("Custom title");
  });

  it("clears the position id when template.position_id is null", () => {
    const form = {
      employee_id: "emp_1",
      shift_date: "2026-05-31",
      start_time: "08:00",
      end_time: "12:00",
      break_minutes: 0,
      position_id: "pos_salle", // already set
    };
    const next = applyTemplateToShiftForm(form, { ...baseTemplate, position_id: null }, positions);
    expect(next.position_id).toBe("");
    // other fields intact
    expect(next.employee_id).toBe("emp_1");
    expect(next.shift_date).toBe("2026-05-31");
  });

  it("clears position id safely when template.position_id is unknown to the positions list", () => {
    const form = {
      employee_id: "emp_1",
      shift_date: "2026-05-31",
      start_time: "08:00",
      end_time: "12:00",
      break_minutes: 0,
      position_id: "pos_salle",
    };
    const next = applyTemplateToShiftForm(form, { ...baseTemplate, position_id: "pos_unknown" }, positions);
    expect(next.position_id).toBe("");
  });

  it("does not mutate the input form (returns a new object)", () => {
    const form = {
      employee_id: "emp_1",
      shift_date: "2026-05-31",
      start_time: "08:00",
      end_time: "12:00",
      break_minutes: 0,
      position_id: "",
    };
    const snapshot = { ...form };
    applyTemplateToShiftForm(form, baseTemplate, positions);
    expect(form).toEqual(snapshot);
  });
});
