import { describe, expect, it } from "vitest";
import {
  effectiveMarketplacePrice,
  isPublishedOn,
  marketplaceMargin,
  marketplacePriceOverride,
} from "../marketplacePricing";

describe("isPublishedOn", () => {
  it("lit les drapeaux plats de GET /menu/products (sync_ubereats sans tiret bas)", () => {
    const product = { sync_ubereats: false, sync_deliveroo: true };
    expect(isPublishedOn(product, "uber_eats")).toBe(false);
    expect(isPublishedOn(product, "deliveroo")).toBe(true);
  });

  it("préfère le drapeau plat au bloc integrations vide de la liste", () => {
    const product = {
      sync_deliveroo: true,
      integrations: { deliveroo: { enabled: false } },
    };
    expect(isPublishedOn(product, "deliveroo")).toBe(true);
  });

  it("se replie sur integrations quand le drapeau plat est absent (fiche produit)", () => {
    expect(isPublishedOn({ integrations: { uber_eats: { enabled: true } } }, "uber_eats")).toBe(true);
    expect(isPublishedOn({}, "uber_eats")).toBe(false);
  });
});

describe("marketplacePriceOverride", () => {
  it("ignore un prix plateforme à 0 (pas de prix spécifique)", () => {
    expect(marketplacePriceOverride({ price_deliveroo: 0 }, "deliveroo")).toBeUndefined();
    expect(marketplacePriceOverride({ price_deliveroo: 1390 }, "deliveroo")).toBe(1390);
  });

  it("se replie sur integrations.price_override", () => {
    expect(
      marketplacePriceOverride({ integrations: { uber_eats: { price_override: 1490 } } }, "uber_eats"),
    ).toBe(1490);
  });
});

describe("effectiveMarketplacePrice", () => {
  it("prix spécifique > prix livraison > prix sur place, comme l'API", () => {
    expect(effectiveMarketplacePrice({ price: 1000, price_delivery: 1200, price_uber_eats: 1500 }, "uber_eats"))
      .toEqual({ cents: 1500, source: "override" });
    expect(effectiveMarketplacePrice({ price: 1000, price_delivery: 1200, price_uber_eats: 0 }, "uber_eats"))
      .toEqual({ cents: 1200, source: "delivery" });
    expect(effectiveMarketplacePrice({ price: 1000, price_delivery: 0 }, "deliveroo"))
      .toEqual({ cents: 1000, source: "on_site" });
  });
});

describe("marketplaceMargin", () => {
  it("déduit la commission du prix plateforme et rapporte la marge à ce prix", () => {
    // 10 € de prix, 3 € de coût, 30 % de commission : 7 € nets, 4 € de marge, 40 %.
    const m = marketplaceMargin(1000, 300, 30);
    expect(m.netRevenue).toBeCloseTo(700);
    expect(m.margin).toBeCloseTo(400);
    expect(m.marginRate).toBeCloseTo(40);
  });

  it("à prix égal, la commission retire exactement son pourcentage au taux de marge", () => {
    const onSiteRate = ((1250 - 400) / 1250) * 100;
    expect(marketplaceMargin(1250, 400, 25).marginRate).toBeCloseTo(onSiteRate - 25);
  });

  it("ne divise pas par zéro", () => {
    expect(marketplaceMargin(0, 300, 30).marginRate).toBe(0);
  });
});
