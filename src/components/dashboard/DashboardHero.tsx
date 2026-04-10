import { useMemo } from 'react';
import { RevenueCard } from './RevenueCard';
import { MetricCard } from './MetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Banknote } from 'lucide-react';
import type { DashboardSummary } from '@/services/dashboardService';

interface DashboardHeroProps {
  data: DashboardSummary | null;
  loading?: boolean;
}

const calculateTrend = (
  current: number,
  previous: number
): { text: string; direction: 'up' | 'down' | 'neutral' } => {
  if (previous === 0) {
    return { text: 'N/A', direction: 'neutral' };
  }

  const percentChange = ((current - previous) / previous) * 100;
  const rounded = Math.round(percentChange);

  if (rounded > 0) {
    return { text: `+${rounded}%`, direction: 'up' };
  } else if (rounded < 0) {
    return { text: `${rounded}%`, direction: 'down' };
  }
  return { text: '0%', direction: 'neutral' };
};

export const DashboardHero = ({ data, loading }: DashboardHeroProps) => {
  const metrics = useMemo(() => {
    if (!data) return null;

    const revenue = data.kpis.revenue;
    const orders = data.kpis.orders;
    const avgBasket = data.kpis.avg_basket;

    return {
      revenue: {
        day: {
          value: revenue.today,
          currency: revenue.currency,
          comparison: calculateTrend(revenue.today, revenue.yesterday),
        },
        week: {
          value: revenue.week.current,
          currency: revenue.currency,
          comparison: calculateTrend(revenue.week.current, revenue.week.previous_period),
        },
        month: {
          value: revenue.month.current,
          currency: revenue.currency,
          comparison: calculateTrend(revenue.month.current, revenue.month.previous_period),
        },
      },
      commandesJour: {
        label: 'Commandes du jour',
        value: orders.today,
        icon: ShoppingCart,
        comparison: calculateTrend(orders.today, orders.yesterday),
        context: `vs hier : ${orders.yesterday} commandes`,
      },
      panierMoyen: {
        label: 'Panier moyen',
        value: revenue.currency === 'EUR' 
          ? new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: revenue.currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(avgBasket.today / 100)
          : avgBasket.today,
        icon: Banknote,
        comparison: calculateTrend(avgBasket.today, avgBasket.yesterday),
        context: `vs hier : ${new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: revenue.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(avgBasket.yesterday / 100)}`,
      },
    };
  }, [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3">
          <Skeleton className="h-[200px] rounded-lg" />
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
        <Skeleton className="h-[200px] rounded-lg" />
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
    <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
      {/* Revenue Card - 3 colonnes */}
      <div className="md:col-span-3">
        <RevenueCard
          day={metrics.revenue.day}
          week={metrics.revenue.week}
          month={metrics.revenue.month}
        />
      </div>

      {/* Commandes du jour - 1 colonne */}
      <MetricCard
        label={metrics.commandesJour.label}
        value={metrics.commandesJour.value}
        icon={metrics.commandesJour.icon}
        comparison={metrics.commandesJour.comparison}
        context={metrics.commandesJour.context}
      />

      {/* Panier moyen - 1 colonne */}
      <MetricCard
        label={metrics.panierMoyen.label}
        value={metrics.panierMoyen.value}
        icon={metrics.panierMoyen.icon}
        comparison={metrics.panierMoyen.comparison}
        context={metrics.panierMoyen.context}
      />
    </div>
  );
};
