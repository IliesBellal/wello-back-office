import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tile } from '@/components/shared/Tile';
import { ExpandableDataTable, ColumnConfig } from '@/components/shared/ExpandableDataTable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { analyticsService, UpsellByServer, UpsellStatsResponse } from '@/services/analyticsService';

interface UpsellAnalyticsTabProps {
  dateRange: { from: Date; to: Date };
}

const UPSELL_BAR_COLOR = '#8b5cf6';
const TOP_SERVERS_LIMIT = 10;

export const UpsellAnalyticsTab = ({ dateRange }: UpsellAnalyticsTabProps) => {
  const [stats, setStats] = useState<UpsellStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    analyticsService.getUpsellStats(dateRange.from, dateRange.to).then((result) => {
      if (isMounted) {
        setStats(result);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [dateRange.from, dateRange.to]);

  if (isLoading || !stats) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const columns: ColumnConfig<UpsellByServer>[] = [
    { key: 'server_name', label: 'Serveur', sortable: true },
    { key: 'upsell_lines', label: 'Lignes upsell', sortable: true },
    {
      key: 'upsell_revenue_ht',
      label: 'CA upsell HT',
      sortable: true,
      render: (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
    },
  ];

  const chartData = stats.by_server.slice(0, TOP_SERVERS_LIMIT);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile title="Lignes upsell" value={stats.total_upsell_lines} isHighlighted />
        <Tile
          title="CA upsell HT"
          value={stats.upsell_revenue_ht.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <Tile
          title="Taux de commandes avec upsell"
          value={stats.orders_with_upsell_rate.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'}
        />
      </div>

      {stats.by_server.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">CA upsell par serveur</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis type="category" dataKey="server_name" stroke="#6b7280" width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                />
                <Bar dataKey="upsell_revenue_ht" fill={UPSELL_BAR_COLOR} name="CA upsell HT" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Classement par serveur</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpandableDataTable<UpsellByServer>
            columns={columns}
            data={stats.by_server}
            initialSortBy="upsell_revenue_ht"
            initialSortDir="desc"
            emptyMessage="Aucune donnée de vente additionnelle sur cette période"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UpsellAnalyticsTab;
