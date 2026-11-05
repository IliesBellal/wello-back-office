import { describe, expect, it } from "vitest";
import { computePublishPayload, summarizeChanges, summarizePayload } from "../diff";
import { createInitialState, planReducer, type PlanState } from "../reducer";
import type { Area, Location, Obstacle, PlanContent } from "../types";
import { validatePlanContent } from "../validation";

const floor = { id: "1", name: "Salle", enabled: true };

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

const obstacle = (overrides: Partial<Obstacle> = {}): Obstacle => ({
  id: "obs-1",
  floorId: "1",
  type: "wall",
  x: 500,
  y: 100,
  width: 300,
  height: 12,
  angle: 0,
  ...overrides,
});

const area = (overrides: Partial<Area> = {}): Area => ({
  id: "5",
  floorId: "1",
  name: "Coin",
  strokeColor: "#64748B",
  color: "#E2E8F0",
  x: 0,
  y: 0,
  angle: 0,
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ],
  ...overrides,
});

const content = (overrides: Partial<PlanContent> = {}): PlanContent => ({
  floors: [floor],
  locations: [table()],
  obstacles: [obstacle()],
  areas: [area()],
  ...overrides,
});

const loaded = (base: PlanContent): PlanState =>
  planReducer(createInitialState(), { type: "load", snapshot: { revision: 7, ...base } });

describe("computePublishPayload", () => {
  it("ne produit rien quand le brouillon est identique au publié", () => {
    const base = content();
    const payload = computePublishPayload(base, base, 7);
    expect(summarizePayload(payload).total).toBe(0);
    expect(payload.base_revision).toBe(7);
  });

  it("ignore le bruit des flottants 32 bits renvoyés par l'API", () => {
    const base = content();
    const noisy = content({ locations: [table({ x: 100.00000762939453, angle: 0.0000001 })] });
    expect(summarizeChanges(base, noisy).total).toBe(0);
  });

  it("considère des attributs null et tous à faux comme identiques", () => {
    const base = content();
    const same = content({
      locations: [table({ attributes: { pmr: false, terrace: false, vip: false, window: false } })],
    });
    expect(summarizeChanges(base, same).total).toBe(0);
  });

  it("met à jour uniquement l'entité modifiée, avec tous ses champs", () => {
    const base = content({ locations: [table(), table({ location_id: "11", location_name: "Table 2" })] });
    const present: PlanContent = {
      ...base,
      locations: [base.locations[0], { ...base.locations[1], seats: 6, x: 300 }],
    };

    const payload = computePublishPayload(base, present, 7);

    expect(payload.tables.update).toHaveLength(1);
    expect(payload.tables.update[0]).toMatchObject({
      id: "11",
      location_name: "Table 2",
      seats: 6,
      x: 300,
      floor_id: "1",
      shape: "square",
      width: 80,
      height: 80,
      enabled: true,
    });
    expect(payload.tables.create).toEqual([]);
    expect(payload.tables.delete).toEqual([]);
  });

  it("détecte un changement d'attribut", () => {
    const base = content();
    const present = content({
      locations: [table({ attributes: { pmr: true, terrace: false, vip: false, window: false } })],
    });
    expect(computePublishPayload(base, present, 7).tables.update[0].attributes).toMatchObject({ pmr: true });
  });

  it("envoie la création d'une table sur un étage créé dans le même brouillon, avec ses ids temporaires", () => {
    let state = loaded(content());
    state = planReducer(state, { type: "addFloor", name: "Terrasse" });
    const floorId = state.activeFloorId as string;
    state = planReducer(state, { type: "addTables", spec: { floorId, shape: "circle" } });

    const payload = computePublishPayload(state.base, state.present, state.revision);

    expect(payload.floors.create).toEqual([{ temp_id: floorId, name: "Terrasse" }]);
    expect(payload.tables.create).toHaveLength(1);
    expect(payload.tables.create[0]).toMatchObject({ floor_id: floorId, seats: 2, shape: "circle" });
    expect(payload.tables.create[0].temp_id.startsWith("tmp_")).toBe(true);
  });

  it("n'envoie rien pour une entité créée puis supprimée dans le brouillon", () => {
    let state = loaded(content());
    state = planReducer(state, { type: "addTables", spec: { floorId: "1", shape: "square" } });
    state = planReducer(state, { type: "delete", refs: state.selection });

    expect(summarizeChanges(state.base, state.present).total).toBe(0);
  });

  it("supprime les éléments d'un étage supprimé, puis l'étage", () => {
    let state = loaded(content());
    state = planReducer(state, { type: "deleteFloor", floorId: "1" });

    const payload = computePublishPayload(state.base, state.present, state.revision);

    expect(payload.tables.delete).toEqual(["10"]);
    expect(payload.obstacles.delete).toEqual(["obs-1"]);
    expect(payload.areas.delete).toEqual(["5"]);
    expect(payload.floors.delete).toEqual(["1"]);
  });

  it("déplace une table vers un nouvel étage via son floor_id temporaire", () => {
    let state = loaded(content());
    state = planReducer(state, { type: "addFloor", name: "Terrasse" });
    const newFloor = state.activeFloorId as string;
    state = planReducer(state, {
      type: "update",
      changes: [{ ref: { kind: "table", id: "10" }, patch: { floor_id: newFloor } }],
    });

    const payload = computePublishPayload(state.base, state.present, state.revision);
    expect(payload.tables.update[0]).toMatchObject({ id: "10", floor_id: newFloor });
  });

  it("n'envoie `direction` que pour une porte", () => {
    const base = content({ obstacles: [] });
    let state = loaded(base);
    state = planReducer(state, { type: "addObstacle", spec: { floorId: "1", type: "door", x: 300, y: 300 } });
    state = planReducer(state, { type: "addObstacle", spec: { floorId: "1", type: "plant", x: 400, y: 400 } });

    const { create } = computePublishPayload(state.base, state.present, state.revision).obstacles;
    const door = create.find((o) => o.type === "door");
    const plant = create.find((o) => o.type === "plant");

    expect(door?.direction).toBe(90);
    expect(plant && "direction" in plant).toBe(false);
  });

  it("renomme un étage", () => {
    let state = loaded(content());
    state = planReducer(state, { type: "renameFloor", floorId: "1", name: "  Grande salle " });

    expect(computePublishPayload(state.base, state.present, 7).floors.update).toEqual([
      { id: "1", name: "Grande salle" },
    ]);
  });

  it("compte créations, modifications et suppressions", () => {
    const base = content();
    const present: PlanContent = {
      ...base,
      locations: [{ ...base.locations[0], seats: 4 }, table({ location_id: "tmp_t9", location_name: "Table 2" })],
      obstacles: [],
    };

    expect(summarizeChanges(base, present)).toEqual({ created: 1, updated: 1, deleted: 1, total: 3 });
  });
});

describe("validatePlanContent", () => {
  it("accepte un plan cohérent", () => {
    expect(validatePlanContent(content())).toEqual([]);
  });

  it("refuse un nom de table vide ou trop long (colonne varchar(20))", () => {
    const issues = validatePlanContent(
      content({
        locations: [
          table({ location_id: "a", location_name: "  " }),
          table({ location_id: "b", location_name: "x".repeat(21) }),
        ],
      })
    );
    expect(issues.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("refuse un nom d'étage trop long (colonne varchar(50)) ou vide", () => {
    const issues = validatePlanContent(
      content({ floors: [{ id: "1", name: "x".repeat(51), enabled: true }, { id: "2", name: " ", enabled: true }] })
    );
    expect(issues.filter((i) => i.kind === "floor")).toHaveLength(2);
  });

  it("refuse une table rattachée à un étage inexistant", () => {
    const issues = validatePlanContent(content({ locations: [table({ floor_id: "404" })] }));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/aucun étage/);
  });

  it("refuse une zone de moins de 3 points", () => {
    const issues = validatePlanContent(content({ areas: [area({ points: [{ x: 0, y: 0 }] })] }));
    expect(issues[0].message).toMatch(/3 points/);
  });
});
