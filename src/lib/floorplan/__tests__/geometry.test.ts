import { describe, expect, it } from "vitest";
import {
  clampCenter,
  clampTablePosition,
  constrainAngle,
  findDuplicateTableNames,
  findOverlappingTables,
  itemsInRect,
  normalizeAngle,
  obstacleBounds,
  rotatedBounds,
  snapToWall,
  tableBounds,
  tablesOverlap,
  wallSegmentsFromPoints,
} from "../geometry";
import type { Location, Obstacle, PlanContent } from "../types";

const table = (overrides: Partial<Location> = {}): Location => ({
  location_id: "t1",
  location_name: "Table 1",
  seats: 2,
  floor_id: "1",
  shape: "square",
  angle: 0,
  x: 100,
  y: 100,
  width: 80,
  height: 80,
  enabled: true,
  attributes: null,
  ...overrides,
});

const wall = (overrides: Partial<Obstacle> = {}): Obstacle => ({
  id: "w1",
  floorId: "1",
  type: "wall",
  x: 500,
  y: 100,
  width: 400,
  height: 12,
  angle: 0,
  ...overrides,
});

describe("normalizeAngle", () => {
  it("ramène dans [0, 360[", () => {
    expect(normalizeAngle(-10)).toBe(350);
    expect(normalizeAngle(370)).toBe(10);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(720)).toBe(0);
  });

  it("ne renvoie jamais 360 après arrondi (l'API refuse > 359)", () => {
    expect(normalizeAngle(359.96)).toBe(0);
    expect(normalizeAngle(359.94)).toBe(359.9);
  });
});

describe("rotatedBounds / clamp", () => {
  it("échange largeur et hauteur à 90°", () => {
    const box = rotatedBounds(500, 500, 100, 20, 90);
    expect(box.width).toBeCloseTo(20);
    expect(box.height).toBeCloseTo(100);
    expect(box.x).toBeCloseTo(490);
  });

  it("recale une table tournée dans le canvas en tenant compte de son emprise réelle", () => {
    // 200×40 tournée à 90° occupe 40×200 : son centre ne peut pas être à moins de 100 du bord haut.
    const { x, y } = clampTablePosition(400, -50, 200, 40, 90);
    const box = tableBounds(table({ x, y, width: 200, height: 40, angle: 90 }));
    expect(box.y).toBeGreaterThanOrEqual(-0.001);
    expect(box.y + box.height).toBeLessThanOrEqual(1000.001);
  });

  it("centre un élément plus grand que le canvas", () => {
    expect(clampCenter(10, 10, 1200, 20, 0)).toEqual({ x: 500, y: 10 });
  });
});

describe("tablesOverlap", () => {
  it("détecte deux carrés qui se recouvrent", () => {
    expect(tablesOverlap(table(), table({ location_id: "t2", x: 150 }))).toBe(true);
  });

  it("ne compte pas deux tables qui se touchent seulement par un bord", () => {
    expect(tablesOverlap(table(), table({ location_id: "t2", x: 180 }))).toBe(false);
  });

  it("deux tables rondes proches en diagonale ne se chevauchent pas, bien que leurs carrés englobants le fassent", () => {
    const a = table({ shape: "circle" });
    const b = table({ location_id: "t2", shape: "circle", x: 170, y: 170 });
    expect(tablesOverlap(a, b)).toBe(false);
    expect(tablesOverlap(a, { ...b, x: 150, y: 150 })).toBe(true);
  });

  it("prend en compte la rotation : un rectangle tourné à 45° ne touche pas un voisin que son rectangle englobant toucherait", () => {
    // Rectangle 200×40 centré en (500, 500), tourné à 45° (diagonale ↘).
    const rotated = table({ shape: "rectangle", width: 200, height: 40, angle: 45, x: 400, y: 480 });
    // Carré dans le coin haut-droit de son emprise, là où la diagonale est vide.
    const neighbour = table({ location_id: "t2", x: 530, y: 390 });

    // Les emprises (AABB) se recouvrent...
    expect(rotatedBounds(500, 500, 200, 40, 45).x + rotatedBounds(500, 500, 200, 40, 45).width).toBeGreaterThan(530);
    // ...mais pas les rectangles réels.
    expect(tablesOverlap(rotated, neighbour)).toBe(false);
    // Un carré posé sur le centre du rectangle le recouvre bien.
    expect(tablesOverlap(rotated, { ...neighbour, x: 470, y: 470 })).toBe(true);
  });
});

describe("findOverlappingTables / findDuplicateTableNames", () => {
  it("signale les deux tables concernées, pas celles d'un autre étage", () => {
    const tables = [
      table(),
      table({ location_id: "t2", x: 140 }),
      table({ location_id: "t3", x: 140, floor_id: "2" }),
      table({ location_id: "t4", x: 600 }),
    ];
    expect([...findOverlappingTables(tables)].sort()).toEqual(["t1", "t2"]);
  });

  it("repère les noms en double sans tenir compte de la casse ni des espaces", () => {
    const tables = [
      table({ location_id: "a", location_name: "Table 1" }),
      table({ location_id: "b", location_name: " table 1 " }),
      table({ location_id: "c", location_name: "Table 2" }),
      table({ location_id: "d", location_name: "" }),
      table({ location_id: "e", location_name: " " }),
    ];
    expect([...findDuplicateTableNames(tables)].sort()).toEqual(["a", "b"]);
  });
});

describe("wallSegmentsFromPoints", () => {
  it("renvoie un mur centré avec la bonne longueur et le bon angle", () => {
    const [segment] = wallSegmentsFromPoints({ x: 100, y: 100 }, { x: 300, y: 100 }, 12);
    expect(segment).toEqual({ x: 200, y: 100, width: 200, height: 12, angle: 0 });
  });

  it("normalise un angle négatif (l'API n'accepte que 0-359)", () => {
    const [segment] = wallSegmentsFromPoints({ x: 100, y: 200 }, { x: 100, y: 100 }, 12);
    expect(segment.angle).toBe(270);
  });

  it("ignore un segment trop court pour être un mur", () => {
    expect(wallSegmentsFromPoints({ x: 10, y: 10 }, { x: 15, y: 10 }, 12)).toEqual([]);
  });

  it("découpe une diagonale de coin à coin (1414) en tronçons valides pour l'API", () => {
    const segments = wallSegmentsFromPoints({ x: 0, y: 0 }, { x: 1000, y: 1000 }, 12);
    expect(segments.length).toBe(2);
    segments.forEach((s) => {
      expect(s.width).toBeLessThanOrEqual(1000);
      expect(s.angle).toBe(45);
    });
    const total = segments.reduce((sum, s) => sum + s.width, 0);
    expect(total).toBeCloseTo(Math.hypot(1000, 1000), 0);
  });
});

describe("constrainAngle", () => {
  it("aligne un tracé presque horizontal sur l'horizontale en gardant la longueur", () => {
    const b = constrainAngle({ x: 0, y: 0 }, { x: 100, y: 8 });
    expect(b.y).toBeCloseTo(0, 5);
    expect(b.x).toBeCloseTo(Math.hypot(100, 8), 5);
  });

  it("aligne sur 45°", () => {
    const b = constrainAngle({ x: 0, y: 0 }, { x: 100, y: 90 });
    expect(b.x).toBeCloseTo(b.y, 5);
  });
});

describe("snapToWall", () => {
  const walls = [wall()]; // horizontal de x=300 à x=700, y=100, épaisseur 12

  it("projette un point proche sur l'axe du mur et reprend son angle et son épaisseur", () => {
    expect(snapToWall({ x: 450, y: 112 }, walls)).toEqual({
      x: 450,
      y: 100,
      angle: 0,
      thickness: 12,
      wallId: "w1",
    });
  });

  it("renvoie null si aucun mur n'est assez proche", () => {
    expect(snapToWall({ x: 450, y: 200 }, walls)).toBeNull();
  });

  it("ignore les obstacles qui ne sont pas des murs", () => {
    expect(snapToWall({ x: 450, y: 100 }, [wall({ type: "bar" })])).toBeNull();
  });

  it("garde une porte entièrement sur le mur, même posée tout près de son extrémité", () => {
    // Le mur va de x=300 à x=700 : une porte de 80 de long ne peut pas être centrée avant x=340.
    const snapped = snapToWall({ x: 310, y: 100 }, walls, { halfLength: 40 });
    expect(snapped?.x).toBe(340);
    expect(snapped?.y).toBe(100);
  });

  it("n'accroche pas une porte lointaine, même si le recalage l'aurait rapprochée du mur", () => {
    // 60 unités après le bout du mur : trop loin, quelle que soit la marge.
    expect(snapToWall({ x: 240, y: 100 }, walls, { halfLength: 40 })).toBeNull();
  });

  it("choisit le mur le plus proche et suit son orientation", () => {
    const vertical = wall({ id: "w2", x: 100, y: 500, width: 300, height: 10, angle: 90 });
    const snapped = snapToWall({ x: 108, y: 480 }, [...walls, vertical]);
    expect(snapped).toMatchObject({ wallId: "w2", angle: 90, thickness: 10, x: 100, y: 480 });
  });
});

describe("itemsInRect", () => {
  const content: PlanContent = {
    floors: [{ id: "1", name: "Salle", enabled: true }],
    locations: [table(), table({ location_id: "t2", x: 700, y: 700 }), table({ location_id: "t3", floor_id: "2" })],
    obstacles: [wall({ x: 150, y: 150, width: 60, height: 12 })],
    areas: [],
  };

  it("sélectionne les tables et obstacles de l'étage qui touchent le rectangle", () => {
    const refs = itemsInRect({ x: 0, y: 0, width: 300, height: 300 }, content, "1");
    expect(refs).toEqual([
      { kind: "table", id: "t1" },
      { kind: "obstacle", id: "w1" },
    ]);
  });

  it("utilise l'emprise réelle d'un obstacle tourné", () => {
    expect(obstacleBounds(wall({ x: 500, y: 500, width: 100, height: 10, angle: 90 })).height).toBeCloseTo(100);
  });
});
