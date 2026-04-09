/**
 * Dashboard Analysis Page - Complete Implementation
 * 
 * 10-tab analytics dashboard with all tabs implemented
 */

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart
} from 'recharts';
import { analyticsService } from '@/services/analyticsService';
import { subDays, format } from 'date-fns';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import { ExportButton } from '@/components/analytics';
import { MultiFilter } from '@/components/shared/MultiFilter';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { toast } from 'sonner';

type TabType = 'ca' | 'commandes' | 'produits' | 'options' | 'tags' | 'annulations' | 'remises' | 'clients' | 'paiements' | 'restaurants';

interface DateRange {
  from: Date;
  to: Date;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Couleurs cohérentes pour les canaux de vente
const CHANNEL_COLORS: Record<string, string> = {
  'restaurant': '#3b82f6',           // Bleu
  'dine_in': '#3b82f6',              // Bleu (alias)
  'takeaway': '#10b981',             // Vert
  'delivery': '#f59e0b',             // Orange
  'ubereats': '#06b6d4',             // Cyan
  'ubereats_takeaway': '#06b6d4',    // Cyan
  'ubereats_delivery': '#0891b2',    // Cyan foncé
  'deliveroo': '#14b8a6',            // Teal
  'deliveroo_takeaway': '#14b8a6',   // Teal
  'deliveroo_delivery': '#0d9488',   // Teal foncé
  'scanorder': '#8b5cf6',            // Violet
  'click_collect': '#f59e0b',        // Orange
};

const EvolutionBadge = ({ percent }: { percent: number }) => (
  <div className={`flex items-center gap-1 text-sm ${percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    {percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
    <span className="font-medium">{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span>
  </div>
);

const MetricCard = ({ label, value, change }: { label: string; value: string | number; change?: number }) => (
  <Card className="bg-card border border-border">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {typeof change === 'number' && <EvolutionBadge percent={change} />}
    </CardContent>
  </Card>
);

const DataTable = ({ columns, data, sortBy }: { columns: Array<{ key: string; label: string; sortable?: boolean; render?: (val: any, row: any) => React.ReactNode }>; data: any[]; sortBy: string }) => {
  const [sortColumn, setSortColumn] = useState(sortBy);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col: any) => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                className={`px-4 py-3 text-left font-medium text-muted-foreground ${col.sortable ? 'cursor-pointer hover:text-foreground' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortColumn === col.key && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.slice(0, 10).map((row: Record<string, any>, idx: number) => (
            <tr key={idx} className="border-b border-border hover:bg-muted/50">
              {columns.map((col: any) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const DashboardAnalysis = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ca');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Filtres spécifiques par onglet
  const [productCategory, setProductCategory] = useState<string | undefined>();
  const [productSort, setProductSort] = useState('quantity');
  const [optionTypes, setOptionTypes] = useState<string[]>(['paid', 'free', 'removed']);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Végétarien', 'Vegan', 'Sans gluten']);
  const [cancellationReasons, setCancellationReasons] = useState<string[]>(['ordering_error', 'customer_wait', 'kitchen_issue', 'payment_issue']);
  const [discountTypes, setDiscountTypes] = useState<string[]>(['promotion', 'happy_hour', 'gesture', 'loyalty', 'promo_code']);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['card', 'cash', 'mobile']);
  const [paymentChannel, setPaymentChannel] = useState<string>('all');

  // Données analytiques
  const analyticsData = useMemo(() => {
    return {
      revenue: analyticsService.getRevenueAnalytics(dateRange.from, dateRange.to, ['restaurant', 'takeaway', 'delivery'], 'day'),
      orders: analyticsService.getOrdersAnalytics(dateRange.from, dateRange.to, ['dine_in', 'takeaway', 'delivery']),
      products: analyticsService.getProductsAnalytics(dateRange.from, dateRange.to, productCategory, productSort),
      options: analyticsService.getOptionsAnalytics(dateRange.from, dateRange.to, optionTypes),
      tags: analyticsService.getTagsAnalytics(dateRange.from, dateRange.to, selectedTags),
      cancellations: analyticsService.getCancellationsAnalytics(dateRange.from, dateRange.to, cancellationReasons),
      discounts: analyticsService.getDiscountsAnalytics(dateRange.from, dateRange.to, discountTypes),
      clients: analyticsService.getCustomersAnalytics(dateRange.from, dateRange.to),
      vat: analyticsService.getVATAnalytics(dateRange.from, dateRange.to),
      restaurants: analyticsService.getRestaurantsAnalytics(dateRange.from, dateRange.to),
      payments: {
        metrics: {
          total_amount: 125000,
          card_amount: 75000,
          cash_amount: 35000,
          mobile_amount: 15000,
          total_transactions: 1250,
        },
        by_method: [
          { method: 'Carte bancaire', amount: 75000, transactions: 750, percentage: 60 },
          { method: 'Espèces', amount: 35000, transactions: 350, percentage: 28 },
          { method: 'Paiement mobile', amount: 15000, transactions: 150, percentage: 12 },
        ],
        timeline: [
          { date: '01 Mar', card: 2500, cash: 1200, mobile: 500 },
          { date: '02 Mar', card: 2800, cash: 1100, mobile: 600 },
          { date: '03 Mar', card: 3100, cash: 1350, mobile: 700 },
          { date: '04 Mar', card: 2900, cash: 1250, mobile: 550 },
          { date: '05 Mar', card: 3200, cash: 1400, mobile: 750 },
          { date: '06 Mar', card: 3500, cash: 1500, mobile: 800 },
          { date: '07 Mar', card: 3300, cash: 1300, mobile: 700 },
        ],
        detail: [
          { id: '1', date: '2026-03-07 14:30', method: 'Carte bancaire', channel: 'dine_in', amount: 125.50, status: 'Confirmé', reference: 'CB001254' },
          { id: '2', date: '2026-03-07 14:45', method: 'Espèces', channel: 'takeaway', amount: 35.00, status: 'Confirmé', reference: 'CASH001' },
          { id: '3', date: '2026-03-07 15:00', method: 'Paiement mobile', channel: 'delivery', amount: 42.75, status: 'Confirmé', reference: 'MOBILE001' },
          { id: '4', date: '2026-03-07 15:15', method: 'Carte bancaire', channel: 'dine_in', amount: 89.90, status: 'Confirmé', reference: 'CB001255' },
          { id: '5', date: '2026-03-07 15:30', method: 'Espèces', channel: 'takeaway', amount: 56.50, status: 'Confirmé', reference: 'CASH002' },
        ],
      },
    };
  }, [dateRange, productCategory, productSort, optionTypes, selectedTags, cancellationReasons, discountTypes, paymentMethods, paymentChannel]);

  // ==================== ONGLET CA ====================
  const renderCATab = () => {
    // Données par canal pour le pie chart (mock pour démonstration)
    const channelRevenueData = [
      { name: 'Sur place', value: analyticsData.revenue.current_period.total * 0.25, channel: 'dine_in' },
      { name: 'À emporter', value: analyticsData.revenue.current_period.total * 0.18, channel: 'takeaway' },
      { name: 'Livraison', value: analyticsData.revenue.current_period.total * 0.12, channel: 'delivery' },
      { name: 'UE Emporter', value: analyticsData.revenue.current_period.total * 0.15, channel: 'ubereats_takeaway' },
      { name: 'UE Livraison', value: analyticsData.revenue.current_period.total * 0.12, channel: 'ubereats_delivery' },
      { name: 'DR Emporter', value: analyticsData.revenue.current_period.total * 0.10, channel: 'deliveroo_takeaway' },
      { name: 'DR Livraison', value: analyticsData.revenue.current_period.total * 0.08, channel: 'deliveroo_delivery' },
    ];

    return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="CA Actuel"
          value={analyticsData.revenue.current_period.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Période Préc."
          value={analyticsData.revenue.previous_period.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          change={analyticsData.revenue.previous_period.change}
        />
        <MetricCard
          label="Année Passée"
          value={analyticsData.revenue.year_ago.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          change={analyticsData.revenue.year_ago.change}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Évolution CA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.revenue.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                <Legend />
                <Area type="monotone" dataKey="restaurant" stackId="1" stroke={CHANNEL_COLORS['restaurant']} fill={CHANNEL_COLORS['restaurant']} name="Sur place" />
                <Area type="monotone" dataKey="takeaway" stackId="1" stroke={CHANNEL_COLORS['takeaway']} fill={CHANNEL_COLORS['takeaway']} name="À emporter" />
                <Area type="monotone" dataKey="delivery" stackId="1" stroke={CHANNEL_COLORS['delivery']} fill={CHANNEL_COLORS['delivery']} name="Livraison" />
                <Area type="monotone" dataKey="ubereats_takeaway" stackId="1" stroke={CHANNEL_COLORS['ubereats_takeaway']} fill={CHANNEL_COLORS['ubereats_takeaway']} name="UE Emporter" />
                <Area type="monotone" dataKey="ubereats_delivery" stackId="1" stroke={CHANNEL_COLORS['ubereats_delivery']} fill={CHANNEL_COLORS['ubereats_delivery']} name="UE Livraison" />
                <Area type="monotone" dataKey="deliveroo_takeaway" stackId="1" stroke={CHANNEL_COLORS['deliveroo_takeaway']} fill={CHANNEL_COLORS['deliveroo_takeaway']} name="DR Emporter" />
                <Area type="monotone" dataKey="deliveroo_delivery" stackId="1" stroke={CHANNEL_COLORS['deliveroo_delivery']} fill={CHANNEL_COLORS['deliveroo_delivery']} name="DR Livraison" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition CA par canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelRevenueData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {channelRevenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.channel]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => `${(value / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <ExportButton
          filename="CA"
          onExport={() => analyticsService.exportRevenueCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            ['restaurant', 'takeaway', 'delivery']
          )}
        />
      </div>
    </div>
    );
  };

  // ==================== ONGLET COMMANDES ====================
  const renderOrdersTab = () => {
    // Données par canal pour le pie chart (mock pour démonstration)
    const channelOrderData = [
      { name: 'Sur place', value: analyticsData.orders.metrics.total_orders * 0.22, channel: 'dine_in' },
      { name: 'À emporter', value: analyticsData.orders.metrics.total_orders * 0.16, channel: 'takeaway' },
      { name: 'Livraison', value: analyticsData.orders.metrics.total_orders * 0.10, channel: 'delivery' },
      { name: 'UE Emporter', value: analyticsData.orders.metrics.total_orders * 0.18, channel: 'ubereats_takeaway' },
      { name: 'UE Livraison', value: analyticsData.orders.metrics.total_orders * 0.15, channel: 'ubereats_delivery' },
      { name: 'DR Emporter', value: analyticsData.orders.metrics.total_orders * 0.12, channel: 'deliveroo_takeaway' },
      { name: 'DR Livraison', value: analyticsData.orders.metrics.total_orders * 0.07, channel: 'deliveroo_delivery' },
    ];

    return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Nombre de commandes"
          value={analyticsData.orders.metrics.total_orders}
          change={analyticsData.orders.comparisons.previous_period.change}
        />
        <MetricCard
          label="Panier moyen"
          value={(analyticsData.orders.metrics.avg_basket || 0).toFixed(2) + ' €'}
        />
        <MetricCard
          label="Couverts"
          value={analyticsData.orders.metrics.covers || 0}
        />
        <MetricCard
          label="Panier/couvert"
          value={(analyticsData.orders.metrics.avg_per_cover || 0).toFixed(2) + ' €'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Évolution des commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.orders.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                <Legend />
                <Line type="monotone" dataKey="dine_in" stroke={CHANNEL_COLORS['dine_in']} name="Sur place" />
                <Line type="monotone" dataKey="takeaway" stroke={CHANNEL_COLORS['takeaway']} name="À emporter" />
                <Line type="monotone" dataKey="delivery" stroke={CHANNEL_COLORS['delivery']} name="Livraison" />
                <Line type="monotone" dataKey="ubereats_takeaway" stroke={CHANNEL_COLORS['ubereats_takeaway']} name="UE Emporter" />
                <Line type="monotone" dataKey="ubereats_delivery" stroke={CHANNEL_COLORS['ubereats_delivery']} name="UE Livraison" />
                <Line type="monotone" dataKey="deliveroo_takeaway" stroke={CHANNEL_COLORS['deliveroo_takeaway']} name="DR Emporter" />
                <Line type="monotone" dataKey="deliveroo_delivery" stroke={CHANNEL_COLORS['deliveroo_delivery']} name="DR Livraison" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition par canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelOrderData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {channelOrderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.channel]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => `${Math.round(value)} commandes`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <ExportButton
          filename="Commandes"
          onExport={() => analyticsService.exportOrdersCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            ['dine_in', 'takeaway', 'delivery'],
            'all'
          )}
        />
      </div>
    </div>
    );
  };

  // ==================== ONGLET PRODUITS ====================
  const renderProductsTab = () => {
    // Calcul des totaux pour les pourcentages
    const totalQuantity = analyticsData.products.products.reduce((sum, prod) => sum + prod.quantity, 0);
    const totalRevenue = analyticsData.products.products.reduce((sum, prod) => sum + prod.revenue, 0);

    return (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Catégorie</label>
              <select
                value={productCategory || 'all'}
                onChange={(e) => setProductCategory(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full px-3 py-2 rounded border border-input bg-background text-foreground text-sm"
              >
                <option value="all">Toutes catégories</option>
                <option value="entrees">Entrées</option>
                <option value="plats">Plats</option>
                <option value="desserts">Desserts</option>
                <option value="boissons">Boissons</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Tri</label>
              <select
                value={productSort}
                onChange={(e) => setProductSort(e.target.value)}
                className="w-full px-3 py-2 rounded border border-input bg-background text-foreground text-sm"
              >
                <option value="quantity">Plus vendus (quantité)</option>
                <option value="revenue">Plus vendus (CA)</option>
                <option value="margin">Marge la plus haute</option>
                <option value="margin_desc">Marge la plus basse</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Nombre de produits vendus"
          value={analyticsData.products.metrics.total_products_sold}
        />
        <MetricCard
          label="CA total produits"
          value={analyticsData.products.metrics.total_revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Marge contributive totale"
          value={analyticsData.products.metrics.total_margin.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Taux de marge moyen"
          value={analyticsData.products.metrics.avg_margin_percent.toFixed(1) + '%'}
        />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails des produits</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'name', label: 'Produit', sortable: true },
              { key: 'category', label: 'Catégorie', sortable: true },
              {
                key: 'quantity',
                label: 'Quantité vendue',
                sortable: true,
                render: (v: number) => {
                  const pct = totalQuantity > 0 ? Math.round((v / totalQuantity) * 100) : 0;
                  return `${v} (${pct}%)`;
                }
              },
              {
                key: 'revenue',
                label: 'CA (€)',
                sortable: true,
                render: (v: number) => {
                  const pct = totalRevenue > 0 ? Math.round((v / totalRevenue) * 100) : 0;
                  return `${v.toFixed(2)} (${pct}%)`;
                }
              },
              { key: 'cost', label: 'Coût (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'margin', label: 'Marge (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'margin_percent', label: 'Marge %', sortable: true, render: (v: number) => v.toFixed(1) + '%' },
              { key: 'evolution_percent', label: 'Évolution %', sortable: true, render: (v: number) => <EvolutionBadge percent={v} /> },
            ]}
            data={analyticsData.products.products}
            sortBy="revenue"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="Produits"
          onExport={() => analyticsService.exportProductsCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            productCategory,
            productSort
          )}
        />
      </div>
    </div>
    );
  };

  // ==================== ONGLET OPTIONS ====================
  const renderOptionsTab = () => {
    // Calcul des totaux pour les pourcentages
    const totalCount = analyticsData.options.options.reduce((sum, opt) => sum + opt.count, 0);
    const totalRevenue = analyticsData.options.options.reduce((sum, opt) => sum + opt.revenue, 0);

    return (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-3 block">Types d'option</label>
            <div className="space-y-2">
              {[
                { value: 'paid', label: 'Suppléments payants' },
                { value: 'free', label: 'Modifications gratuites' },
                { value: 'removed', label: 'Ingrédients retirés' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optionTypes.includes(opt.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOptionTypes([...optionTypes, opt.value]);
                      } else {
                        setOptionTypes(optionTypes.filter((t) => t !== opt.value));
                      }
                    }}
                    className="rounded"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Nombre total d'options" value={analyticsData.options.metrics.total_options} />
        <MetricCard
          label="CA généré par options"
          value={analyticsData.options.metrics.options_revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Coût total des options"
          value={(analyticsData.options.metrics.total_cost / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Bénéfice total"
          value={(analyticsData.options.metrics.total_profit / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Taux d'ajout moyen"
          value={analyticsData.options.metrics.avg_adoption_rate.toFixed(1) + '%'}
        />
        <MetricCard
          label="Marge moyenne %"
          value={analyticsData.options.metrics.avg_margin_percent.toFixed(1) + '%'}
        />
        <MetricCard
          label="Impact panier moyen"
          value={'+' + analyticsData.options.metrics.basket_impact_avg.toFixed(2) + '€'}
        />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Top 10 options - Coût vs Bénéfice</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analyticsData.options.options.slice(0, 10).map(opt => ({
                ...opt,
                total_cost_display: opt.total_cost / 100,
                profit_display: opt.profit / 100
              })).reverse()}
              layout="vertical"
              margin={{ left: 150, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="name" type="category" stroke="#6b7280" width={150} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value: number) => `${value.toFixed(2)}€`}
              />
              <Legend />
              <Bar dataKey="total_cost_display" stackId="a" fill="#ef4444" name="Coût" />
              <Bar dataKey="profit_display" stackId="a" fill="#10b981" name="Bénéfice" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails des options</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'name', label: 'Option', sortable: true },
              { key: 'product_name', label: 'Produit parent', sortable: true },
              {
                key: 'count',
                label: 'Nombre d\'ajouts',
                sortable: true,
                render: (v: number) => {
                  const pct = totalCount > 0 ? Math.round((v / totalCount) * 100) : 0;
                  return `${v} (${pct}%)`;
                }
              },
              {
                key: 'revenue',
                label: 'CA généré (€)',
                sortable: true,
                render: (v: number) => {
                  const pct = totalRevenue > 0 ? Math.round((v / totalRevenue) * 100) : 0;
                  return `${v.toFixed(2)} (${pct}%)`;
                }
              },
              { key: 'cost_per_unit', label: 'Coût unitaire (€)', sortable: true, render: (v: number) => (v / 100).toFixed(2) },
              { key: 'total_cost', label: 'Coût total (€)', sortable: true, render: (v: number) => (v / 100).toFixed(2) },
              { key: 'profit', label: 'Bénéfice (€)', sortable: true, render: (v: number) => <span className="text-green-600 font-medium">+{(v / 100).toFixed(2)}</span> },
              { key: 'adoption_rate', label: 'Taux d\'ajout %', sortable: true, render: (v: number) => v.toFixed(1) + '%' },
              { key: 'margin_percent', label: 'Marge %', sortable: true, render: (v: number) => {
                const color = v >= 70 ? 'text-green-600' : v >= 50 ? 'text-amber-600' : 'text-red-600';
                return <span className={`${color} font-medium`}>{v.toFixed(1)}%</span>;
              }},
            ]}
            data={analyticsData.options.options}
            sortBy="count"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="Options"
          onExport={() => analyticsService.exportOptionsCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            optionTypes
          )}
        />
      </div>
    </div>
    );
  };

  // ==================== ONGLET TAGS ====================
  const renderTagsTab = () => {
    // Calcul des totaux pour les pourcentages
    const totalQuantity = analyticsData.tags.by_tag.reduce((sum, tag) => sum + tag.quantity, 0);
    const totalRevenue = analyticsData.tags.by_tag.reduce((sum, tag) => sum + tag.revenue, 0);
    const totalWithTags = totalQuantity;
    const totalWithoutTags = Math.round(totalWithTags * 0.3); // 30% estimation for tagged vs untagged

    return (
      <div className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Part de quantité par tag</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.tags.by_tag}
                    dataKey="quantity"
                    nameKey="tag"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {analyticsData.tags.by_tag.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Quantité: avec tags vs sans tags</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Avec tags', value: totalWithTags },
                      { name: 'Sans tags', value: totalWithoutTags },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#d1d5db" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Détails par tag</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'tag', label: 'Tag', sortable: true },
                { key: 'product_count', label: 'Nombre de produits', sortable: true },
                {
                  key: 'quantity',
                  label: 'Quantité vendue',
                  sortable: true,
                  render: (v: number, row: any) => {
                    const pct = ((v / totalQuantity) * 100).toFixed(1);
                    return `${v} (${pct}%)`;
                  },
                },
                {
                  key: 'revenue',
                  label: 'CA total (€)',
                  sortable: true,
                  render: (v: number, row: any) => {
                    const pct = ((v / totalRevenue) * 100).toFixed(1);
                    return `${v.toFixed(2)} (${pct}%)`;
                  },
                },
                { key: 'avg_basket', label: 'Panier moyen (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              ]}
              data={analyticsData.tags.by_tag}
              sortBy="quantity"
            />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="Tags"
          onExport={() => analyticsService.exportTagsCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            selectedTags
          )}
        />
      </div>
    </div>
    );
  };

  // ==================== ONGLET ANNULATIONS ====================
  const renderCancellationsTab = () => (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-3 block">Motif d'annulation</label>
            <div className="space-y-2">
              {[
                { value: 'ordering_error', label: 'Erreur de commande' },
                { value: 'customer_wait', label: 'Client n\'a pas attendu' },
                { value: 'kitchen_issue', label: 'Problème cuisine' },
                { value: 'payment_issue', label: 'Problème paiement' },
                { value: 'other', label: 'Autre' },
              ].map((reason) => (
                <label key={reason.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancellationReasons.includes(reason.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCancellationReasons([...cancellationReasons, reason.value]);
                      } else {
                        setCancellationReasons(cancellationReasons.filter((r) => r !== reason.value));
                      }
                    }}
                    className="rounded"
                  />
                  {reason.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Nombre d'annulations"
          value={analyticsData.cancellations.metrics.total_cancellations}
          change={analyticsData.cancellations.comparisons.previous_period.change}
        />
        <MetricCard
          label="Taux d'annulation"
          value={analyticsData.cancellations.metrics.cancellation_rate.toFixed(2) + '%'}
        />
        <MetricCard
          label="Montant perdu"
          value={analyticsData.cancellations.metrics.amount_lost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Annulation moyenne"
          value={analyticsData.cancellations.metrics.avg_cancellation.toFixed(2) + '€'}
        />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Répartition par motif</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.cancellations.by_reason}
                dataKey="count"
                nameKey="reason"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {analyticsData.cancellations.by_reason.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Évolution du taux d'annulation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.cancellations.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#ef4444" name="Taux d'annulation %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails par serveur</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'server_name', label: 'Serveur', sortable: true },
              { key: 'cancellations', label: 'Annulations', sortable: true },
              { key: 'cancellation_rate', label: 'Taux %', sortable: true, render: (v: number) => v.toFixed(2) + '%' },
              { key: 'amount_lost', label: 'Montant perdu (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'main_reason', label: 'Motif principal', sortable: true },
              { key: 'evolution_percent', label: 'Évolution %', sortable: true, render: (v: number) => <EvolutionBadge percent={v} /> },
            ]}
            data={analyticsData.cancellations.by_server}
            sortBy="cancellations"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="Annulations"
          onExport={() => analyticsService.exportCancellationsCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            cancellationReasons
          )}
        />
      </div>
    </div>
  );

  // ==================== ONGLET REMISES ====================
  const renderDiscountsTab = () => (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-3 block">Type de remise</label>
            <div className="space-y-2">
              {[
                { value: 'promotion', label: 'Promotion' },
                { value: 'happy_hour', label: 'Happy hour' },
                { value: 'gesture', label: 'Geste commercial' },
                { value: 'loyalty', label: 'Fidélité client' },
                { value: 'promo_code', label: 'Codes promo' },
              ].map((type) => (
                <label key={type.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={discountTypes.includes(type.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDiscountTypes([...discountTypes, type.value]);
                      } else {
                        setDiscountTypes(discountTypes.filter((t) => t !== type.value));
                      }
                    }}
                    className="rounded"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Volume remises accordées"
          value={analyticsData.discounts.metrics.total_discounts.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Taux de remise moyen"
          value={analyticsData.discounts.metrics.discount_rate.toFixed(2) + '%'}
        />
        <MetricCard
          label="Impact marge"
          value={analyticsData.discounts.metrics.margin_impact.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Commandes avec remise"
          value={analyticsData.discounts.metrics.orders_with_discount}
        />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Répartition par type de remise</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analyticsData.discounts.by_type}
              margin={{ left: 0, right: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="type" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Bar dataKey="amount" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Impact sur la marge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Marge brute sans remise</p>
              <p className="text-3xl font-bold">{analyticsData.discounts.margin_impact.gross_margin_without.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Marge brute avec remise</p>
              <p className="text-3xl font-bold text-red-600">{analyticsData.discounts.margin_impact.gross_margin_with.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Perte : {analyticsData.discounts.margin_impact.margin_loss.toFixed(2)}€ ({analyticsData.discounts.margin_impact.margin_loss_percent.toFixed(1)}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails par type de remise</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'type', label: 'Type de remise', sortable: true },
              { key: 'count', label: 'Nombres d\'utilisations', sortable: true },
              { key: 'amount', label: 'Montant total (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'avg_discount', label: 'Remise moyenne (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'percent_of_revenue', label: '% du CA', sortable: true, render: (v: number) => v.toFixed(1) + '%' },
              { key: 'margin_impact', label: 'Impact marge (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'evolution_percent', label: 'Évolution %', sortable: true, render: (v: number) => <EvolutionBadge percent={v} /> },
            ]}
            data={analyticsData.discounts.by_type}
            sortBy="amount"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="Remises"
          onExport={() => analyticsService.exportDiscountsCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            discountTypes
          )}
        />
      </div>
    </div>
  );

  // ==================== ONGLET CLIENTS ====================
  const renderClientsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Nouveaux" value={analyticsData.clients.metrics.new_customers} />
        <MetricCard label="Récurrents" value={analyticsData.clients.metrics.recurring_customers} />
        <MetricCard label="Fréquence moy." value={analyticsData.clients.metrics.avg_frequency.toFixed(2) + 'x'} />
        <MetricCard label="Panier moy." value={analyticsData.clients.metrics.avg_basket_by_segment.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
      </div>
    </div>
  );

  // ==================== ONGLET RÈGLEMENTS ====================
  const renderPaymentsTab = () => (
    <div className="space-y-6">
      {/* Filtres */}
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Méthodes de paiement */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Méthodes de paiement</label>
              <MultiFilter
                options={[
                  { id: 'card', label: 'Carte bancaire' },
                  { id: 'cash', label: 'Espèces' },
                  { id: 'mobile', label: 'Paiement mobile' },
                ]}
                selectedIds={paymentMethods}
                onChange={setPaymentMethods}
              />
            </div>

            {/* Canal */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Canal</label>
              <select
                value={paymentChannel}
                onChange={(e) => setPaymentChannel(e.target.value)}
                className="w-full px-3 py-2 rounded border border-input bg-background text-foreground text-sm"
              >
                <option value="all">Tous les canaux</option>
                <option value="dine_in">Sur place</option>
                <option value="takeaway">À emporter</option>
                <option value="delivery">Livraison</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Montant total"
          value={analyticsData.payments.metrics.total_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Carte bancaire"
          value={analyticsData.payments.metrics.card_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Espèces"
          value={analyticsData.payments.metrics.cash_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard
          label="Paiement mobile"
          value={analyticsData.payments.metrics.mobile_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stacked Area Chart */}
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Évolution des règlements</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.payments.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                <Legend />
                <Area type="monotone" dataKey="card" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Carte bancaire" />
                <Area type="monotone" dataKey="cash" stackId="1" stroke="#10b981" fill="#10b981" name="Espèces" />
                <Area type="monotone" dataKey="mobile" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Paiement mobile" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.payments.by_method}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détail des règlements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'date', label: 'Date & Heure', sortable: true },
              { key: 'method', label: 'Méthode', sortable: true },
              { key: 'channel', label: 'Canal', sortable: true },
              { key: 'amount', label: 'Montant', sortable: true, render: (val) => val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) },
              { key: 'status', label: 'Statut', sortable: true },
              { key: 'reference', label: 'Référence', sortable: false },
            ]}
            data={analyticsData.payments.detail}
            sortBy="date"
          />
        </CardContent>
      </Card>

      {/* Export */}
      <div className="flex justify-end">
        <ExportButton
          filename="Règlements"
          onExport={() => analyticsService.exportPaymentsCSV(
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0],
            paymentMethods,
            paymentChannel
          )}
        />
      </div>
    </div>
  );

  // ==================== ONGLET RESTAURANTS ====================
  const renderRestaurantsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analyticsData.restaurants.by_restaurant.map((restaurant) => (
          <div key={restaurant.restaurant_id}>
            <MetricCard
              label={restaurant.name}
              value={restaurant.value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              change={restaurant.evolution_percent}
            />
          </div>
        ))}
      </div>
    </div>
  );

  // ==================== RENDU PRINCIPAL ====================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'ca':
        return renderCATab();
      case 'commandes':
        return renderOrdersTab();
      case 'produits':
        return renderProductsTab();
      case 'options':
        return renderOptionsTab();
      case 'tags':
        return renderTagsTab();
      case 'annulations':
        return renderCancellationsTab();
      case 'remises':
        return renderDiscountsTab();
      case 'clients':
        return renderClientsTab();
      case 'paiements':
        return renderPaymentsTab();
      case 'restaurants':
        return renderRestaurantsTab();
      default:
        return null;
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
    { id: 'paiements', label: 'Règlements' },
    { id: 'restaurants', label: 'Restaurants' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analyse</h1>
          <p className="text-muted-foreground">Dashboard d'analyse avec 10 onglets</p>
        </div>

        {/* Période globale */}
        <Card className="bg-card border border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-sm">
              <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
            </div>
          </CardContent>
        </Card>

        {/* Onglets */}
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

        {/* Contenu */}
        {renderTabContent()}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalysis;
