import { describe, expect, it } from "vitest";
import { placeObstacleAt, placeTableAt, placeWallPoint } from "../tools";
import { clampView, fitView, toScreen, toVirtual, viewCenter, zoomAt, MAX_SCALE, MIN_SCALE } from "../viewport";
import { createInitialState, planReducer } from "../reducer";
import type { Obstacle } from "../types";

describe("placeTableAt", () => {
  it("centre la table sous le curseur et cale le coin sur la grille", () => {
    // curseur en (250, 250), table 80×80 → coin visé (210, 210) → grille 20 → (220, 220)
    expect(placeTableAt({ x: 250, y: 250 }, 80, 80)).toEqual({ x: 220, y: 220 });
  });

  it("garde la table dans le plan quand le curseur est au bord", () => {
    expect(placeTableAt({ x: 5, y: 5 }, 80, 80)).toEqual({ x: 0, y: 0 });
    expect(placeTableAt({ x: 1000, y: 1000 }, 80, 80)).toEqual({ x: 920, y: 920 });
  });
});

describe("placeObstacleAt", () => {
  const wall: Obstacle = { id: "w", floorId: "1", type: "wall", x: 500, y: 100, width: 400, height: 14, angle: 0 };

  it("accroche une porte au mur proche : position, angle et épaisseur du mur", () => {
    expect(placeObstacleAt({ x: 480, y: 110 }, "door", [wall])).toEqual({
      x: 480,
      y: 100,
      width: 80,
      height: 14,
      angle: 0,
      snappedToWall: true,
    });
  });

  it("pose la porte librement quand aucun mur n'est proche", () => {
    expect(placeObstacleAt({ x: 480, y: 400 }, "door", [wall])).toMatchObject({
      x: 480,
      y: 400,
      height: 12,
      angle: 0,
      snappedToWall: false,
    });
  });

  it("n'accroche jamais une plante ni un pilier, même collés au mur", () => {
    expect(placeObstacleAt({ x: 480, y: 102 }, "plant", [wall]).snappedToWall).toBe(false);
    expect(placeObstacleAt({ x: 480, y: 102 }, "pillar", [wall]).snappedToWall).toBe(false);
  });

  it("garde l'obstacle dans le plan", () => {
    const placed = placeObstacleAt({ x: 5, y: 995 }, "plant", []);
    expect(placed.x).toBe(20);
    expect(placed.y).toBe(980);
  });
});

describe("placeWallPoint", () => {
  it("cale sur la grille", () => {
    expect(placeWallPoint({ x: 113, y: 487 }, null, false)).toEqual({ x: 120, y: 480 });
  });

  it("avec Maj, aligne sur un multiple de 15° depuis le point de départ", () => {
    const point = placeWallPoint({ x: 300, y: 110 }, { x: 100, y: 100 }, true);
    expect(point.y).toBeCloseTo(100, 0);
    expect(point.x).toBeGreaterThan(290);
  });

  it("reste dans le plan", () => {
    expect(placeWallPoint({ x: -50, y: 2000 }, null, false)).toEqual({ x: 0, y: 1000 });
  });
});

describe("viewport", () => {
  it("ajuste le plan entier au conteneur, centré", () => {
    const view = fitView(1000, 600);
    expect(view.scale).toBeCloseTo((600 - 48) / 1000);
    expect(view.x).toBeCloseTo((1000 - 1000 * view.scale) / 2);
    expect(view.y).toBeCloseTo((600 - 1000 * view.scale) / 2);
  });

  it("zoome autour du curseur : le point visé ne bouge pas à l'écran", () => {
    const view = { scale: 0.6, x: 100, y: 50 };
    const pointer = { x: 400, y: 300 };
    const before = toVirtual(view, pointer);
    const zoomed = zoomAt(view, pointer, 1.5);
    const after = toVirtual(zoomed, pointer);

    expect(zoomed.scale).toBeCloseTo(0.9);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("borne le zoom", () => {
    expect(zoomAt({ scale: 3.9, x: 0, y: 0 }, { x: 0, y: 0 }, 10).scale).toBe(MAX_SCALE);
    expect(zoomAt({ scale: 0.11, x: 0, y: 0 }, { x: 0, y: 0 }, 0.01).scale).toBe(MIN_SCALE);
  });

  it("empêche de perdre le plan hors de l'écran", () => {
    const lost = clampView({ scale: 1, x: -5000, y: 9000 }, 800, 600);
    expect(lost.x).toBeGreaterThan(-1000);
    expect(lost.y).toBeLessThan(600);
  });

  it("convertit écran ↔ virtuel dans les deux sens", () => {
    const view = { scale: 0.75, x: 40, y: 20 };
    const p = { x: 321, y: 654 };
    expect(toVirtual(view, toScreen(view, p))).toEqual({ x: 321, y: 654 });
  });

  it("donne le centre visible en unités virtuelles", () => {
    const view = fitView(1000, 600);
    const center = viewCenter(view, 1000, 600);
    expect(center.x).toBeCloseTo(500);
    expect(center.y).toBeCloseTo(500);
  });
});

describe("addObstacles (tronçons d'un mur)", () => {
  it("ajoute plusieurs obstacles en une seule annulation et les sélectionne", () => {
    let state = planReducer(createInitialState(), {
      type: "load",
      snapshot: { revision: 0, floors: [{ id: "1", name: "S", enabled: true }], locations: [], obstacles: [], areas: [] },
    });
    state = planReducer(state, {
      type: "addObstacles",
      specs: [
        { floorId: "1", type: "wall", x: 200, y: 100, width: 200, height: 12, angle: 0 },
        { floorId: "1", type: "wall", x: 400, y: 200, width: 200, height: 12, angle: 90 },
      ],
    });

    expect(state.present.obstacles).toHaveLength(2);
    expect(new Set(state.present.obstacles.map((o) => o.id)).size).toBe(2);
    expect(state.selection).toHaveLength(2);
    expect(planReducer(state, { type: "undo" }).present.obstacles).toHaveLength(0);
  });
});
