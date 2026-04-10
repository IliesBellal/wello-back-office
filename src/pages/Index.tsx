import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { RevenueEvolutionChart } from '@/components/dashboard/RevenueEvolutionChart';
import { QuickProductSheet } from '@/components/dashboard/QuickProductSheet';
import {
  getDashboardSummary,
  type DashboardSummary,
} from '@/services/dashboardService';

const Index = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [productSheetOpen, setProductSheetOpen] = useState(false);

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
      <div className="p-8 lg:p-10 space-y-10 bg-gradient-to-b from-gray-50 to-white/50 min-h-screen">

        {/* ── Header ── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground capitalize">
            {getGreeting()} 👋
          </h1>
          <p className="text-muted-foreground mt-1 capitalize text-sm">{today}</p>
        </div>

        {/* ── Metric Cards ── */}
        <DashboardHero data={data} loading={loading} />

        {/* ── Revenue Evolution Chart ── */}
        <div className="mt-8">
          <RevenueEvolutionChart />
        </div>

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
