import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

interface ZoneScore {
  zone: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface ComplianceStats {
  globalComplianceRate: number;
  tasksCompleted: number;
  tasksTotal: number;
  criticalAlerts: number;
  totalZones: number;
}

// Mock data - Replace with API call later
const mockStats: ComplianceStats = {
  globalComplianceRate: 92,
  tasksCompleted: 18,
  tasksTotal: 20,
  criticalAlerts: 2,
  totalZones: 5,
};

const mockZoneScores: ZoneScore[] = [
  { zone: 'Cuisine', score: 95, status: 'excellent' },
  { zone: 'Stockage', score: 88, status: 'good' },
  { zone: 'Salle', score: 89, status: 'good' },
  { zone: 'Prepartation', score: 92, status: 'excellent' },
  { zone: 'Entreposage froid', score: 85, status: 'warning' },
];

// Mock 30-day chart data
const mock30DayData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  compliance: Math.floor(85 + Math.random() * 15),
}));

const getZoneStatusConfig = (status: ZoneScore['status']) => {
  switch (status) {
    case 'excellent':
      return { color: 'bg-green-50 border-green-200', textColor: 'text-green-700', badge: 'bg-green-100 text-green-700' };
    case 'good':
      return { color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' };
    case 'warning':
      return { color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' };
    case 'critical':
      return { color: 'bg-red-50 border-red-200', textColor: 'text-red-700', badge: 'bg-red-100 text-red-700' };
  }
};

export const Compliance = () => {
  const [stats, setStats] = useState<ComplianceStats>(mockStats);
  const [zones, setZones] = useState<ZoneScore[]>(mockZoneScores);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load data - Replace with API call
    setLoading(false);
  }, []);

  const tasksProgress = (stats.tasksCompleted / stats.tasksTotal) * 100;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">HACCP - Conformité</h1>
          <p className="text-sm text-muted-foreground">
            Tableau de bord de sécurité sanitaire et conformité HACCP
          </p>
        </div>

        {/* ═══ KPI CARDS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile
            title="Taux de conformité global"
            value={`${stats.globalComplianceRate}%`}
            icon={ShieldCheck}
            isHighlighted
          />

          <Tile
            title="Tâches du jour"
            value={`${stats.tasksCompleted}/${stats.tasksTotal}`}
            icon={CheckCircle2}
          />

          <Tile
            title="Alertes critiques"
            value={stats.criticalAlerts}
            icon={AlertTriangle}
          />

          <Tile
            title="Total zones"
            value={stats.totalZones}
            icon={AlertCircle}
          />
        </div>

        {/* ═══ ZONE SCORES GRID ═══ */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Scores par zone</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => {
              const config = getZoneStatusConfig(zone.status);
              return (
                <Card key={zone.zone} className={cn('border', config.color)}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{zone.zone}</h3>
                          <p className={cn('text-sm mt-1', config.textColor)}>
                            Score: <span className="font-bold">{zone.score}%</span>
                          </p>
                        </div>
                        <Badge className={cn('capitalize', config.badge)}>
                          {zone.status === 'excellent' && 'Excellent'}
                          {zone.status === 'good' && 'Bon'}
                          {zone.status === 'warning' && 'Attention'}
                          {zone.status === 'critical' && 'Critique'}
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn('h-2 rounded-full transition-all', {
                            'bg-green-500': zone.status === 'excellent',
                            'bg-blue-500': zone.status === 'good',
                            'bg-yellow-500': zone.status === 'warning',
                            'bg-red-500': zone.status === 'critical',
                          })}
                          style={{ width: `${zone.score}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ═══ 30-DAY COMPLIANCE CHART ═══ */}
        <Card className="shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold">Évolution - Conformité (30 derniers jours)</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Taux de conformité journalier</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mock30DayData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Conformité (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Conformité']}
                    labelFormatter={(label) => `Jour ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="compliance"
                    stroke="hsl(var(--primary))"
                    fill="url(#complianceGradient)"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Compliance;
