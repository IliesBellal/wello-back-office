export interface ChairPosition {
  x: number;
  y: number;
}

/**
 * Positions des chaises autour d'une table, relatives au centre de la table (0,0).
 */
export function getChairPositions(
  shape: string,
  tableWidth: number,
  tableHeight: number,
  seats: number,
  gap: number,
  chairRadius: number
): ChairPosition[] {
  const clampedSeats = Math.max(1, Math.min(20, seats));

  if (shape === 'circle' || shape === 'oval') {
    const rx = tableWidth / 2 + gap + chairRadius;
    const ry = tableHeight / 2 + gap + chairRadius;
    const positions: ChairPosition[] = [];
    for (let i = 0; i < clampedSeats; i++) {
      const angle = ((2 * Math.PI) / clampedSeats) * i;
      positions.push({ x: rx * Math.cos(angle), y: ry * Math.sin(angle) });
    }
    return positions;
  }

  // square / rectangle: distribute along the perimeter, starting at mid-top
  const w = tableWidth;
  const h = tableHeight;
  const topY = -h / 2 - gap - chairRadius;
  const rightX = w / 2 + gap + chairRadius;
  const bottomY = h / 2 + gap + chairRadius;
  const leftX = -w / 2 - gap - chairRadius;
  const perimeter = 2 * (w + h);
  const spacing = perimeter / clampedSeats;

  const pointAtDistance = (distance: number): ChairPosition => {
    let d = ((distance % perimeter) + perimeter) % perimeter;

    if (d < w) {
      return { x: -w / 2 + d, y: topY };
    }
    d -= w;

    if (d < h) {
      return { x: rightX, y: -h / 2 + d };
    }
    d -= h;

    if (d < w) {
      return { x: w / 2 - d, y: bottomY };
    }
    d -= w;

    return { x: leftX, y: h / 2 - d };
  };

  const positions: ChairPosition[] = [];
  for (let i = 0; i < clampedSeats; i++) {
    positions.push(pointAtDistance(w / 2 + i * spacing));
  }
  return positions;
}
