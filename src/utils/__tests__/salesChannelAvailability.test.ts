import { describe, expect, it } from "vitest";
import {
  channelAvailabilityFields,
  channelAvailabilityPatch,
  isChannelEnabled,
} from "../salesChannelAvailability";

describe("isChannelEnabled", () => {
  it("sur place / à emporter / livraison : activé sauf false explicite (défaut base = TRUE)", () => {
    expect(isChannelEnabled({}, "on_site")).toBe(true);
    expect(isChannelEnabled({ available_in: false }, "on_site")).toBe(false);
    expect(isChannelEnabled({ available_take_away: false }, "take_away")).toBe(false);
    expect(isChannelEnabled({ available_delivery: true }, "delivery")).toBe(true);
  });

  it("plateformes : lit la case de publication", () => {
    expect(isChannelEnabled({}, "uber_eats")).toBe(false);
    expect(isChannelEnabled({ sync_deliveroo: true }, "deliveroo")).toBe(true);
  });
});

describe("channelAvailabilityFields", () => {
  it("n'envoie que le champ du canal concerné", () => {
    expect(channelAvailabilityFields("on_site", false)).toEqual({ available_in: false });
    expect(channelAvailabilityFields("take_away", true)).toEqual({ available_take_away: true });
    expect(channelAvailabilityFields("delivery", false)).toEqual({ available_delivery: false });
    expect(channelAvailabilityFields("uber_eats", true)).toEqual({ sync_uber_eats: true });
    expect(channelAvailabilityFields("deliveroo", false)).toEqual({ sync_deliveroo: false });
  });
});

describe("channelAvailabilityPatch", () => {
  it("reporte le drapeau local du canal", () => {
    expect(channelAvailabilityPatch({}, "delivery", false)).toEqual({ available_delivery: false });
  });

  it("garde integrations cohérent pour une plateforme", () => {
    const patch = channelAvailabilityPatch(
      { integrations: { deliveroo: { enabled: false, price_override: 1290 } } },
      "deliveroo",
      true,
    );
    expect(patch.sync_deliveroo).toBe(true);
    expect(patch.integrations?.deliveroo).toEqual({ enabled: true, price_override: 1290 });
  });
});
