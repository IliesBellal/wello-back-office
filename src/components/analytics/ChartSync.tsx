import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { merchantColor } from '@/utils/merchantColors';

/**
 * Cross-chart hover sync for the per-establishment comparison sections
 * (Analyse, mode comparé — jusqu'à 5 établissements) : survoler une part
 * d'un graphique "Répartition" doit mettre en évidence la même catégorie sur
 * les graphiques des autres établissements du même groupe.
 *
 * Recharts synchronise nativement les graphiques à axes (Area/Line/Bar) via
 * la prop `syncId` — utilisée directement dans les onglets pour les
 * graphiques d'évolution. Il n'existe pas d'équivalent pour les PieChart (pas
 * d'axe commun), d'où ce contexte : un seul état "catégorie survolée" partagé
 * par tous les <SyncedPie> d'un même groupe (ex. tous les "Répartition CA"
 * de la section Détail par établissement).
 */
interface PieSyncState {
  key: string;
  sourceId: string;
}

interface PieSyncContextValue {
  hovered: PieSyncState | null;
  setHovered: (state: PieSyncState | null) => void;
}

const PieSyncContext = createContext<PieSyncContextValue | null>(null);

export function PieSyncGroup({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState<PieSyncState | null>(null);
  const value = useMemo(() => ({ hovered, setHovered }), [hovered]);
  return <PieSyncContext.Provider value={value}>{children}</PieSyncContext.Provider>;
}

function usePieSync(): PieSyncContextValue {
  const ctx = useContext(PieSyncContext);
  if (!ctx) {
    throw new Error('SyncedPie must be rendered inside a <PieSyncGroup>');
  }
  return ctx;
}

export interface SyncedPieSlice {
  key: string;
  name: string;
  value: number;
  color: string;
}

interface SyncedPieProps {
  /** Unique id for this chart instance within its group — the establishment id. */
  sourceId: string;
  data: SyncedPieSlice[];
  valueFormatter: (value: number) => string;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  emptyLabel?: string;
}

/**
 * One establishment's Pie chart within a <PieSyncGroup>. Hovering a slice
 * (here or on any other chart in the group) dims the other slices on every
 * chart in the group and shows a small badge with this establishment's own
 * value for that category — the native <Tooltip> still follows the mouse on
 * whichever chart is actually being hovered.
 */
export function SyncedPie({
  sourceId,
  data,
  valueFormatter,
  innerRadius = 0,
  outerRadius = 80,
  height = 260,
  emptyLabel = 'Aucune donnée sur cette période',
}: SyncedPieProps) {
  const { hovered, setHovered } = usePieSync();

  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyLabel}</div>;
  }

  const matched = hovered ? data.find((d) => d.key === hovered.key) : undefined;
  const showBadge = hovered && hovered.sourceId !== sourceId;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label
            onMouseEnter={(entry: SyncedPieSlice) => setHovered({ key: entry.key, sourceId })}
            onMouseLeave={() => setHovered(null)}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={entry.color}
                fillOpacity={hovered && hovered.key !== entry.key ? 0.35 : 1}
                stroke={hovered && hovered.key === entry.key ? '#111827' : undefined}
                strokeWidth={hovered && hovered.key === entry.key ? 2 : undefined}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            formatter={(value: number) => valueFormatter(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {showBadge && (
        <div
          className="absolute top-2 right-2 rounded-md px-2 py-1 text-xs text-white pointer-events-none"
          style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
        >
          {matched ? (
            <>
              <span className="font-medium">{matched.name} : </span>
              {valueFormatter(matched.value)}
            </>
          ) : (
            <span className="text-gray-400">Aucune donnée</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Section header for one establishment's duplicated chart block — color swatch + name, keyed off the shared merchant palette (utils/merchantColors.ts). */
export function EstablishmentSectionTitle({ merchantId, label }: { merchantId: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-3 h-3 rounded-sm shrink-0"
        style={{ backgroundColor: merchantColor(merchantId) }}
      />
      <h3 className="text-base font-semibold text-foreground">{label}</h3>
    </div>
  );
}
