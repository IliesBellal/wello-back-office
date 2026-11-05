import { describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  createInitialState,
  planReducer,
  selectionToClip,
  type PlanAction,
  type PlanState,
} from "../reducer";
import { findOverlappingTables } from "../geometry";
import type { Location, Obstacle, PlanContent } from "../types";

const table = (overrides: Partial<Location> = {}): Location => ({
  location_id: "10",
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

const loaded = (overrides: Partial<PlanContent> = {}, revision = 5): PlanState =>
  planReducer(createInitialState(), {
    type: "load",
    snapshot: {
      revision,
      floors: [
        { id: "1", name: "Salle", enabled: true },
        { id: "2", name: "Terrasse", enabled: true },
      ],
      locations: [],
      obstacles: [],
      areas: [],
      ...overrides,
    },
  });

const run = (state: PlanState, ...actions: PlanAction[]): PlanState => actions.reduce(planReducer, state);

describe("load", () => {
  it("active le premier étage, vide l'historique et mémorise la révision", () => {
    const state = loaded();
    expect(state.activeFloorId).toBe("1");
    expect(state.revision).toBe(5);
    expect(canUndo(state)).toBe(false);
    expect(state.present).toBe(state.base);
  });

  it("conserve l'étage demandé s'il existe encore, sinon retombe sur le premier", () => {
    const snapshot = { revision: 1, floors: [{ id: "2", name: "T", enabled: true }], locations: [], obstacles: [], areas: [] };
    expect(planReducer(createInitialState(), { type: "load", snapshot, keepFloorId: "2" }).activeFloorId).toBe("2");
    expect(planReducer(createInitialState(), { type: "load", snapshot, keepFloorId: "9" }).activeFloorId).toBe("2");
  });
});

describe("étages", () => {
  it("un étage ajouté apparaît tout de suite dans la liste et devient l'étage actif", () => {
    const state = run(loaded(), { type: "addFloor", name: "  Mezzanine " });

    expect(state.present.floors.map((f) => f.name)).toEqual(["Salle", "Terrasse", "Mezzanine"]);
    expect(state.activeFloorId).toBe(state.present.floors[2].id);
    expect(state.activeFloorId?.startsWith("tmp_")).toBe(true);
  });

  it("ignore un nom vide", () => {
    const before = loaded();
    expect(planReducer(before, { type: "addFloor", name: "   " })).toBe(before);
  });

  it("annuler l'ajout retire l'étage et restaure l'étage actif précédent", () => {
    const state = run(loaded(), { type: "addFloor", name: "Mezzanine" }, { type: "undo" });
    expect(state.present.floors).toHaveLength(2);
    expect(state.activeFloorId).toBe("1");
  });

  it("supprimer un étage supprime son contenu et bascule sur un autre étage", () => {
    const state = run(
      loaded({
        locations: [table(), table({ location_id: "11", floor_id: "2" })],
        obstacles: [{ id: "o1", floorId: "1", type: "wall", x: 300, y: 300, width: 100, height: 12, angle: 0 }],
      }),
      { type: "selectFloor", floorId: "1" },
      { type: "deleteFloor", floorId: "1" }
    );

    expect(state.present.floors.map((f) => f.id)).toEqual(["2"]);
    expect(state.present.locations.map((l) => l.location_id)).toEqual(["11"]);
    expect(state.present.obstacles).toEqual([]);
    expect(state.activeFloorId).toBe("2");
  });

  it("renommer en tapant lettre par lettre ne crée qu'une entrée d'historique", () => {
    let state = loaded();
    for (const name of ["S", "Sa", "Sal", "Salle 2"]) {
      state = planReducer(state, { type: "renameFloor", floorId: "1", name });
    }
    expect(state.past).toHaveLength(1);
    expect(planReducer(state, { type: "undo" }).present.floors[0].name).toBe("Salle");
  });
});

describe("ajout de tables", () => {
  it("pose une table à 2 places sur l'étage choisi, nommée Table 1, et la sélectionne", () => {
    const state = run(loaded(), { type: "addTables", spec: { floorId: "2", shape: "circle" } });
    const [created] = state.present.locations;

    expect(created).toMatchObject({
      location_name: "Table 1",
      seats: 2,
      floor_id: "2",
      shape: "circle",
      width: 80,
      height: 80,
      enabled: true,
    });
    expect(Number.isNaN(created.seats)).toBe(false);
    expect(created.location_id.startsWith("tmp_")).toBe(true);
    expect(state.selection).toEqual([{ kind: "table", id: created.location_id }]);
  });

  it("permet d'en créer plusieurs à la suite : ids, noms et positions distincts, sans chevauchement", () => {
    let state = loaded();
    for (let i = 0; i < 8; i++) {
      state = planReducer(state, { type: "addTables", spec: { floorId: "1", shape: "square" } });
    }
    const tables = state.present.locations;

    expect(new Set(tables.map((t) => t.location_id)).size).toBe(8);
    expect(tables.map((t) => t.location_name)).toEqual(
      Array.from({ length: 8 }, (_, i) => `Table ${i + 1}`)
    );
    expect(new Set(tables.map((t) => `${t.x},${t.y}`)).size).toBe(8);
    expect(findOverlappingTables(tables).size).toBe(0);
    // la dernière table créée est la sélection : le formulaire se réinitialise sur elle
    expect(state.selection).toEqual([{ kind: "table", id: tables[7].location_id }]);
  });

  it("numérote après le plus grand numéro existant, tous étages confondus", () => {
    const state = run(
      loaded({ locations: [table({ location_name: "Table 7" }), table({ location_id: "11", location_name: "Bar" })] }),
      { type: "addTables", spec: { floorId: "1", shape: "square" } }
    );
    expect(state.present.locations[2].location_name).toBe("Table 8");
  });

  it("crée une série en une seule entrée d'historique", () => {
    let state = run(loaded(), { type: "addTables", spec: { floorId: "1", shape: "square", seats: 4 }, count: 6 });

    expect(state.present.locations).toHaveLength(6);
    expect(state.present.locations.every((t) => t.seats === 4)).toBe(true);
    expect(state.selection).toHaveLength(6);
    expect(findOverlappingTables(state.present.locations).size).toBe(0);

    state = planReducer(state, { type: "undo" });
    expect(state.present.locations).toHaveLength(0);
  });

  it("pose la table à la position cliquée, calée sur la grille et maintenue dans le plan", () => {
    const placed = run(loaded(), { type: "addTables", spec: { floorId: "1", shape: "square", x: 213, y: 487 } });
    expect(placed.present.locations[0]).toMatchObject({ x: 220, y: 480 });

    const outside = run(loaded(), { type: "addTables", spec: { floorId: "1", shape: "square", x: 995, y: -30 } });
    expect(outside.present.locations[0]).toMatchObject({ x: 920, y: 0 });
  });

  it("refuse un étage inconnu", () => {
    const before = loaded();
    expect(planReducer(before, { type: "addTables", spec: { floorId: "404", shape: "square" } })).toBe(before);
  });
});

describe("modification", () => {
  const withTable = () => loaded({ locations: [table()] });
  const move = (patch: Partial<Location>, coalesceKey?: string): PlanAction => ({
    type: "update",
    changes: [{ ref: { kind: "table", id: "10" }, patch }],
    coalesceKey,
  });

  it("garde la table dans le plan", () => {
    const state = run(withTable(), move({ x: 5000, y: -200 }));
    expect(state.present.locations[0]).toMatchObject({ x: 920, y: 0 });
  });

  it("borne le nombre de places entre 1 et 20 et arrondit", () => {
    expect(run(withTable(), move({ seats: 0 })).present.locations[0].seats).toBe(1);
    expect(run(withTable(), move({ seats: 99 })).present.locations[0].seats).toBe(20);
    expect(run(withTable(), move({ seats: 3.6 })).present.locations[0].seats).toBe(4);
  });

  it("ignore les valeurs numériques invalides au lieu de produire des NaN", () => {
    const state = run(withTable(), move({ seats: Number.NaN, x: Number.NaN, width: Infinity }));
    expect(state.present.locations[0]).toMatchObject({ seats: 2, x: 100, width: 80 });
  });

  it("normalise l'angle dans [0, 360[", () => {
    expect(run(withTable(), move({ angle: 370 })).present.locations[0].angle).toBe(10);
    expect(run(withTable(), move({ angle: -90 })).present.locations[0].angle).toBe(270);
  });

  it("borne les dimensions (40-300) et recale la table si elle sort du plan", () => {
    const state = run(withTable(), move({ x: 900, width: 9999 }));
    expect(state.present.locations[0]).toMatchObject({ width: 300, x: 700 });
  });

  it("ne crée aucune entrée d'historique quand rien ne change (dépôt au même endroit)", () => {
    const before = withTable();
    const after = planReducer(before, move({ x: 100, y: 100 }));
    expect(after).toBe(before);
  });

  it("fusionne les modifications successives d'une même clé en une annulation", () => {
    let state = withTable();
    for (const name of ["T", "Ta", "Tab"]) state = planReducer(state, move({ location_name: name }, "name:10"));
    expect(state.past).toHaveLength(1);

    state = planReducer(state, move({ seats: 4 })); // autre action : nouvelle entrée
    state = planReducer(state, move({ location_name: "Tabl" }, "name:10")); // clé identique mais interrompue
    expect(state.past).toHaveLength(3);
  });

  it("déplace plusieurs éléments en une seule annulation", () => {
    const state = run(
      loaded({ locations: [table(), table({ location_id: "11", x: 300 })] }),
      {
        type: "update",
        changes: [
          { ref: { kind: "table", id: "10" }, patch: { x: 140 } },
          { ref: { kind: "table", id: "11" }, patch: { x: 340 } },
        ],
      }
    );
    expect(state.present.locations.map((l) => l.x)).toEqual([140, 340]);
    expect(planReducer(state, { type: "undo" }).present.locations.map((l) => l.x)).toEqual([100, 300]);
  });

  it("déplace une table vers un autre étage", () => {
    const state = run(withTable(), move({ floor_id: "2" }));
    expect(state.present.locations[0].floor_id).toBe("2");
  });
});

describe("obstacles", () => {
  it("pose chaque obstacle avec les dimensions de son catalogue", () => {
    let state = loaded();
    state = run(
      state,
      { type: "addObstacle", spec: { floorId: "1", type: "plant", x: 200, y: 200 } },
      { type: "addObstacle", spec: { floorId: "1", type: "door", x: 300, y: 300 } },
      { type: "addObstacle", spec: { floorId: "1", type: "stairs", x: 400, y: 400 } }
    );
    const [plant, door, stairs] = state.present.obstacles;

    expect(plant).toMatchObject({ type: "plant", width: 40, height: 40, x: 200, y: 200 });
    expect(door).toMatchObject({ type: "door", width: 80, height: 12, direction: 90 });
    expect(stairs).toMatchObject({ type: "stairs", width: 80, height: 120 });
    expect("direction" in plant).toBe(false);
  });

  it("garde un mur tracé à l'angle donné dans les limites du plan", () => {
    const state = run(loaded(), {
      type: "addObstacle",
      spec: { floorId: "1", type: "wall", x: 995, y: 995, width: 300, height: 12, angle: 0 },
    });
    expect(state.present.obstacles[0].x).toBe(850);
  });

  it("retire `direction` quand un obstacle cesse d'être une porte", () => {
    let state = run(loaded(), { type: "addObstacle", spec: { floorId: "1", type: "door" } });
    const id = state.present.obstacles[0].id;
    state = planReducer(state, {
      type: "update",
      changes: [{ ref: { kind: "obstacle", id }, patch: { type: "window" } as Partial<Obstacle> }],
    });
    expect("direction" in state.present.obstacles[0]).toBe(false);
  });

  it("refuse un étage inconnu", () => {
    const before = loaded();
    expect(planReducer(before, { type: "addObstacle", spec: { floorId: "404", type: "wall" } })).toBe(before);
  });
});

describe("sélection", () => {
  const base = () => loaded({ locations: [table(), table({ location_id: "11", x: 300 })] });
  const ref = (id: string) => ({ kind: "table" as const, id });

  it("remplace, ajoute et bascule", () => {
    let state = planReducer(base(), { type: "select", refs: [ref("10")] });
    expect(state.selection).toEqual([ref("10")]);

    state = planReducer(state, { type: "select", refs: [ref("11")], mode: "add" });
    expect(state.selection).toEqual([ref("10"), ref("11")]);

    state = planReducer(state, { type: "select", refs: [ref("10")], mode: "toggle" });
    expect(state.selection).toEqual([ref("11")]);
  });

  it("ignore les références à des éléments inexistants", () => {
    expect(planReducer(base(), { type: "select", refs: [ref("404")] }).selection).toEqual([]);
  });

  it("changer d'étage vide la sélection", () => {
    const state = run(base(), { type: "select", refs: [ref("10")] }, { type: "selectFloor", floorId: "2" });
    expect(state.selection).toEqual([]);
    expect(state.activeFloorId).toBe("2");
  });
});

describe("suppression", () => {
  it("supprime et se retire de la sélection ; l'annulation restaure", () => {
    let state = run(loaded({ locations: [table()] }), { type: "select", refs: [{ kind: "table", id: "10" }] });
    state = planReducer(state, { type: "delete", refs: state.selection });

    expect(state.present.locations).toEqual([]);
    expect(state.selection).toEqual([]);
    expect(planReducer(state, { type: "undo" }).present.locations).toHaveLength(1);
  });

  it("ne fait rien pour une référence inconnue", () => {
    const before = loaded();
    expect(planReducer(before, { type: "delete", refs: [{ kind: "table", id: "404" }] })).toBe(before);
  });
});

describe("duplication et collage", () => {
  const withBooked = () =>
    loaded({
      locations: [
        table({
          location_name: "Table 1",
          seats: 4,
          attributes: { pmr: true, terrace: false, vip: false, window: false },
          open_order_id: "order-1",
          booking: { bookingId: "b", bookingNumber: "R", partySize: 2, startsAt: "", customerName: "X" },
        }),
      ],
    });

  it("duplique en décalant, avec de nouveaux ids et noms, et sélectionne les copies", () => {
    const state = run(withBooked(), { type: "duplicate", refs: [{ kind: "table", id: "10" }] });
    const [original, copy] = state.present.locations;

    expect(copy.location_id).not.toBe(original.location_id);
    expect(copy.location_id.startsWith("tmp_")).toBe(true);
    expect(copy).toMatchObject({ location_name: "Table 2", seats: 4, x: 120, y: 120, floor_id: "1" });
    expect(copy.attributes).toEqual(original.attributes);
    expect(copy.attributes).not.toBe(original.attributes);
    expect(state.selection).toEqual([{ kind: "table", id: copy.location_id }]);
  });

  it("ne recopie ni la commande ouverte ni la réservation (état de service, pas de plan)", () => {
    const [, copy] = run(withBooked(), { type: "duplicate", refs: [{ kind: "table", id: "10" }] }).present.locations;
    expect(copy.open_order_id).toBeUndefined();
    expect(copy.booking).toBeUndefined();
  });

  it("colle sur un autre étage", () => {
    let state = withBooked();
    state = planReducer(state, { type: "select", refs: [{ kind: "table", id: "10" }] });
    const clip = selectionToClip(state);
    state = planReducer(state, { type: "paste", clip, floorId: "2", offset: 0 });

    expect(state.present.locations[1]).toMatchObject({ floor_id: "2", x: 100, y: 100 });
  });

  it("duplique obstacles et zones avec le même décalage", () => {
    const state = run(
      loaded({
        obstacles: [{ id: "o1", floorId: "1", type: "bar", x: 300, y: 300, width: 200, height: 50, angle: 0 }],
        areas: [
          {
            id: "a1",
            floorId: "1",
            name: "Coin",
            strokeColor: "#000000",
            color: "#ffffff",
            x: 0,
            y: 0,
            angle: 0,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
            ],
          },
        ],
      }),
      {
        type: "duplicate",
        refs: [
          { kind: "obstacle", id: "o1" },
          { kind: "area", id: "a1" },
        ],
      }
    );

    expect(state.present.obstacles[1]).toMatchObject({ type: "bar", x: 320, y: 320 });
    expect(state.present.areas[1].points[2]).toEqual({ x: 120, y: 120 });
    expect(state.selection).toHaveLength(2);
  });
});

describe("annuler / rétablir", () => {
  it("rejoue l'historique dans les deux sens", () => {
    let state = run(
      loaded(),
      { type: "addTables", spec: { floorId: "1", shape: "square" } },
      { type: "addTables", spec: { floorId: "1", shape: "square" } }
    );
    expect(state.present.locations).toHaveLength(2);

    state = planReducer(state, { type: "undo" });
    expect(state.present.locations).toHaveLength(1);
    expect(canRedo(state)).toBe(true);

    state = planReducer(state, { type: "redo" });
    expect(state.present.locations).toHaveLength(2);
    expect(canRedo(state)).toBe(false);
  });

  it("une nouvelle action après une annulation efface la branche rétablissable", () => {
    let state = run(loaded(), { type: "addTables", spec: { floorId: "1", shape: "square" } }, { type: "undo" });
    state = planReducer(state, { type: "addFloor", name: "X" });
    expect(canRedo(state)).toBe(false);
  });

  it("retire de la sélection ce qui n'existe plus après annulation", () => {
    const state = run(loaded(), { type: "addTables", spec: { floorId: "1", shape: "square" } }, { type: "undo" });
    expect(state.selection).toEqual([]);
  });

  it("ne fait rien quand il n'y a rien à annuler ou rétablir", () => {
    const before = loaded();
    expect(planReducer(before, { type: "undo" })).toBe(before);
    expect(planReducer(before, { type: "redo" })).toBe(before);
  });

  it("limite l'historique", () => {
    let state = loaded();
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      state = planReducer(state, { type: "addFloor", name: `Étage ${i}` });
    }
    expect(state.past).toHaveLength(HISTORY_LIMIT);
  });

  it("« abandonner les modifications » revient au plan publié et vide l'historique", () => {
    const state = run(
      loaded({ locations: [table()] }),
      { type: "addTables", spec: { floorId: "1", shape: "square" } },
      { type: "deleteFloor", floorId: "2" },
      { type: "discard" }
    );

    expect(state.present).toBe(state.base);
    expect(state.present.floors).toHaveLength(2);
    expect(canUndo(state)).toBe(false);
  });
});
