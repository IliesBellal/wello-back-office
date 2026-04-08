import { useMemo } from 'react';
import { HeroMetricCard } from './HeroMetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Euro, ShoppingCart, Receipt } from 'lucide-react';
import type { DashboardSummary } from '@/services/dashboardService';

interface DashboardHeroProps {
  data: DashboardSummary | null;
  loading?: boolean;
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const calculateTrend = (today: number, yesterday: number): { text: string; trend: 'up' | 'down' | 'neutral' } => {
  if (yesterday === 0) {
    return { text: 'N/A', trend: 'neutral' };
  }
  
  const percentChange = ((today - yesterday) / yesterday) * 100;
  const rounded = Math.round(percentChange);
  
  if (rounded > 0) {
    return { text: `+${rounded}%`, trend: 'up' };
  } else if (rounded < 0) {
    return { text: `${rounded}%`, trend: 'down' };
  }
  return { text: '0%', trend: 'neutral' };
};

export const DashboardHero = ({ data, loading }: DashboardHeroProps) => {
  const metrics = useMemo(() => {
    if (!data) return null;

    const revenueToday = data.kpis.revenue.today;
    const revenueYesterday = data.kpis.revenue.yesterday;
    const ordersToday = data.kpis.orders.today;
    const ordersYesterday = data.kpis.orders.yesterday;
    const avgBasketToday = data.kpis.avg_basket.today;
    const avgBasketYesterday = data.kpis.avg_basket.yesterday;

    return {
      revenue: {
        value: formatCurrency(revenueToday),
        comparison: calculateTrend(revenueToday, revenueYesterday),
        subtitle: `Hier: ${formatCurrency(revenueYesterday)}`,
      },
      orders: {
        value: `${new Intl.NumberFormat('fr-FR').format(ordersToday)}`,
        comparison: calculateTrend(ordersToday, ordersYesterday),
        subtitle: `Hier: ${ordersYesterday} commandes`,
      },
      avgBasket: {
        value: formatCurrency(avgBasketToday),
        comparison: calculateTrend(avgBasketToday, avgBasketYesterday),
        subtitle: `Hier: ${formatCurrency(avgBasketYesterday)}`,
      },
    };
  }, [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[160px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Impossible de charger les métriques</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* CA du jour */}
      <HeroMetricCard
        title="Chiffre d'affaires"
        icon={Euro}
        value={metrics.revenue.value}
        comparison={metrics.revenue.comparison}
        subtitle={metrics.revenue.subtitle}
      />

      {/* Nombre de commandes */}
      <HeroMetricCard
        title="Commandes"
        icon={ShoppingCart}
        value={metrics.orders.value}
        comparison={metrics.orders.comparison}
        subtitle={metrics.orders.subtitle}
      />

      {/* Panier moyen */}
      <HeroMetricCard
        title="Panier moyen"
        icon={Receipt}
        value={metrics.avgBasket.value}
        comparison={metrics.avgBasket.comparison}
        subtitle={metrics.avgBasket.subtitle}
      />
    </div>
  );
};
