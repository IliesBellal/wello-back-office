/**
 * Tests de la convention de découpe des zones de livraison (lib/deliveryZones).
 */

import { describe, expect, it } from 'vitest';

import {
  buildZonePreview,
  displayOuterKm,
  gridHalfCells,
  parseDistanceBands,
  pointAtBearing,
  zoneLabelForPoint,
} from './deliveryZones';
import type { EstablishmentDeliveryZone } from '@/types/settings';

const METZ = { lat: 49.1193, lng: 6.1757 };

const settings = (over: Partial<EstablishmentDeliveryZone> = {}): EstablishmentDeliveryZone => ({
  zoning_type: 'RADIAL',
  cardinal_cone_count: 4,
  cardinal_zone_ranges: '0-1,1-3,3-999',
  radial_cone_count: 8,
  radial_zone_ranges: '0-3,3-5,5-999',
  grid_cell_size_km: 2,
  grid_origin_lat: null,
  grid_origin_lng: null,
  ...over,
});

describe('parseDistanceBands', () => {
  it('trie par borne min et ignore les plages invalides', () => {
    expect(parseDistanceBands('3-5, 0-3,abc,5-5,7-6,5-999')).toEqual([
      { min: 0, max: 3 },
      { min: 3, max: 5 },
      { min: 5, max: 999 },
    ]);
  });

  it('chaîne vide = aucune plage', () => {
    expect(parseDistanceBands('')).toEqual([]);
    expect(parseDistanceBands(null)).toEqual([]);
  });

  it('tronque une plage sans limite à l’affichage', () => {
    expect(displayOuterKm({ min: 5, max: 999 })).toBe(7.5);
    expect(displayOuterKm({ min: 0, max: 999 })).toBe(2);
    expect(displayOuterKm({ min: 3, max: 5 })).toBe(5);
  });
});

describe('RADIAL', () => {
  it('produit secteurs × plages, A1 en premier', () => {
    const preview = buildZonePreview(settings(), METZ)!;
    expect(preview.zones).toHaveLength(24);
    expect(preview.zones.map((z) => z.label).slice(0, 4)).toEqual(['A1', 'A2', 'A3', 'B1']);
    expect(preview.sectorNames).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    expect(preview.zones[2].openEnded).toBe(true);
  });

  it('secteur A commence plein nord, sens horaire', () => {
    const s = settings();
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 10, 1))).toBe('A1');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 60, 4))).toBe('B2');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 350, 20))).toBe('H3');
  });

  it('hors découpe au-delà de la dernière plage', () => {
    const s = settings({ radial_zone_ranges: '0-3,3-5' });
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 10, 6))).toBeNull();
  });

  it('le libellé affiché tombe dans sa propre zone', () => {
    const s = settings();
    for (const zone of buildZonePreview(s, METZ)!.zones) {
      expect(zoneLabelForPoint(s, METZ, zone.labelAt)).toBe(zone.label);
    }
  });
});

describe('CARDINAL', () => {
  it('secteurs centrés sur les points cardinaux', () => {
    const s = settings({ zoning_type: 'CARDINAL' });
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 350, 0.5))).toBe('N1');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 40, 2))).toBe('N2');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 90, 2))).toBe('E2');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 270, 10))).toBe('O3');
  });

  it('8 secteurs : NE, SO…', () => {
    const s = settings({ zoning_type: 'CARDINAL', cardinal_cone_count: 8 });
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 45, 2))).toBe('NE2');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 225, 0.5))).toBe('SO1');
  });

  it('nombre sans nom cardinal : retombe sur des lettres', () => {
    const preview = buildZonePreview(settings({ zoning_type: 'CARDINAL', cardinal_cone_count: 6 }), METZ)!;
    expect(preview.sectorNames).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('le libellé affiché tombe dans sa propre zone', () => {
    const s = settings({ zoning_type: 'CARDINAL', cardinal_cone_count: 16 });
    for (const zone of buildZonePreview(s, METZ)!.zones) {
      expect(zoneLabelForPoint(s, METZ, zone.labelAt)).toBe(zone.label);
    }
  });
});

describe('GRID', () => {
  it('taille de la grille selon la taille de case', () => {
    expect(gridHalfCells(1)).toBe(10);
    expect(gridHalfCells(2)).toBe(5);
    expect(gridHalfCells(50)).toBe(1);
    expect(gridHalfCells(0)).toBe(0);
  });

  it('origine par défaut = établissement, au centre de la grille', () => {
    const s = settings({ zoning_type: 'GRID' });
    const preview = buildZonePreview(s, METZ)!;
    expect(preview.center).toEqual(METZ);
    expect(preview.gridSize).toBe(11);
    expect(preview.gridCenterLabel).toBe('F6');
    expect(zoneLabelForPoint(s, METZ, METZ)).toBe('F6');
  });

  it('colonnes d’ouest en est, lignes du nord au sud', () => {
    const s = settings({ zoning_type: 'GRID' });
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 90, 2))).toBe('G6');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 0, 2))).toBe('F5');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 180, 10))).toBe('F11');
    expect(zoneLabelForPoint(s, METZ, pointAtBearing(METZ, 180, 12))).toBeNull();
  });

  it('origine saisie prioritaire sur l’établissement', () => {
    const origin = { lat: 49.2, lng: 6.2 };
    const s = settings({ zoning_type: 'GRID', grid_origin_lat: origin.lat, grid_origin_lng: origin.lng });
    expect(buildZonePreview(s, METZ)!.center).toEqual(origin);
    expect(zoneLabelForPoint(s, METZ, origin)).toBe('F6');
  });

  it('le libellé affiché tombe dans sa propre case', () => {
    const s = settings({ zoning_type: 'GRID', grid_cell_size_km: 3 });
    for (const zone of buildZonePreview(s, METZ)!.zones) {
      expect(zoneLabelForPoint(s, METZ, zone.labelAt)).toBe(zone.label);
    }
  });
});

describe('rien à dessiner', () => {
  it('sans zonage, sans coordonnées ou sans plage', () => {
    expect(buildZonePreview(settings({ zoning_type: '' }), METZ)).toBeNull();
    expect(buildZonePreview(settings(), null)).toBeNull();
    expect(buildZonePreview(settings({ radial_zone_ranges: '' }), METZ)).toBeNull();
    expect(buildZonePreview(settings({ zoning_type: 'GRID' }), null)).toBeNull();
  });
});
