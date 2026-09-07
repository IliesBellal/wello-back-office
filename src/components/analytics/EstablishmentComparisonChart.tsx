import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { merchantColor } from '@/utils/merchantColors';

export interface EstablishmentComparisonPoint {
  merchantId: string;
  label: string;
  value: number;
}

interface EstablishmentComparisonChartProps {
  data: EstablishmentComparisonPoint[];
  valueLabel: string;
  valueFormatter: (value: number) => string;
}

/**
 * One bar per establishment (PROMPT 24 Phase 4's "graphique à N séries") —
 * the shape the by_merchant contract actually provides is one total per
 * establishment for the period, not a per-establishment timeline, so a bar
 * chart is the natural N-series form here, not a multi-line chart. Shared
 * across the 5 comparable tabs (CA, Commandes, Règlements, TVA, Annulations)
 * so the color/legend logic exists in exactly one place.
 *
 * Color comes from merchantColor(merchantId) — stable by identity, never by
 * this array's index — and the legend is always rendered (not left to
 * Recharts' default, which can't build one from a single dataKey's per-Cell
 * colors on its own): PROMPT 24 requires the legend visible whenever
 * establishments are compared, and legibility checked up to 5 series.
 */
export function EstablishmentComparisonChart({ data, valueLabel, valueFormatter }: EstablishmentComparisonChartProps) {
  if (data.length === 0) return null;

  const legendPayload = data.map((d) => ({
    value: d.label,
    type: 'square' as const,
    color: merchantColor(d.merchantId),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, 60 * data.length)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" stroke="#6b7280" />
        <YAxis dataKey="label" type="category" stroke="#6b7280" width={140} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
          formatter={(value: number) => valueFormatter(value)}
        />
        <Legend payload={legendPayload} />
        <Bar dataKey="value" name={valueLabel}>
          {data.map((entry) => (
            <Cell key={entry.merchantId} fill={merchantColor(entry.merchantId)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default EstablishmentComparisonChart;
