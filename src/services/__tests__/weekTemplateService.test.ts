import { beforeEach, describe, expect, it } from "vitest";

import {
  WeekTemplateService,
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
    title: null,
    shift_date: "2026-06-01", // lundi
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 30,
    position: "Manager",
    location: null,
    notes: null,
    status: "draft",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  WeekTemplateService.__resetForTests();
});

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

describe("WeekTemplateService CRUD", () => {
  it("create → list → get round-trip ; shift_count dérivé", async () => {
    const created = await WeekTemplateService.create({
      label: "Semaine type été",
      notes: "Forte affluence",
      shifts: [
        {
          day_of_week: 1,
          employee_id: "emp-1",
          position_id: "pos-1",
          title: null,
          start_time: "09:00",
          end_time: "17:00",
          break_minutes: 30,
          location: null,
          notes: null,
        },
        {
          day_of_week: 2,
          employee_id: null, // besoin à pourvoir
          position_id: "pos-2",
          title: null,
          start_time: "18:00",
          end_time: "23:00",
          break_minutes: 0,
          location: null,
          notes: null,
        },
      ],
    });

    expect(created.week_template.shift_count).toBe(2);
    expect(created.week_template_shifts).toHaveLength(2);
    expect(created.week_template_shifts[0].id).toMatch(/^wts_/);

    const list = await WeekTemplateService.list();
    expect(list).toHaveLength(1);
    expect(list[0].shift_count).toBe(2); // ⚠️ dérivé, jamais matérialisé

    const got = await WeekTemplateService.get(created.week_template.id);
    expect(got.week_template_shifts).toHaveLength(2);
  });

  it("update peut remplacer les shifts intégralement et recalcule shift_count", async () => {
    const created = await WeekTemplateService.create({
      label: "Tmpl",
      shifts: [
        { day_of_week: 1, employee_id: "e1", position_id: null, title: null, start_time: "09:00", end_time: "17:00", break_minutes: 0, location: null, notes: null },
      ],
    });
    const updated = await WeekTemplateService.update(created.week_template.id, {
      label: "Tmpl modifié",
      shifts: [
        { day_of_week: 2, employee_id: null, position_id: null, title: null, start_time: "10:00", end_time: "14:00", break_minutes: 0, location: null, notes: null },
        { day_of_week: 3, employee_id: null, position_id: null, title: null, start_time: "10:00", end_time: "14:00", break_minutes: 0, location: null, notes: null },
      ],
    });
    expect(updated.week_template.label).toBe("Tmpl modifié");
    expect(updated.week_template.shift_count).toBe(2);
    expect(updated.week_template_shifts).toHaveLength(2);
  });

  it("remove fait une suppression LOGIQUE (active=false)", async () => {
    const created = await WeekTemplateService.create({ label: "X", shifts: [] });
    await WeekTemplateService.remove(created.week_template.id);
    const list = await WeekTemplateService.list();
    expect(list).toHaveLength(1);
    expect(list[0].active).toBe(false);
  });

  it("createFromWeek conserve employee_id ET position_id pour chaque shift", async () => {
    const sourceShifts: PlanningShift[] = [
      shift({ id: "s-a", shift_date: "2026-06-01", employee_id: "emp-1", position: "Manager" }),
      shift({ id: "s-b", shift_date: "2026-06-02", employee_id: null, position: "Serveur" }),
      shift({ id: "s-c", shift_date: "2026-05-31", employee_id: "emp-2", position: null }),
    ];

    const out = await WeekTemplateService.createFromWeek(
      { week_id: "w-current", label: "Semaine type — copie du 1er juin" },
      sourceShifts,
      POSITIONS,
    );

    expect(out.week_template.label).toBe("Semaine type — copie du 1er juin");
    expect(out.week_template_shifts).toHaveLength(3);

    const [a, b, c] = out.week_template_shifts;

    // a) employee_id assigné → préservé, position résolue, lundi
    expect(a.employee_id).toBe("emp-1");
    expect(a.position_id).toBe("pos-1");
    expect(a.day_of_week).toBe(1);

    // b) non assigné → null (PAS de remplacement par un employé fantôme)
    expect(b.employee_id).toBeNull();
    expect(b.position_id).toBe("pos-2");
    expect(b.day_of_week).toBe(2);

    // c) dimanche, sans position
    expect(c.employee_id).toBe("emp-2");
    expect(c.position_id).toBeNull();
    expect(c.day_of_week).toBe(0);

    // shift_count cohérent
    expect(out.week_template.shift_count).toBe(3);
  });

  it("un template peut mixer shifts nominatifs (employee_id non null) ET besoins (null)", async () => {
    const created = await WeekTemplateService.create({
      label: "Mix",
      shifts: [
        { day_of_week: 1, employee_id: "emp-1", position_id: "pos-1", title: null, start_time: "09:00", end_time: "13:00", break_minutes: 0, location: null, notes: null },
        { day_of_week: 1, employee_id: null,    position_id: "pos-2", title: null, start_time: "14:00", end_time: "18:00", break_minutes: 0, location: null, notes: null },
      ],
    });
    const assigned = created.week_template_shifts.filter((s) => s.employee_id !== null);
    const needs = created.week_template_shifts.filter((s) => s.employee_id === null);
    expect(assigned).toHaveLength(1);
    expect(needs).toHaveLength(1);
  });

  it("get sur id inconnu rejette", async () => {
    await expect(WeekTemplateService.get("nope")).rejects.toThrow(/introuvable/);
  });
});
