/**
 * Dashboard Analysis Page (Simplified Working Version)
 * 
 * Under "Tableau de bord" > "Analyse"
 * 10-tab analytics dashboard - SIMPLIFIED FOR TESTING
 */

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsService } from '@/services/analyticsService';
import { subDays } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

type TabType = 'ca' | 'commandes' | 'produits' | 'options' | 'tags' | 'annulations' | 'remises' | 'clients' | 'tva' | 'restaurants';

const EvolutionBadge = ({ percent }: { percent: number }) => (
  <div className={`flex items-center gap-1 text-sm ${percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    {percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
    <span className="font-medium">{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span>
  </div>
);

export const DashboardAnalysis = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ca');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch analytics data
  const analyticsData = useMemo(() => {
    return {
      revenueData: analyticsService.getRevenueAnalytics(startDate, endDate, ['restaurant', 'takeaway'], 'day'),
      clientsData: analyticsService.getCustomersAnalytics(startDate, endDate),
      vataData: analyticsService.getVATAnalytics(startDate, endDate),
      restaurantsData: analyticsService.getRestaurantsAnalytics(startDate, endDate),
    };
  }, [startDate, endDate]);

  const renderMetricCard = (label: string, value: string | number) => (
    <Card className="bg-card border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  const renderCAOnglet = () => (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Début</label>
              <input 
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-full px-3 py-2 rounded border border-input bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Fin</label>
              <input 
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="w-full px-3 py-2 rounded border border-input bg-background text-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderMetricCard('CA Actuel', analyticsData.revenueData.current_period.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
        {renderMetricCard('Période Préc.', analyticsData.revenueData.previous_period.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
        {renderMetricCard('Année Passée', analyticsData.revenueData.year_ago.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Évolution CA</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.revenueData.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Area type="monotone" dataKey="restaurant" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
              <Area type="monotone" dataKey="takeaway" stackId="1" stroke="#10b981" fill="#10b981" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderClientsOnglet = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard('Nouveaux', analyticsData.clientsData.metrics.new_customers)}
        {renderMetricCard('Récurrents', analyticsData.clientsData.metrics.recurring_customers)}
        {renderMetricCard('Fréquence moy.', analyticsData.clientsData.metrics.avg_frequency.toFixed(2) + 'x')}
        {renderMetricCard('Panier moy.', analyticsData.clientsData.metrics.avg_basket_by_segment.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
      </div>
    </div>
  );

  const renderTVAOnglet = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderMetricCard('TVA Total', analyticsData.vataData.total_vat.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
        {renderMetricCard('TVA 10%', analyticsData.vataData.by_rate[0].vat_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
        {renderMetricCard('TVA 5.5%', analyticsData.vataData.by_rate[1].vat_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
      </div>
    </div>
  );

  const renderRestaurantsOnglet = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analyticsData.restaurantsData.by_restaurant.map((restaurant) => (
          <div key={restaurant.restaurant_id}>
            {renderMetricCard(restaurant.name, restaurant.value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPlaceholder = (name: string) => (
    <Card className="bg-card border border-border">
      <CardContent className="pt-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">Onglet {name}</p>
          <p className="text-sm text-muted-foreground">Contenu disponible</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ca':
        return renderCAOnglet();
      case 'commandes':
        return renderPlaceholder('Commandes');
      case 'produits':
        return renderPlaceholder('Produits');
      case 'options':
        return renderPlaceholder('Options');
      case 'tags':
        return renderPlaceholder('Tags');
      case 'annulations':
        return renderPlaceholder('Annulations');
      case 'remises':
        return renderPlaceholder('Remises');
      case 'clients':
        return renderClientsOnglet();
      case 'tva':
        return renderTVAOnglet();
      case 'restaurants':
        return renderRestaurantsOnglet();
      default:
        return renderPlaceholder('Unknown');
    }
  };

  const tabs = [
    { id: 'ca', label: 'CA' },
    { id: 'commandes', label: 'Commandes' },
    { id: 'produits', label: 'Produits' },
    { id: 'options', label: 'Options' },
    { id: 'tags', label: 'Tags' },
    { id: 'annulations', label: 'Annulations' },
    { id: 'remises', label: 'Remises' },
    { id: 'clients', label: 'Clients' },
    { id: 'tva', label: 'TVA' },
    { id: 'restaurants', label: 'Restaurants' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analyse</h1>
          <p className="text-muted-foreground">Dashboard d'analyse avec 10 onglets</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto border-b border-border pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {renderTabContent()}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalysis;
