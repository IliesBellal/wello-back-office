import { UnitOfMeasure } from '@/types/menu';

export const normalizeUnitId = (
  unitId: string | number | null | undefined
): string | undefined => {
  if (unitId === undefined || unitId === null) {
    return undefined;
  }

  const normalizedUnitId = unitId.toString().trim();
  return normalizedUnitId.length > 0 ? normalizedUnitId : undefined;
};

export const findUnitById = (
  units: UnitOfMeasure[],
  unitId: string | number | null | undefined
): UnitOfMeasure | undefined => {
  const normalizedUnitId = normalizeUnitId(unitId);
  if (!normalizedUnitId) {
    return undefined;
  }

  return units.find((unit) => normalizeUnitId(unit.id) === normalizedUnitId);
};

type ConversionEdge = {
  toUnitId: string;
  multiplier: number;
};

const addConversionEdge = (
  graph: Map<string, ConversionEdge[]>,
  fromUnitId: string,
  toUnitId: string,
  multiplier: number
) => {
  const edges = graph.get(fromUnitId) ?? [];
  const existingEdge = edges.find((edge) => edge.toUnitId === toUnitId);

  if (!existingEdge) {
    edges.push({ toUnitId, multiplier });
    graph.set(fromUnitId, edges);
  }
};

const buildConversionGraph = (units: UnitOfMeasure[]): Map<string, ConversionEdge[]> => {
  const graph = new Map<string, ConversionEdge[]>();

  units.forEach((unit) => {
    const unitId = normalizeUnitId(unit.id);
    if (!unitId) {
      return;
    }

    if (!graph.has(unitId)) {
      graph.set(unitId, []);
    }

    (unit.conversions ?? []).forEach((conversion) => {
      const toUnitId = normalizeUnitId(conversion.to_unit_id);
      const multiplier = Number(conversion.multiplier);

      if (!toUnitId || !Number.isFinite(multiplier) || multiplier === 0) {
        return;
      }

      if (!graph.has(toUnitId)) {
        graph.set(toUnitId, []);
      }

      addConversionEdge(graph, unitId, toUnitId, multiplier);
      addConversionEdge(graph, toUnitId, unitId, 1 / multiplier);
    });
  });

  return graph;
};

export const getCompatibleUnitIds = (
  baseUnitId: string | number | null | undefined,
  units: UnitOfMeasure[]
): string[] => {
  const normalizedBaseUnitId = normalizeUnitId(baseUnitId);
  if (!normalizedBaseUnitId) {
    return [];
  }

  const graph = buildConversionGraph(units);
  if (!graph.has(normalizedBaseUnitId)) {
    return [];
  }

  const visited = new Set<string>([normalizedBaseUnitId]);
  const queue = [normalizedBaseUnitId];

  while (queue.length > 0) {
    const currentUnitId = queue.shift();
    if (!currentUnitId) {
      continue;
    }

    (graph.get(currentUnitId) ?? []).forEach((edge) => {
      if (!visited.has(edge.toUnitId)) {
        visited.add(edge.toUnitId);
        queue.push(edge.toUnitId);
      }
    });
  }

  return Array.from(visited);
};

export const getCompatibleUnits = (
  baseUnitId: string | number | null | undefined,
  units: UnitOfMeasure[]
): UnitOfMeasure[] => {
  const baseUnit = findUnitById(units, baseUnitId);
  if (!baseUnit) {
    return [];
  }

  const compatibleUnitIds = getCompatibleUnitIds(baseUnitId, units);
  if (compatibleUnitIds.length === 0) {
    return [baseUnit];
  }

  return units.filter((unit) => {
    const unitId = normalizeUnitId(unit.id);
    return unitId ? compatibleUnitIds.includes(unitId) : false;
  });
};

export const getUnitConversionMultiplier = (
  fromUnitId: string | number | null | undefined,
  toUnitId: string | number | null | undefined,
  units: UnitOfMeasure[]
): number | undefined => {
  const normalizedFromUnitId = normalizeUnitId(fromUnitId);
  const normalizedToUnitId = normalizeUnitId(toUnitId);

  if (!normalizedFromUnitId || !normalizedToUnitId) {
    return undefined;
  }

  if (normalizedFromUnitId === normalizedToUnitId) {
    return 1;
  }

  const graph = buildConversionGraph(units);
  if (!graph.has(normalizedFromUnitId) || !graph.has(normalizedToUnitId)) {
    return undefined;
  }

  const visited = new Set<string>([normalizedFromUnitId]);
  const queue: Array<{ unitId: string; multiplier: number }> = [
    { unitId: normalizedFromUnitId, multiplier: 1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const edges = graph.get(current.unitId) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.toUnitId)) {
        continue;
      }

      const nextMultiplier = current.multiplier * edge.multiplier;
      if (edge.toUnitId === normalizedToUnitId) {
        return nextMultiplier;
      }

      visited.add(edge.toUnitId);
      queue.push({ unitId: edge.toUnitId, multiplier: nextMultiplier });
    }
  }

  return undefined;
};

export const convertQuantity = (
  quantity: number | null | undefined,
  fromUnitId: string | number | null | undefined,
  toUnitId: string | number | null | undefined,
  units: UnitOfMeasure[]
): number | undefined => {
  if (quantity === undefined || quantity === null) {
    return undefined;
  }

  const multiplier = getUnitConversionMultiplier(fromUnitId, toUnitId, units);
  if (multiplier === undefined) {
    return undefined;
  }

  return quantity * multiplier;
};

export const convertUnitPrice = (
  pricePerUnit: number | null | undefined,
  fromUnitId: string | number | null | undefined,
  toUnitId: string | number | null | undefined,
  units: UnitOfMeasure[]
): number | undefined => {
  if (pricePerUnit === undefined || pricePerUnit === null) {
    return undefined;
  }

  const multiplier = getUnitConversionMultiplier(fromUnitId, toUnitId, units);
  if (multiplier === undefined || multiplier === 0) {
    return undefined;
  }

  return pricePerUnit / multiplier;
};