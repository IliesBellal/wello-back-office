import { describe, expect, it } from "vitest";
import { DEFAULT_SEATS, findFreeSpot, nextTableName, type Rect } from "../floorPlanLayout";

describe("nextTableName", () => {
  it("commence à Table 1 sur un plan vide", () => {
    expect(nextTableName([])).toBe("Table 1");
  });

  it("prend le plus grand numéro + 1, même après une suppression intermédiaire", () => {
    expect(nextTableName(["Table 1", "Table 3"])).toBe("Table 4");
  });

  it("ignore les noms libres et la casse / les espaces", () => {
    expect(nextTableName(["Terrasse 4", "VIP", " table 2 "])).toBe("Table 3");
  });
});

describe("findFreeSpot", () => {
  it("renvoie un point aligné sur la grille de 20", () => {
    const { x, y } = findFreeSpot([], 80, 80);
    expect(x % 20).toBe(0);
    expect(y % 20).toBe(0);
  });

  it("ne superpose jamais deux tables posées à la suite", () => {
    const placed: Rect[] = [];
    for (let i = 0; i < 12; i++) {
      const { x, y } = findFreeSpot(placed, 80, 80);
      const candidate = { x, y, width: 80, height: 80 };
      const collides = placed.some(
        (o) => x < o.x + o.width && x + 80 > o.x && y < o.y + o.height && y + 80 > o.y
      );
      expect(collides).toBe(false);
      placed.push(candidate);
    }
    expect(new Set(placed.map((p) => `${p.x},${p.y}`)).size).toBe(12);
  });

  it("reste dans les limites du canvas 1000×1000", () => {
    const placed: Rect[] = [];
    for (let i = 0; i < 40; i++) {
      const { x, y } = findFreeSpot(placed, 120, 80);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + 120).toBeLessThanOrEqual(1000);
      expect(y + 80).toBeLessThanOrEqual(1000);
      placed.push({ x, y, width: 120, height: 80 });
    }
  });

  it("retombe sur le centre quand le plan est plein au lieu de refuser", () => {
    const full: Rect[] = [{ x: 0, y: 0, width: 1000, height: 1000 }];
    expect(findFreeSpot(full, 80, 80)).toEqual({ x: 460, y: 460 });
  });
});

describe("DEFAULT_SEATS", () => {
  it("vaut 2 places par défaut", () => {
    expect(DEFAULT_SEATS).toBe(2);
  });
});
