import { describe, expect, it } from "vitest";
import { alignChanges, alignableEntries, distributeChanges } from "../align";
import type { Location } from "../types";

const table = (id: string, x: number, y: number, overrides: Partial<Location> = {}): Location => ({
  location_id: id,
  location_name: `Table ${id}`,
  seats: 2,
  floor_id: "1",
  shape: "square",
  angle: 0,
  x,
  y,
  width: 80,
  height: 80,
  enabled: true,
  attributes: null,
  ...overrides,
});

const patches = (changes: ReturnType<typeof alignChanges>) =>
  Object.fromEntries(changes.map((c) => [c.ref.id, c.patch]));

describe("alignChanges", () => {
  const entries = alignableEntries([table("a", 100, 100), table("b", 300, 250), table("c", 220, 400, { width: 120 })], []);

  it("aligne à gauche sur le bord le plus à gauche", () => {
    expect(patches(alignChanges(entries, "left"))).toEqual({
      a: { x: 100, y: 100 },
      b: { x: 100, y: 250 },
      c: { x: 100, y: 400 },
    });
  });

  it("aligne à droite sur le bord le plus à droite (tables de largeurs différentes)", () => {
    // bord droit max : b = 380, c = 340 → 380
    const result = patches(alignChanges(entries, "right"));
    expect(result.b).toEqual({ x: 300, y: 250 });
    expect(result.c).toEqual({ x: 260, y: 400 }); // 260 + 120 = 380
    expect(result.a).toEqual({ x: 300, y: 100 }); // 300 + 80 = 380
  });

  it("centre horizontalement", () => {
    const result = patches(alignChanges(entries, "center"));
    const centers = Object.entries(result).map(([id, p]) => {
      const t = [table("a", 100, 100), table("b", 300, 250), table("c", 220, 400, { width: 120 })].find((x) => x.location_id === id)!;
      return (p as { x: number }).x + t.width / 2;
    });
    expect(new Set(centers.map((c) => Math.round(c))).size).toBe(1);
  });

  it("aligne en haut et en bas", () => {
    expect(Object.values(patches(alignChanges(entries, "top"))).map((p) => (p as { y: number }).y)).toEqual([100, 100, 100]);
    // bord bas max : c = 400 + 80 = 480 → chaque table de 80 de haut est posée en y = 400
    expect(Object.values(patches(alignChanges(entries, "bottom"))).map((p) => (p as { y: number }).y)).toEqual([400, 400, 400]);
  });

  it("ne fait rien avec moins de deux éléments", () => {
    expect(alignChanges(alignableEntries([table("a", 10, 10)], []), "left")).toEqual([]);
  });
});

describe("distributeChanges", () => {
  it("répartit à intervalles égaux, sans bouger le premier ni le dernier", () => {
    const entries = alignableEntries([table("a", 100, 100), table("b", 150, 100), table("c", 500, 100)], []);
    const result = patches(distributeChanges(entries, "horizontal"));

    // espace libre : 580 - 100 - 240 = 240 → 2 intervalles de 120 → b à x=100+80+120 = 300
    expect(Object.keys(result)).toEqual(["b"]);
    expect(result.b).toEqual({ x: 300, y: 100 });
  });

  it("répartit verticalement", () => {
    const entries = alignableEntries([table("a", 100, 100), table("b", 100, 120), table("c", 100, 500)], []);
    expect(patches(distributeChanges(entries, "vertical")).b).toEqual({ x: 100, y: 300 });
  });

  it("exige au moins trois éléments", () => {
    expect(distributeChanges(alignableEntries([table("a", 0, 0), table("b", 200, 0)], []), "horizontal")).toEqual([]);
  });
});
