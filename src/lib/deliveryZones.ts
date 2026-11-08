/**
 * Découpe des zones de livraison (Paramètres > Établissement > Livraison).
 *
 * Ce module est la RÉFÉRENCE de la convention de nommage des zones. L'API en a
 * un portage Go (ib-welloresto-api/internal/modules/deliveryzone) qui attribue
 * la zone du client à chaque commande en livraison : `zoneLabelForPoint` et sa
 * version Go doivent rester identiques (mêmes cas de test des deux côtés).
 * Voir docs/zones-livraison-apercu.md.
 *
 * Convention :
 * - RADIAL : secteurs égaux A, B, C… dans le sens horaire, le secteur A
 *   commençant plein nord (0°) ; plages de distance numérotées 1, 2, 3… du
 *   centre vers l'extérieur. Zone = lettre + chiffre (B2).
 * - CARDINAL : comme RADIAL, mais chaque secteur est CENTRÉ sur sa direction
 *   (le secteur N couvre -45°…+45° avec 4 secteurs) et porte le nom du point
 *   cardinal (N, NE, E…) au lieu d'une lettre. Zone = direction + chiffre (NE2).
 *   Pour un nombre de secteurs sans nom cardinal (autre que 2/4/8/16), les
 *   secteurs retombent sur des lettres.
 * - GRID : grille carrée centrée sur l'origine (par défaut l'établissement),
 *   couvrant au moins GRID_RADIUS_KM autour d'elle. Colonnes A, B, C… d'ouest
 *   en est, lignes 1, 2, 3… du nord au sud (comme un plan de ville). La case
 *   de l'origine est au centre (ex. F6 avec des cases de 2 km).
 *
 * Géométrie : projection plane locale (équirectangulaire), largement suffisante
 * pour quelques dizaines de kilomètres.
 */

import type { EstablishmentDeliveryZone } from '@/types/settings';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DistanceBand {
  min: number;
  max: number;
}

export interface ZoneShape {
  label: string;
  /** Contour fermé implicitement (le dernier point rejoint le premier). */
  path: LatLng[];
  /** Point où afficher le libellé. */
  labelAt: LatLng;
  /** Index du secteur (RADIAL/CARDINAL) ou de la colonne (GRID). */
  sectorIndex: number;
  /** Index de la plage (RADIAL/CARDINAL) ou de la ligne (GRID). */
  ringIndex: number;
  /** Plage « sans limite » (max >= OPEN_ENDED_KM) : dessinée tronquée. */
  openEnded: boolean;
}

export interface ZonePreview {
  type: 'CARDINAL' | 'RADIAL' | 'GRID';
  center: LatLng;
  zones: ZoneShape[];
  /** Plages triées et valides (RADIAL/CARDINAL). */
  bands: DistanceBand[];
  /** Nom de chaque secteur (RADIAL/CARDINAL) ou de chaque colonne (GRID). */
  sectorNames: string[];
  /** GRID : nombre de cases par côté. */
  gridSize?: number;
  /** GRID : libellé de la case contenant l'origine. */
  gridCenterLabel?: string;
}

const KM_PER_DEG_LAT = 111.32;

/** Une borne max supérieure ou égale vaut « sans limite » (ex. défaut 5-999). */
export const OPEN_ENDED_KM = 100;

/** Rayon minimal couvert par la grille autour de l'origine. */
export const GRID_RADIUS_KM = 10;

/** Au plus 12 cases de chaque côté du centre : 25 colonnes, A à Y. */
const GRID_MAX_HALF_CELLS = 12;

const ARC_STEP_DEG = 3;

export const CARDINAL_NAMES: Record<number, string[]> = {
  2: ['N', 'S'],
  4: ['N', 'E', 'S', 'O'],
  8: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  16: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'],
};

/**
 * Choix proposés. 16 secteurs n'est plus proposé (48 zones avec 3 plages, noms
 * NNE/ESE peu lisibles en livraison) ; ses noms restent dans CARDINAL_NAMES pour
 * qu'une valeur 16 déjà enregistrée s'affiche correctement.
 */
export const CARDINAL_SECTOR_COUNTS = [4, 8];

export const letter = (index: number): string => String.fromCharCode(65 + index);

export const sectorNames = (type: 'CARDINAL' | 'RADIAL', count: number): string[] => {
  if (type === 'CARDINAL' && CARDINAL_NAMES[count]) return CARDINAL_NAMES[count];
  return Array.from({ length: count }, (_, i) => letter(i));
};

/**
 * Lit "0-3,3-5,5-999" : ignore les plages illisibles ou vides (max <= min),
 * trie par borne min. La numérotation 1, 2, 3… suit cet ordre trié.
 */
export const parseDistanceBands = (csv: string | null | undefined): DistanceBand[] => {
  if (!csv || !csv.trim()) return [];
  return csv
    .split(',')
    .map((part) => {
      const [min, max] = part.split('-').map((v) => Number(v.trim()));
      return { min, max };
    })
    .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max) && b.min >= 0 && b.max > b.min)
    .sort((a, b) => a.min - b.min);
};

export const isOpenEnded = (band: DistanceBand): boolean => band.max >= OPEN_ENDED_KM;

/** Rayon extérieur dessiné : une plage sans limite est tronquée pour rester lisible. */
export const displayOuterKm = (band: DistanceBand): number =>
  isOpenEnded(band) ? Math.max(band.min * 1.5, band.min + 2) : band.max;

const clampCount = (count: number): number => {
  const n = Math.round(Number(count));
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 26);
};

export const offsetKm = (origin: LatLng, eastKm: number, northKm: number): LatLng => ({
  lat: origin.lat + northKm / KM_PER_DEG_LAT,
  lng: origin.lng + eastKm / (KM_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180)),
});

/** Point à `distanceKm` de `origin`, cap en degrés dans le sens horaire depuis le nord. */
export const pointAtBearing = (origin: LatLng, bearingDeg: number, distanceKm: number): LatLng => {
  const rad = (bearingDeg * Math.PI) / 180;
  return offsetKm(origin, distanceKm * Math.sin(rad), distanceKm * Math.cos(rad));
};

const toLocalKm = (origin: LatLng, point: LatLng): { east: number; north: number } => ({
  east: (point.lng - origin.lng) * KM_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180),
  north: (point.lat - origin.lat) * KM_PER_DEG_LAT,
});

/** Début (en degrés) du secteur `index` sur `count`. */
export const sectorStartDeg = (type: 'CARDINAL' | 'RADIAL', count: number, index: number): number => {
  const width = 360 / count;
  return type === 'CARDINAL' ? index * width - width / 2 : index * width;
};

const arc = (center: LatLng, radiusKm: number, fromDeg: number, toDeg: number): LatLng[] => {
  const steps = Math.max(2, Math.ceil(Math.abs(toDeg - fromDeg) / ARC_STEP_DEG));
  return Array.from({ length: steps + 1 }, (_, i) =>
    pointAtBearing(center, fromDeg + ((toDeg - fromDeg) * i) / steps, radiusKm),
  );
};

const annularSector = (center: LatLng, innerKm: number, outerKm: number, fromDeg: number, toDeg: number): LatLng[] => {
  const outer = arc(center, outerKm, fromDeg, toDeg);
  const inner = innerKm > 0 ? arc(center, innerKm, toDeg, fromDeg) : [center];
  return [...outer, ...inner];
};

/** Nombre de cases de part et d'autre de la case centrale. */
export const gridHalfCells = (cellSizeKm: number): number => {
  if (!(cellSizeKm > 0)) return 0;
  return Math.min(GRID_MAX_HALF_CELLS, Math.max(1, Math.ceil(GRID_RADIUS_KM / cellSizeKm - 0.5)));
};

const gridLabel = (col: number, row: number): string => `${letter(col)}${row + 1}`;

/** Origine effective de la grille : celle saisie, sinon l'établissement. */
export const gridOrigin = (settings: EstablishmentDeliveryZone, establishment: LatLng | null): LatLng | null => {
  if (settings.grid_origin_lat != null && settings.grid_origin_lng != null) {
    return { lat: settings.grid_origin_lat, lng: settings.grid_origin_lng };
  }
  return establishment;
};

/**
 * Calcule la découpe à afficher. Retourne null quand il n'y a rien à dessiner
 * (aucun zonage, coordonnées manquantes, paramètres incomplets).
 */
export const buildZonePreview = (
  settings: EstablishmentDeliveryZone,
  establishment: LatLng | null,
): ZonePreview | null => {
  const type = settings.zoning_type;

  if (type === 'GRID') {
    const origin = gridOrigin(settings, establishment);
    const size = Number(settings.grid_cell_size_km);
    const half = gridHalfCells(size);
    if (!origin || half === 0) return null;
    const count = half * 2 + 1;
    const zones: ZoneShape[] = [];
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        const east = (col - half) * size;
        const north = (half - row) * size;
        const h = size / 2;
        zones.push({
          label: gridLabel(col, row),
          path: [
            offsetKm(origin, east - h, north + h),
            offsetKm(origin, east + h, north + h),
            offsetKm(origin, east + h, north - h),
            offsetKm(origin, east - h, north - h),
          ],
          labelAt: offsetKm(origin, east, north),
          sectorIndex: col,
          ringIndex: row,
          openEnded: false,
        });
      }
    }
    return {
      type,
      center: origin,
      zones,
      bands: [],
      sectorNames: Array.from({ length: count }, (_, i) => letter(i)),
      gridSize: count,
      gridCenterLabel: gridLabel(half, half),
    };
  }

  if (type === 'CARDINAL' || type === 'RADIAL') {
    if (!establishment) return null;
    const count = clampCount(type === 'CARDINAL' ? settings.cardinal_cone_count : settings.radial_cone_count);
    const bands = parseDistanceBands(type === 'CARDINAL' ? settings.cardinal_zone_ranges : settings.radial_zone_ranges);
    if (count < 2 || bands.length === 0) return null;
    const names = sectorNames(type, count);
    const width = 360 / count;
    const zones: ZoneShape[] = [];
    names.forEach((name, sectorIndex) => {
      const from = sectorStartDeg(type, count, sectorIndex);
      bands.forEach((band, ringIndex) => {
        const outer = displayOuterKm(band);
        zones.push({
          label: `${name}${ringIndex + 1}`,
          path: annularSector(establishment, band.min, outer, from, from + width),
          labelAt: pointAtBearing(establishment, from + width / 2, (band.min + outer) / 2),
          sectorIndex,
          ringIndex,
          openEnded: isOpenEnded(band),
        });
      });
    });
    return { type, center: establishment, zones, bands, sectorNames: names };
  }

  return null;
};

/**
 * Zone d'un point (adresse de livraison). Référence pour le futur moteur.
 * Retourne null hors découpe (au-delà de la dernière plage, hors grille, dans
 * un trou entre deux plages) ou sans zonage.
 */
export const zoneLabelForPoint = (
  settings: EstablishmentDeliveryZone,
  establishment: LatLng | null,
  point: LatLng,
): string | null => {
  const type = settings.zoning_type;

  if (type === 'GRID') {
    const origin = gridOrigin(settings, establishment);
    const size = Number(settings.grid_cell_size_km);
    const half = gridHalfCells(size);
    if (!origin || half === 0) return null;
    const { east, north } = toLocalKm(origin, point);
    const col = Math.floor(east / size + 0.5) + half;
    const row = half - Math.floor(north / size + 0.5);
    if (col < 0 || row < 0 || col > half * 2 || row > half * 2) return null;
    return gridLabel(col, row);
  }

  if (type === 'CARDINAL' || type === 'RADIAL') {
    if (!establishment) return null;
    const count = clampCount(type === 'CARDINAL' ? settings.cardinal_cone_count : settings.radial_cone_count);
    const bands = parseDistanceBands(type === 'CARDINAL' ? settings.cardinal_zone_ranges : settings.radial_zone_ranges);
    if (count < 2 || bands.length === 0) return null;
    const { east, north } = toLocalKm(establishment, point);
    const distance = Math.hypot(east, north);
    const ringIndex = bands.findIndex((b) => distance >= b.min && distance < b.max);
    if (ringIndex === -1) return null;
    const width = 360 / count;
    const bearing = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
    const shifted = type === 'CARDINAL' ? (bearing + width / 2) % 360 : bearing;
    const sectorIndex = Math.min(count - 1, Math.floor(shifted / width));
    return `${sectorNames(type, count)[sectorIndex]}${ringIndex + 1}`;
  }

  return null;
};
