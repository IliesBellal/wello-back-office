export interface ChairPosition {
  x: number;
  y: number;
}

/**
 * Positions des chaises, centrées sur le bord de la table (moitié dedans,
 * moitié dehors) — même langage visuel que le plan de salle du POS.
 *
 * Répartition automatique — seul `seats` est configurable, aucun
 * positionnement manuel :
 * - Table ronde (et forme inconnue en fallback) : uniforme en cercle
 *   (360° / n chaises).
 * - Table carrée : 1 chaise par côté si seats <= 4, sinon les côtés se
 *   remplissent en tournant (2 par côté à seats === 8).
 * - Table rectangulaire / ovale : côtés longs prioritaires, cycle
 *   [long, long, court] par paire de sièges (2 par long / 0 par court à
 *   seats === 4 ; 2 par long / 1 par court à seats === 6 ; 3 par long / 1 par
 *   court à seats === 8 ; au-delà, les longs continuent à se remplir avant
 *   de déborder sur les courts).
 */
export function getChairPositions(
  shape: string,
  tableWidth: number,
  tableHeight: number,
  seats: number
): ChairPosition[] {
  const n = Math.max(1, Math.min(20, seats));

  switch (shape) {
    case 'square':
      return squarePositions(tableWidth, tableHeight, n);
    case 'rectangle':
    case 'oval':
      return rectPositions(tableWidth, tableHeight, n);
    default:
      // Cercle, et fallback universel pour toute forme inconnue.
      return circlePositions(tableWidth, tableHeight, n);
  }
}

function circlePositions(tableWidth: number, tableHeight: number, n: number): ChairPosition[] {
  const rx = tableWidth / 2;
  const ry = tableHeight / 2;
  const positions: ChairPosition[] = [];
  for (let i = 0; i < n; i++) {
    const angle = ((2 * Math.PI) / n) * i;
    positions.push({ x: rx * Math.cos(angle), y: ry * Math.sin(angle) });
  }
  return positions;
}

/** Distribue `count` points le long d'un segment de longueur `length`, centrés en 0. */
function alongSide(i: number, count: number, length: number): number {
  return ((i + 0.5) / count) * length - length / 2;
}

interface SquareSideCounts {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Nombre de chaises par côté pour un carré : cycle [haut+bas, gauche+droite]
 * appliqué par paire de sièges, pour garantir une répartition symétrique
 * entre côtés opposés (un simple remplissage en tournant côté par côté
 * donnerait par ex. 2/2/1/1 sur deux côtés adjacents à seats === 6, au lieu
 * de 2 sur un couple de côtés opposés et 1 sur l'autre).
 */
function squareSideCounts(n: number): SquareSideCounts {
  const cycle = ['topBottom', 'leftRight'] as const;
  const pairs = Math.floor(n / 2);
  const remainder = n % 2;

  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;

  for (let k = 0; k < pairs; k++) {
    if (cycle[k % 2] === 'topBottom') {
      top++;
      bottom++;
    } else {
      left++;
      right++;
    }
  }

  if (remainder === 1) {
    if (cycle[pairs % 2] === 'topBottom') {
      top++;
    } else {
      left++;
    }
  }

  return { top, bottom, left, right };
}

function squarePositions(tableWidth: number, tableHeight: number, n: number): ChairPosition[] {
  const { top, bottom, left, right } = squareSideCounts(n);
  const positions: ChairPosition[] = [];

  for (let i = 0; i < top; i++) {
    positions.push({ x: alongSide(i, top, tableWidth), y: -tableHeight / 2 });
  }
  for (let i = 0; i < bottom; i++) {
    positions.push({ x: alongSide(i, bottom, tableWidth), y: tableHeight / 2 });
  }
  for (let i = 0; i < left; i++) {
    positions.push({ x: -tableWidth / 2, y: alongSide(i, left, tableHeight) });
  }
  for (let i = 0; i < right; i++) {
    positions.push({ x: tableWidth / 2, y: alongSide(i, right, tableHeight) });
  }
  return positions;
}

interface SideCounts {
  longA: number;
  longB: number;
  shortA: number;
  shortB: number;
}

/**
 * Nombre de chaises par côté pour un rectangle/ovale : cycle [long, long,
 * court] appliqué par paire de sièges (une paire = un siège de chaque côté
 * du groupe), avec le siège impair éventuel attribué au premier côté du
 * groupe suivant dans le cycle.
 */
function rectSideCounts(n: number): SideCounts {
  const cycle = ['long', 'long', 'short'] as const;
  const pairs = Math.floor(n / 2);
  const remainder = n % 2;

  let longA = 0;
  let longB = 0;
  let shortA = 0;
  let shortB = 0;

  for (let k = 0; k < pairs; k++) {
    if (cycle[k % 3] === 'long') {
      longA++;
      longB++;
    } else {
      shortA++;
      shortB++;
    }
  }

  if (remainder === 1) {
    if (cycle[pairs % 3] === 'long') {
      longA++;
    } else {
      shortA++;
    }
  }

  return { longA, longB, shortA, shortB };
}

function rectPositions(tableWidth: number, tableHeight: number, n: number): ChairPosition[] {
  const { longA, longB, shortA, shortB } = rectSideCounts(n);
  const isPortrait = tableHeight > tableWidth;
  const positions: ChairPosition[] = [];

  const addSide = (count: number, length: number, fixedOffset: number, fixedIsY: boolean) => {
    for (let i = 0; i < count; i++) {
      const along = alongSide(i, count, length);
      positions.push(fixedIsY ? { x: along, y: fixedOffset } : { x: fixedOffset, y: along });
    }
  };

  if (isPortrait) {
    // Côtés longs : gauche/droite (le long de la hauteur).
    addSide(longA, tableHeight, -tableWidth / 2, false);
    addSide(longB, tableHeight, tableWidth / 2, false);
    // Côtés courts : haut/bas (le long de la largeur).
    addSide(shortA, tableWidth, -tableHeight / 2, true);
    addSide(shortB, tableWidth, tableHeight / 2, true);
  } else {
    // Côtés longs : haut/bas (le long de la largeur).
    addSide(longA, tableWidth, -tableHeight / 2, true);
    addSide(longB, tableWidth, tableHeight / 2, true);
    // Côtés courts : gauche/droite (le long de la hauteur).
    addSide(shortA, tableHeight, -tableWidth / 2, false);
    addSide(shortB, tableHeight, tableWidth / 2, false);
  }

  return positions;
}
