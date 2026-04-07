import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { KPICard } from '@/components/dashboard/KPICard';
import { HourlyChannelChart } from '@/components/dashboard/HourlyChannelChart';
import { QuickProductSheet } from '@/components/dashboard/QuickProductSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Euro, Receipt, ShoppingCart, ClipboardList, AlertTriangle } from 'lucide-react';
import {
  getDashboardSummary,
  type DashboardSummary,
} from '@/services/dashboardService';

const Index = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [ruptureSheetOpen, setRuptureSheetOpen] = useState(false);

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .catch((err) => console.error('Failed to fetch dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground capitalize">
                {getGreeting()} 👋
              </h1>
              {data?.alerts && data.alerts.low_stock_count > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {data.alerts.low_stock_count} rupture{data.alerts.low_stock_count > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 capitalize text-sm">{today}</p>
          </div>
          <QuickActions
            onNewProduct={() => setProductSheetOpen(true)}
            onMarkRupture={() => setRuptureSheetOpen(true)}
          />
        </div>

        {/* ── KPI Cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] rounded-2xl" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* CA */}
            <KPICard
              title="Chiffre d'affaires"
              icon={Euro}
              data={data.kpis.revenue}
              format="currency"
              currency={data.kpis.revenue.currency}
              target={data.kpis.revenue.target_day}
              targetLabel="Objectif journalier"
              badge={
                data.kpis.revenue.in_progress_amount > 0
                  ? {
                      label: 'En cours',
                      value: `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(data.kpis.revenue.in_progress_amount)}`,
                      color: 'warning',
                    }
                  : undefined
              }
            />
            {/* Ticket moyen */}
            <KPICard
              title="Ticket moyen"
              icon={Receipt}
              data={data.kpis.avg_ticket}
              format="currency"
              currency={data.kpis.avg_ticket.currency}
            />
            {/* Panier moyen */}
            <KPICard
              title="Panier moyen"
              icon={ShoppingCart}
              data={data.kpis.avg_basket}
              format="currency"
              currency={data.kpis.avg_basket.currency}
            />
            {/* Commandes */}
            <KPICard
              title="Commandes"
              icon={ClipboardList}
              data={data.kpis.orders}
              format="integer"
              badge={{
                label: 'En cours',
                value: data.kpis.orders.in_progress,
                color: data.kpis.orders.in_progress > 15 ? 'danger' : 'warning',
              }}
            />
          </div>
        ) : null}

        {/* ── Row 2 : Évolution - Commandes & CA ── */}
        {loading ? (
          <Skeleton className="h-[360px] rounded-2xl" />
        ) : data ? (
          <HourlyChannelChart data={data.hourly} />
        ) : null}
      </div>

      {/* Quick Product Creation Sheet */}
      <QuickProductSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
      />

      {/*
        TODO: RuptureSheet — sheet de déclaration de rupture
        Paramètre: open={ruptureSheetOpen} onOpenChange={setRuptureSheetOpen}
      */}
    </DashboardLayout>
  );
};

export default Index;
