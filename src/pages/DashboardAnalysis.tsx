/**
 * Dashboard Analysis Page - Complete Implementation
 * 
 * 10-tab analytics dashboard with all tabs implemented
 */

import { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { analyticsService, AccessibleMerchant, ComparisonMode } from '@/services/analyticsService';
import { EstablishmentFilter } from '@/components/analytics/EstablishmentFilter';
import { OrderFilter } from '@/components/analytics/OrderFilter';
import { DEFAULT_ORDER_FILTER, type OrderFilterSelection } from '@/utils/orderFilters';
import { subDays, format } from 'date-fns';
import { Download, ChevronRight } from 'lucide-react';
import { UpsellAnalyticsTab } from '@/components/analytics/UpsellAnalyticsTab';
import { RevenueAnalyticsTab } from '@/components/analytics/RevenueAnalyticsTab';
import { OrdersAnalyticsTab } from '@/components/analytics/OrdersAnalyticsTab';
import { ProductsAnalyticsTab } from '@/components/analytics/ProductsAnalyticsTab';
import { OptionsAnalyticsTab } from '@/components/analytics/OptionsAnalyticsTab';
import { PaymentsAnalyticsTab } from '@/components/analytics/PaymentsAnalyticsTab';
import { VATAnalyticsTab } from '@/components/analytics/VATAnalyticsTab';
import { CancellationsAnalyticsTab } from '@/components/analytics/CancellationsAnalyticsTab';
import { ClientsAnalyticsTab } from '@/components/analytics/ClientsAnalyticsTab';
import { DiscountsAnalyticsTab } from '@/components/analytics/DiscountsAnalyticsTab';
import { ScanNOrderAnalyticsTab } from '@/components/analytics/ScanNOrderAnalyticsTab';
import { KioskAnalyticsTab } from '@/components/analytics/KioskAnalyticsTab';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { TabSystem } from '@/components/shared/TabSystem';
import { toast } from 'sonner';

type TabType = 'ca' | 'commandes' | 'produits' | 'options' | 'annulations' | 'upsell' | 'remises' | 'clients' | 'scannorder' | 'borne' | 'paiements' | 'tva';

// Onglets dont l'endpoint accepte le filtre canal × type de commande
// (OrderFilterRequest, internal/modules/analytics/order_filter.go). Ailleurs
// la carte est masquée plutôt qu'affichée sans effet.
const ORDER_FILTER_TABS: ReadonlySet<TabType> = new Set(['ca', 'commandes', 'produits', 'options', 'annulations', 'upsell']);

interface DateRange {
  from: Date;
  to: Date;
}

export const DashboardAnalysis = () => {
  const { canViewAnalytics } = usePermissions();

  // RBAC lot 10 : gate, redirect if no permission. Kept in this thin
  // wrapper so the early return never sits between two hook calls of the
  // content component below.
  if (!canViewAnalytics) {
    return <Navigate to="/" replace />;
  }

  return <DashboardAnalysisContent />;
};

const DashboardAnalysisContent = () => {
  const isMobile = useIsMobile();
  const { authData } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('ca');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // ==================== SÉLECTEUR ÉTABLISSEMENTS (PROMPT 24 Phase 3) ====================
  // Portée commune à toute la page, comme le filtre de période. Chargé une
  // fois au montage — la liste ne dépend ni de la période ni de l'onglet
  // actif.
  const [accessibleMerchants, setAccessibleMerchants] = useState<AccessibleMerchant[]>([]);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('cumule');
  const [orderFilter, setOrderFilter] = useState<OrderFilterSelection>(DEFAULT_ORDER_FILTER);

  useEffect(() => {
    let isMounted = true;
    analyticsService.getAccessibleMerchants()
      .then((result) => {
        if (!isMounted) return;
        setAccessibleMerchants(result.merchants);
        // Sélection par défaut : l'établissement du token seul (PROMPT 24,
        // "Décisions arrêtées"). Repli sur le premier de la liste si, pour
        // une raison quelconque, l'établissement du token n'y figure pas.
        const tokenMerchantId = authData?.session.merchant_id;
        const defaultId = result.merchants.some((m) => m.merchant_id === tokenMerchantId)
          ? tokenMerchantId
          : result.merchants[0]?.merchant_id;
        setSelectedMerchantIds(defaultId ? [defaultId] : []);
      })
      .catch(() => {
        // Silencieux : chaque onglet gère déjà son propre échec de chargement
        // (403, etc.) — l'absence de sélecteur ne doit pas casser la page,
        // les onglets retombent alors sur le périmètre par défaut du serveur
        // (le seul établissement du token).
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const merchantsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of accessibleMerchants) map[m.merchant_id] = m.name;
    return map;
  }, [accessibleMerchants]);

  // Sélectionner un deuxième établissement passe automatiquement en comparé
  // (PROMPT 24 : "on n'ajoute pas un site pour le noyer dans un total") —
  // bascule possible ensuite vers cumulé via le sélecteur de mode.
  const handleMerchantSelectionChange = (next: string[]) => {
    if (next.length >= 2 && selectedMerchantIds.length < 2) {
      setComparisonMode('compare');
    }
    setSelectedMerchantIds(next);
  };

  // ==================== ONGLETS CA / COMMANDES / PRODUITS / OPTIONS / RÈGLEMENTS / TVA / ANNULATIONS / VENTE ADDITIONNELLE / CLIENTS / REMISES ====================
  // Branchés en SQL direct — voir components/analytics/{Revenue,Orders,Products,Options,Payments,VAT,Cancellations,Upsell,Clients,Discounts}AnalyticsTab.tsx.
  // (Tags retiré, PROMPT 09 lot 3 C4 — voir docs/analytics/TAGS_RETRAIT.md :
  // aucun établissement PROD n'étiquette ses produits.)

  // ==================== RENDU PRINCIPAL ====================
  // Tous les onglets branchés en SQL direct reçoivent le périmètre
  // établissements + le mode ; merchantsById leur permet de rappeler les
  // établissements réellement utilisés (scope.merchant_ids de la réponse),
  // sans avoir à connaître eux-mêmes la liste complète des accessibles.
  const scopeProps = {
    merchantIds: selectedMerchantIds,
    comparisonMode,
    merchantsById,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ca':
        return <RevenueAnalyticsTab dateRange={dateRange} orderFilter={orderFilter} {...scopeProps} />;
      case 'commandes':
        return <OrdersAnalyticsTab dateRange={dateRange} orderFilter={orderFilter} {...scopeProps} />;
      case 'produits':
        return <ProductsAnalyticsTab dateRange={dateRange} orderFilter={orderFilter} {...scopeProps} />;
      case 'options':
        return <OptionsAnalyticsTab dateRange={dateRange} orderFilter={orderFilter} {...scopeProps} />;
      case 'annulations':
        return <CancellationsAnalyticsTab dateRange={dateRange} orderFilter={orderFilter} {...scopeProps} />;
      case 'upsell':
        return <UpsellAnalyticsTab dateRange={dateRange} orderFilter={orderFilter} {...scopeProps} />;
      case 'remises':
        return <DiscountsAnalyticsTab dateRange={dateRange} {...scopeProps} />;
      case 'clients':
        return <ClientsAnalyticsTab dateRange={dateRange} {...scopeProps} />;
      case 'scannorder':
        return <ScanNOrderAnalyticsTab dateRange={dateRange} {...scopeProps} />;
      case 'borne':
        return <KioskAnalyticsTab dateRange={dateRange} {...scopeProps} />;
      case 'paiements':
        return <PaymentsAnalyticsTab dateRange={dateRange} {...scopeProps} />;
      case 'tva':
        return <VATAnalyticsTab dateRange={dateRange} {...scopeProps} />;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'ca', label: 'CA' },
    { id: 'commandes', label: 'Commandes' },
    { id: 'produits', label: 'Produits' },
    { id: 'options', label: 'Options' },
    { id: 'annulations', label: 'Annulations' },
    { id: 'upsell', label: 'Vente additionnelle' },
    { id: 'remises', label: 'Remises' },
    { id: 'clients', label: 'Clients' },
    { id: 'scannorder', label: 'ScanNOrder' },
    { id: 'borne', label: 'Borne' },
    { id: 'paiements', label: 'Règlements' },
    { id: 'tva', label: 'TVA' },
  ];

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <h1 className="text-3xl font-bold text-foreground">Analyse</h1>
        }
        description="Dashboard d'analyse avec statistiques complètes, chiffres d'affaires, commandes et bien plus"
        className="space-y-6"
      >
        {/* Période + établissements globaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Période</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full max-w-sm">
                <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
              </div>
            </CardContent>
          </Card>

          {/* Le sélecteur n'a de raison d'être que pour un compte ayant
              accès à plus d'un établissement (pos.analytics sur plusieurs
              sites) — sinon il n'y a rien à filtrer ni comparer. */}
          {accessibleMerchants.length > 1 && (
            <Card className="bg-card border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Établissements</CardTitle>
              </CardHeader>
              <CardContent>
                <EstablishmentFilter
                  merchants={accessibleMerchants}
                  selected={selectedMerchantIds}
                  onChange={handleMerchantSelectionChange}
                  mode={comparisonMode}
                  onModeChange={setComparisonMode}
                />
              </CardContent>
            </Card>
          )}

          {ORDER_FILTER_TABS.has(activeTab) && (
            <Card className="bg-card border border-border lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Canal et type de commande</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderFilter value={orderFilter} onChange={setOrderFilter} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Onglets avec TabSystem */}
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
          renderContent={() => renderTabContent()}
        />
      </PageContainer>
    </DashboardLayout>
  );
};

export default DashboardAnalysis;
