/**
 * franchisesService : lecture des réponses de /franchises et traduction des
 * erreurs de l'API en messages français (le toast générique est coupé).
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
  return { ...original, apiClient: api, logAPI: vi.fn() };
});

import { FranchiseApiError, franchiseErrorMessage, franchisesService } from "../franchisesService";

const httpError = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error("HTTP error"), { status, responseBody: body });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe("franchisesService", () => {
  it("lit la liste et can_create, sans toast générique", async () => {
    api.get.mockResolvedValue({ id: "x", data: { status: "success", franchises: null, can_create: true } });
    await expect(franchisesService.list()).resolves.toEqual({ franchises: [], can_create: true });
    expect(api.get).toHaveBeenCalledWith("/franchises/", { suppressErrorToast: true });
  });

  it("traduit une erreur métier connue", async () => {
    api.post.mockRejectedValue(httpError(409, { status: "franchise_merchant_in_other_franchise", message: "..." }));
    const error = await franchisesService.addMerchants("fra-1", ["2"]).catch((e) => e);
    expect(error).toBeInstanceOf(FranchiseApiError);
    expect(error.code).toBe("franchise_merchant_in_other_franchise");
    expect(error.httpStatus).toBe(409);
    expect(error.message).toBe("Cet établissement appartient déjà à une autre franchise.");
  });

  it("lit aussi le code d'erreur d'un upload refusé (champ error)", async () => {
    api.put.mockRejectedValue(httpError(400, { error: "invalid_image_type" }));
    const error = await franchisesService.uploadImage("fra-1", "logo", new File(["x"], "a.gif")).catch((e) => e);
    expect(franchiseErrorMessage(error, "fallback")).toMatch(/JPEG, PNG et WebP/);
  });

  it("garde un message générique pour un code inconnu", async () => {
    api.get.mockRejectedValue(httpError(500, { status: "internal_server_error" }));
    const error = await franchisesService.get("fra-1").catch((e) => e);
    expect(error.message).toMatch(/Une erreur est survenue/);
  });

  it("encode les identifiants dans l'URL", async () => {
    api.patch.mockResolvedValue({ id: "x", data: { status: "success" } });
    await franchisesService.setMerchantHubVisible("fra-1", "2", false);
    expect(api.patch).toHaveBeenCalledWith("/franchises/fra-1/merchants/2", { hub_visible: false }, { suppressErrorToast: true });
  });

  it("laisse passer une erreur qui n'est pas HTTP", async () => {
    api.delete.mockRejectedValue(new TypeError("network"));
    await expect(franchisesService.remove("fra-1")).rejects.toBeInstanceOf(TypeError);
  });
});
