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
import { toast } from 'sonner';

type TabType = 'ca' | 'commandes' | 'produits' | 'options' | 'tags' | 'annulations' | 'remises' | 'clients' | 'tva' | 'restaurants';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Filtres spécifiques par onglet
  const [productCategory, setProductCategory] = useState<string | undefined>();
  const [productSort, setProductSort] = useState('quantity');
  const [optionTypes, setOptionTypes] = useState<string[]>(['paid', 'free', 'removed']);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Végétarien', 'Vegan', 'Sans gluten']);
  const [cancellationReasons, setCancellationReasons] = useState<string[]>(['ordering_error', 'customer_wait', 'kitchen_issue', 'payment_issue']);
  const [discountTypes, setDiscountTypes] = useState<string[]>(['promotion', 'happy_hour', 'gesture', 'loyalty', 'promo_code']);

  // Données analytiques
  const analyticsData = useMemo(() => {
    return {
      revenue: analyticsService.getRevenueAnalytics(startDate, endDate, ['restaurant', 'takeaway', 'delivery'], 'day'),
      orders: analyticsService.getOrdersAnalytics(startDate, endDate, ['dine_in', 'takeaway', 'delivery']),
      products: analyticsService.getProductsAnalytics(startDate, endDate, productCategory, productSort),
      options: analyticsService.getOptionsAnalytics(startDate, endDate, optionTypes),
      tags: analyticsService.getTagsAnalytics(startDate, endDate, selectedTags),
      cancellations: analyticsService.getCancellationsAnalytics(startDate, endDate, cancellationReasons),
      discounts: analyticsService.getDiscountsAnalytics(startDate, endDate, discountTypes),
      clients: analyticsService.getCustomersAnalytics(startDate, endDate),
      vat: analyticsService.getVATAnalytics(startDate, endDate),
      restaurants: analyticsService.getRestaurantsAnalytics(startDate, endDate),
    };
  }, [startDate, endDate, productCategory, productSort, optionTypes, selectedTags, cancellationReasons, discountTypes]);

  // ==================== ONGLET CA ====================
  const renderCATab = () => (
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

      <Card className="bg-card border border-border">
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
              <Area type="monotone" dataKey="restaurant" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Restaurant" />
              <Area type="monotone" dataKey="takeaway" stackId="1" stroke="#10b981" fill="#10b981" name="À emporter" />
              <Area type="monotone" dataKey="delivery" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Livraison" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="CA"
          onExport={() => analyticsService.exportRevenueCSV(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            ['restaurant', 'takeaway', 'delivery']
          )}
        />
      </div>
    </div>
  );

  // ==================== ONGLET COMMANDES ====================
  const renderOrdersTab = () => (
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

      <Card className="bg-card border border-border">
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
              <Line type="monotone" dataKey="total_orders" stroke="#3b82f6" name="Commandes" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="Commandes"
          onExport={() => analyticsService.exportOrdersCSV(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            ['dine_in', 'takeaway', 'delivery'],
            'all'
          )}
        />
      </div>
    </div>
  );

  // ==================== ONGLET PRODUITS ====================
  const renderProductsTab = () => (
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
          <CardTitle className="text-sm font-semibold">Top 10 produits</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analyticsData.products.products.slice(0, 10).reverse()}
              layout="vertical"
              margin={{ left: 100, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Bar dataKey={productSort === 'revenue' ? 'revenue' : 'quantity'} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails des produits</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'name', label: 'Produit', sortable: true },
              { key: 'category', label: 'Catégorie', sortable: true },
              { key: 'quantity', label: 'Quantité', sortable: true },
              { key: 'revenue', label: 'CA (€)', sortable: true, render: (v: number) => v.toFixed(2) },
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
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            productCategory,
            productSort
          )}
        />
      </div>
    </div>
  );

  // ==================== ONGLET OPTIONS ====================
  const renderOptionsTab = () => (
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
          label="Taux d'ajout moyen"
          value={analyticsData.options.metrics.avg_adoption_rate.toFixed(1) + '%'}
        />
        <MetricCard
          label="Impact panier moyen"
          value={'+' + analyticsData.options.metrics.basket_impact_avg.toFixed(2) + '€'}
        />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Top 10 options ajoutées</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analyticsData.options.options.slice(0, 10).reverse()}
              layout="vertical"
              margin={{ left: 150, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="name" type="category" stroke="#6b7280" width={150} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Bar dataKey="count" fill="#10b981" />
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
              { key: 'count', label: 'Nombre d\'ajouts', sortable: true },
              { key: 'revenue', label: 'CA généré (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'adoption_rate', label: 'Taux d\'ajout %', sortable: true, render: (v: number) => v.toFixed(1) + '%' },
              { key: 'avg_price', label: 'Prix moyen (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'basket_impact', label: 'Impact panier (+€)', sortable: true, render: (v: number) => v.toFixed(2) },
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
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            optionTypes
          )}
        />
      </div>
    </div>
  );

  // ==================== ONGLET TAGS ====================
  const renderTagsTab = () => (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-3 block">Tags</label>
            <div className="grid grid-cols-2 gap-3">
              {['Végétarien', 'Vegan', 'Sans gluten', 'Signature', 'Nouveauté', 'Bio', 'Local'].map((tag) => (
                <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags([...selectedTags, tag]);
                      } else {
                        setSelectedTags(selectedTags.filter((t) => t !== tag));
                      }
                    }}
                    className="rounded"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Produits avec tags" value={analyticsData.tags.metrics.tagged_products} />
        <MetricCard
          label="CA total tagué"
          value={analyticsData.tags.metrics.tagged_revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        />
        <MetricCard label="Tendance globale" value="" change={analyticsData.tags.metrics.evolution_percent} />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Répartition CA par tag</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.tags.by_tag}
                dataKey="revenue"
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
          <CardTitle className="text-sm font-semibold">Évolution dans le temps</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.tags.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Legend />
              {selectedTags.map((tag, idx) => (
                <Line
                  key={tag}
                  type="monotone"
                  dataKey={tag}
                  stroke={COLORS[idx % COLORS.length]}
                  name={tag}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Détails par tag</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'tag', label: 'Tag', sortable: true },
              { key: 'product_count', label: 'Nombre de produits', sortable: true },
              { key: 'quantity', label: 'Quantité vendue', sortable: true },
              { key: 'revenue', label: 'CA total (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'avg_basket', label: 'Panier moyen (€)', sortable: true, render: (v: number) => v.toFixed(2) },
              { key: 'revenue_percent', label: '% du CA', sortable: true, render: (v: number) => v.toFixed(1) + '%' },
              { key: 'evolution_percent', label: 'Évolution %', sortable: true, render: (v: number) => <EvolutionBadge percent={v} /> },
            ]}
            data={analyticsData.tags.by_tag}
            sortBy="revenue"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButton
          filename="Tags"
          onExport={() => analyticsService.exportTagsCSV(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            selectedTags
          )}
        />
      </div>
    </div>
  );

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
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
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
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
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

  // ==================== ONGLET TVA ====================
  const renderTVATab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="TVA Total" value={analyticsData.vat.total_vat.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
        <MetricCard label="TVA 10%" value={analyticsData.vat.by_rate[0].vat_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
        <MetricCard label="TVA 5.5%" value={analyticsData.vat.by_rate[1].vat_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
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
      case 'tva':
        return renderTVATab();
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

        {/* Période globale */}
        <Card className="bg-card border border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Période</CardTitle>
          </CardHeader>
          <CardContent>
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
