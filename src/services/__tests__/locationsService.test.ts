/**
 * locationsService : frontière avec l'API du plan de salle.
 *
 * - GET /locations renvoie les obstacles et zones en snake_case et des ids
 *   parfois numériques : le service les traduit au modèle de l'éditeur (c'était
 *   la cause de l'étage « sans nom » et des obstacles jamais affichés).
 * - La publication traduit les codes d'erreur en messages affichables.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/services/apiClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/apiClient")>();
  return { ...original, apiClient: api, logAPI: vi.fn(), withMock: (_mock: unknown, real: () => unknown) => real() };
});

import { computePublishPayload, summarizeChanges } from "@/lib/floorplan/diff";
import { validatePlanContent } from "@/lib/floorplan/validation";
import goLocationsResponse from "./fixtures/locationsResponse.json";
import { createInitialState, planReducer } from "@/lib/floorplan/reducer";
import type { PlanContent } from "@/lib/floorplan/types";
import {
  PlanPublishError,
  applyPublishToContent,
  getFloorPlan,
  mapRawPlan as mapRawPlanTyped,
  publishFloorPlan,
} from "../locationsService";

// Les réponses de test sont écrites « comme l'API les renvoie » (types lâches : ids numériques, type inconnu…).
const mapRawPlan = (raw: unknown) => mapRawPlanTyped(raw as Parameters<typeof mapRawPlanTyped>[0]);

const httpError = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error("HTTP error"), { name: "ApiHttpError", status, responseBody: body });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe("mapRawPlan", () => {
  const raw = {
    id: "locations.get",
    data: {
      revision: 4,
      floors: [{ id: 12, name: "Salle" }],
      locations: [
        { location_id: 7, location_name: "Table 7", seats: 4, floor_id: 12, shape: "square", angle: 0, x: 10, y: 20, width: 80, height: 80 },
        { location_id: 8, location_name: "Orpheline", seats: 2, floor_id: null, shape: "square", angle: 0, x: 0, y: 0, width: 80, height: 80 },
        { location_id: 9, location_name: "Étage disparu", seats: 2, floor_id: 99, shape: "square", angle: 0, x: 0, y: 0, width: 80, height: 80 },
      ],
      obstacles: [
        { id: "obs-1", floor_id: "12", type: "door", x: 5, y: 6, width: 80, height: 12, angle: 90, direction: 45 },
        { id: "obs-2", floor_id: "12", type: "wall", x: 5, y: 6, width: 80, height: 12, angle: 0, direction: 30 },
        { id: "obs-3", floor_id: "12", type: "hologram", x: 5, y: 6, width: 80, height: 12, angle: 0 },
        { id: "obs-4", floor_id: "99", type: "wall", x: 5, y: 6, width: 80, height: 12, angle: 0 },
      ],
      areas: [
        { id: 3, floor_id: 12, name: "Coin", stroke_color: "#111111", color: "#eeeeee", x: 1, y: 2, angle: 0,
          points: '[{"x":0,"y":0},{"x":10,"y":0},{"x":10,"y":10}]' },
      ],
    },
  };

  it("traduit les obstacles et zones en camelCase et les ids numériques en chaînes", () => {
    const plan = mapRawPlan(raw);

    expect(plan.revision).toBe(4);
    expect(plan.floors).toEqual([{ id: "12", name: "Salle", enabled: true }]);
    expect(plan.locations[0]).toMatchObject({ location_id: "7", floor_id: "12", enabled: true });
    expect(plan.obstacles[0]).toEqual({ id: "obs-1", floorId: "12", type: "door", x: 5, y: 6, width: 80, height: 12, angle: 90, direction: 45 });
    expect(plan.areas[0]).toMatchObject({ id: "3", floorId: "12", strokeColor: "#111111", color: "#eeeeee" });
  });

  it("lit les points d'une zone stockés en texte JSON", () => {
    expect(mapRawPlan(raw).areas[0].points).toHaveLength(3);
  });

  it("écarte tables sans étage ou sur un étage inconnu, obstacles de type inconnu ou sur un étage inconnu", () => {
    const plan = mapRawPlan(raw);
    expect(plan.locations.map((l) => l.location_id)).toEqual(["7"]);
    expect(plan.obstacles.map((o) => o.id)).toEqual(["obs-1", "obs-2"]);
  });

  it("ne garde `direction` que pour une porte", () => {
    const [, wall] = mapRawPlan(raw).obstacles;
    expect("direction" in wall).toBe(false);
  });

  it("tolère une réponse vide (révision 0, aucun élément)", () => {
    expect(mapRawPlan({ data: {} })).toEqual({ revision: 0, floors: [], locations: [], obstacles: [], areas: [] });
  });
});

/**
 * `fixtures/locationsResponse.json` est la sortie RÉELLE de l'API Go (models.LocationResponse
 * sérialisée par encoding/json), pas une réponse écrite à la main. Elle garde les particularités
 * qui ont déjà causé un bug : x, y, angle omis quand ils valent 0 (`omitempty`), aucun champ
 * `enabled`, floor_id omis pour une table historique.
 */
describe("réponse réelle de l'API Go (fixture)", () => {
  const plan = mapRawPlan(goLocationsResponse);
  const table1 = plan.locations.find((l) => l.location_id === "40")!;

  it("comble les champs omis par `omitempty` (x, angle, enabled) au lieu de laisser des undefined", () => {
    expect(goLocationsResponse.data.locations[0]).not.toHaveProperty("x");
    expect(goLocationsResponse.data.locations[0]).not.toHaveProperty("angle");
    expect(goLocationsResponse.data.locations[0]).not.toHaveProperty("enabled");

    expect(table1).toMatchObject({ x: 0, y: 100, angle: 0, width: 80, height: 80, enabled: true, floor_id: "12" });
    for (const l of plan.locations) {
      for (const field of ["x", "y", "width", "height", "angle", "seats"] as const) {
        expect(Number.isFinite(l[field])).toBe(true);
      }
    }
  });

  it("écarte la table historique sans étage et lit révision, obstacles et zones", () => {
    expect(plan.revision).toBe(4);
    expect(plan.locations.map((l) => l.location_id)).toEqual(["40", "41"]);
    expect(plan.obstacles.map((o) => o.type)).toEqual(["wall", "door", "window"]);
    expect(plan.obstacles[1].direction).toBe(45);
    expect("direction" in plan.obstacles[0]).toBe(false);
    expect(plan.areas[0]).toMatchObject({ id: "5", floorId: "12", strokeColor: "#64748B" });
    expect(plan.areas[0].points).toHaveLength(3);
  });

  it("un plan fraîchement chargé n'a AUCUNE modification à publier (régression : tout apparaissait modifié)", () => {
    const content = { floors: plan.floors, locations: plan.locations, obstacles: plan.obstacles, areas: plan.areas };
    expect(summarizeChanges(content, content).total).toBe(0);

    // Et après un aller-retour réseau : mêmes données re-lues depuis la même réponse.
    const again = mapRawPlan(JSON.parse(JSON.stringify(goLocationsResponse)));
    expect(summarizeChanges(content, { floors: again.floors, locations: again.locations, obstacles: again.obstacles, areas: again.areas }).total).toBe(0);
  });

  it("ne remonte aucune erreur de validation sur un plan valide", () => {
    expect(validatePlanContent({ floors: plan.floors, locations: plan.locations, obstacles: plan.obstacles, areas: plan.areas })).toEqual([]);
  });
});

describe("getFloorPlan", () => {
  it("appelle GET /locations et renvoie le plan traduit", async () => {
    api.get.mockResolvedValue({ data: { revision: 2, floors: [{ id: 1, name: "RDC" }], locations: [], obstacles: [], areas: [] } });

    await expect(getFloorPlan()).resolves.toMatchObject({ revision: 2, floors: [{ id: "1", name: "RDC" }] });
    expect(api.get).toHaveBeenCalledWith("/locations");
  });
});

describe("publishFloorPlan", () => {
  const emptyPayload = computePublishPayload(
    { floors: [], locations: [], obstacles: [], areas: [] },
    { floors: [], locations: [], obstacles: [], areas: [] },
    3
  );

  it("poste le lot sans toast générique et renvoie la nouvelle révision et la table des ids", async () => {
    api.post.mockResolvedValue({ id: "locations.publish_plan", data: { status: "1", revision: 4, id_map: { tmp_t1: "301" } } });

    await expect(publishFloorPlan(emptyPayload)).resolves.toEqual({ revision: 4, idMap: { tmp_t1: "301" } });
    expect(api.post).toHaveBeenCalledWith("/locations/plan/publish", emptyPayload, { suppressErrorToast: true });
  });

  it("signale un conflit de révision avec un message clair", async () => {
    api.post.mockRejectedValue(httpError(409, { status: "plan_revision_conflict", message: "..." }));

    const error = await publishFloorPlan(emptyPayload).catch((e) => e);

    expect(error).toBeInstanceOf(PlanPublishError);
    expect(error.isConflict).toBe(true);
    expect(error.httpStatus).toBe(409);
    expect(error.message).toMatch(/modifié par quelqu'un d'autre/);
  });

  it("traduit une erreur métier connue et garde un message générique pour une inconnue", async () => {
    api.post.mockRejectedValueOnce(httpError(409, { status: "floor_not_empty" }));
    await expect(publishFloorPlan(emptyPayload)).rejects.toMatchObject({ code: "floor_not_empty", isConflict: false });

    api.post.mockRejectedValueOnce(httpError(500, { status: "internal_server_error" }));
    await expect(publishFloorPlan(emptyPayload)).rejects.toThrow(/L'enregistrement du plan a échoué/);
  });

  it("laisse passer une erreur qui n'est pas une réponse HTTP (réseau, bug)", async () => {
    const boom = new TypeError("Failed to fetch");
    api.post.mockRejectedValue(boom);
    await expect(publishFloorPlan(emptyPayload)).rejects.toBe(boom);
  });
});

describe("applyPublishToContent (rejoue la publication du mock)", () => {
  const base: PlanContent = {
    floors: [{ id: "1", name: "Salle", enabled: true }],
    locations: [
      { location_id: "10", location_name: "Table 1", seats: 2, floor_id: "1", shape: "square", angle: 0, x: 100, y: 100, width: 80, height: 80, enabled: true, attributes: null },
    ],
    obstacles: [{ id: "obs-1", floorId: "1", type: "wall", x: 500, y: 100, width: 300, height: 12, angle: 0 }],
    areas: [],
  };

  const counter = () => {
    let n = 100;
    return () => String(++n);
  };

  it("une session d'édition complète publiée donne exactement le brouillon (au renommage d'ids près)", () => {
    let state = planReducer(createInitialState(), { type: "load", snapshot: { revision: 0, ...base } });
    state = planReducer(state, { type: "addFloor", name: "Terrasse" });
    const terrace = state.activeFloorId as string;
    state = planReducer(state, { type: "addTables", spec: { floorId: terrace, shape: "circle" }, count: 3 });
    state = planReducer(state, { type: "addObstacle", spec: { floorId: terrace, type: "plant", x: 300, y: 300 } });
    state = planReducer(state, {
      type: "update",
      changes: [{ ref: { kind: "table", id: "10" }, patch: { seats: 6, x: 200 } }],
    });

    const payload = computePublishPayload(state.base, state.present, state.revision);
    const { content, idMap } = applyPublishToContent(base, payload, counter());

    // Plus aucun écart une fois les ids temporaires remplacés par les réels.
    const terraceId = idMap[terrace];
    expect(content.floors.map((f) => f.name)).toEqual(["Salle", "Terrasse"]);
    expect(content.locations.filter((l) => l.floor_id === terraceId)).toHaveLength(3);
    expect(content.locations.find((l) => l.location_id === "10")).toMatchObject({ seats: 6, x: 200 });
    expect(content.obstacles.find((o) => o.type === "plant")?.floorId).toBe(terraceId);
    expect(Object.keys(idMap).every((temp) => temp.startsWith("tmp_"))).toBe(true);
    expect(Object.values(idMap).every((id) => !id.startsWith("tmp_"))).toBe(true);
  });

  it("refuse de supprimer un étage qui garde des tables (comme l'API)", () => {
    const payload = computePublishPayload(base, { ...base, floors: [] }, 0);
    // Le brouillon a supprimé l'étage mais pas sa table : lot incohérent.
    payload.tables.delete = [];
    expect(() => applyPublishToContent(base, payload, counter())).toThrow(/contient encore des tables/);
  });

  it("supprime avec l'étage ses obstacles restants", () => {
    const present: PlanContent = { floors: [], locations: [], obstacles: [], areas: [] };
    const { content } = applyPublishToContent(base, computePublishPayload(base, present, 0), counter());
    expect(content).toEqual({ floors: [], locations: [], obstacles: [], areas: [] });
  });
});
