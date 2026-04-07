/**
 * Graphique recommandé — Évolution horaire du CA par canal
 *
 * Pourquoi ce graphique est essentiel pour un restaurateur :
 *  • Identifie les pics et creux de charge par source de commande
 *  • Permet d'optimiser les effectifs heure par heure selon le canal dominant
 *  • Donne une lecture immédiate de la part du digital (UE, Deliveroo, livraison)
 *    vs la salle — information critique pour les décisions stratégiques
 *  • Référence dans les tableaux de bord des groupes leaders (McDonald's, Amrest,
 *    Elior) : la décomposition du CA en temps réel par canal est la donnée n°1
 *    demandée par les directeurs de restaurant
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { HourlyChannelData } from '@/services/dashboardService';

interface RevenueByChannelChartProps {
  data: HourlyChannelData[];
}

const CHANNELS = [
  { key: 'sur_place',  label: 'Sur place',      color: '#6366f1' },
  { key: 'emporter',  label: 'À emporter',     color: '#22c55e' },
  { key: 'livraison', label: 'Livraison propre',color: '#f97316' },
  { key: 'uber_eats', label: 'Uber Eats',       color: '#1c1917' },
  { key: 'deliveroo', label: 'Deliveroo',        color: '#00ccbc' },
] as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const RevenueByChannelChart = ({ data }: RevenueByChannelChartProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          CA par canal — évolution horaire
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ventilation du chiffre d'affaires par source de commande tout au long de la journée
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {CHANNELS.map((ch) => (
                  <linearGradient key={ch.key} id={`grad_${ch.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ch.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ch.color} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => `${v / 1000}k`}
                dx={-6}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const total = payload.reduce((sum, p) => sum + (p.value as number), 0);
                    return (
                      <div className="bg-card border border-border rounded-lg shadow-lg p-3 space-y-1.5 min-w-[180px]">
                        <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
                        {payload.map((p) => (
                          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              <span className="text-muted-foreground">{p.name}</span>
                            </div>
                            <span className="font-medium text-foreground tabular-nums">
                              {formatCurrency(p.value as number)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-border/60 pt-1.5 flex justify-between text-xs font-semibold">
                          <span className="text-foreground">Total</span>
                          <span className="text-foreground tabular-nums">{formatCurrency(total)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                formatter={(value) => (
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>
                )}
              />
              {CHANNELS.map((ch) => (
                <Area
                  key={ch.key}
                  type="monotone"
                  dataKey={ch.key}
                  name={ch.label}
                  stroke={ch.color}
                  strokeWidth={2}
                  fill={`url(#grad_${ch.key})`}
                  stackId="1"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
