/**
 * locationsService : les créations d'étage et de table renvoient un accusé
 * `{ id, data: { status, floor_id | location_id } }` (et non la ressource).
 * Le service doit en déduire un Floor / Location complet, sinon l'état du plan
 * contient un objet sans id (étage invisible dans la liste, `NaN` places, table
 * ni sélectionnable ni déplaçable).
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

import { createFloor, createLocation } from "../locationsService";

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe("createFloor", () => {
  it("construit l'étage à partir du nom envoyé et du floor_id généré", async () => {
    api.post.mockResolvedValue({ id: "locations.create_floor", data: { status: "1", floor_id: "42" } });

    await expect(createFloor("Terrasse")).resolves.toEqual({ id: "42", name: "Terrasse", enabled: true });
    expect(api.post).toHaveBeenCalledWith("/floors", { name: "Terrasse" });
  });

  it("accepte un identifiant numérique et le normalise en chaîne", async () => {
    api.post.mockResolvedValue({ id: "x", data: { status: "1", floor_id: 7 } });

    await expect(createFloor("RDC")).resolves.toMatchObject({ id: "7" });
  });

  it("refuse une réponse sans floor_id plutôt que d'insérer un étage sans id", async () => {
    api.post.mockResolvedValue({ id: "locations.create_floor", data: { status: "1" } });

    await expect(createFloor("RDC")).rejects.toThrow(/floor_id/);
  });
});

describe("createLocation", () => {
  const payload = {
    location_name: "Table 3",
    seats: 2,
    floor_id: "42",
    shape: "circle" as const,
    angle: 0,
    x: 120,
    y: 60,
    width: 80,
    height: 80,
    enabled: true,
  };

  it("construit une Location complète avec l'id généré, l'étage et les places demandés", async () => {
    api.post.mockResolvedValue({ id: "locations.create_table", data: { status: "1", location_id: "314" } });

    const created = await createLocation(payload);

    expect(created).toMatchObject({
      location_id: "314",
      location_name: "Table 3",
      seats: 2,
      floor_id: "42",
      shape: "circle",
      x: 120,
      y: 60,
      width: 80,
      height: 80,
      enabled: true,
    });
    expect(Number.isNaN(created.seats)).toBe(false);
    expect(api.post).toHaveBeenCalledWith("/locations/floors/42/tables", payload);
  });

  it("refuse une réponse sans location_id", async () => {
    api.post.mockResolvedValue({ id: "locations.create_table", data: { status: "1" } });

    await expect(createLocation(payload)).rejects.toThrow(/location_id/);
  });

  it("refuse de créer une table sans étage (pas d'appel vers /floors/null)", async () => {
    await expect(createLocation({ ...payload, floor_id: null })).rejects.toThrow(/étage/);
    expect(api.post).not.toHaveBeenCalled();
  });
});
