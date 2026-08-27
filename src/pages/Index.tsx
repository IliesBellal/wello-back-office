import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { RevenueEvolutionChart } from '@/components/dashboard/RevenueEvolutionChart';
import { QuickProductSheet } from '@/components/dashboard/QuickProductSheet';
import { isApiHttpError } from '@/services/apiClient';
import { getDashboardSummary } from '@/services/dashboardService';

const Index = () => {
  const [productSheetOpen, setProductSheetOpen] = useState(false);

  // RBAC lot 9 (§6 debt): this tile is gated server-side by
  // reports.sales.read. retry:false so a 403 resolves immediately instead of
  // retrying a permission failure; isForbidden distinguishes "masked because
  // this role can't see sales reports" (hide the section entirely) from a
  // genuine load failure (DashboardHero's own "Impossible de charger les
  // métriques" message, unchanged for that case).
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    retry: false,
  });
  const isForbidden = isApiHttpError(error) && error.status === 403;

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
      <div className="bg-gradient-to-b from-gray-50 to-white/50 min-h-screen">
        <PageContainer
          header={
            <div>
              <h1 className="text-3xl font-bold text-foreground capitalize">
                {getGreeting()} 👋
              </h1>
              <p className="text-muted-foreground mt-1 capitalize text-sm">{today}</p>
            </div>
          }
        >
          {/* ── Metric Cards ── */}
          {!isForbidden && (
            <>
              <DashboardHero data={data ?? null} loading={isLoading} />

              {/* ── Revenue Evolution Chart ── */}
              <div className="mt-8">
                <RevenueEvolutionChart data={data?.hourly || []} />
              </div>
            </>
          )}
        </PageContainer>
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
