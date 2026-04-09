# Analyse Approfondie du Codebase Wello Back-Office

## Table des matières
1. [PeriodSelector](#1-periodselector)
2. [Composants Tabs](#2-composants-tabs)
3. [Composants de Graphiques](#3-composants-de-graphiques)
4. [Composants de Tableaux](#4-composants-de-tableaux)
5. [Composants de Filtres](#5-composants-de-filtres)
6. [Exports (CSV, PDF)](#6-exports-csv-pdf)
7. [Patterns de Dashboards](#7-patterns-de-dashboards)
8. [MetricCard / StatCard](#8-metriccard--statcard)

---

## 1. PeriodSelector

### ❌ Statut : **N'existe pas**

**Note** : Le composant `PeriodSelector` n'existe pas dans le codebase. 

**Composants équivalents utilisés :**
- [AdvancedDatePicker](#advanceddatepicker) → Sélecteur de date avancé avec presets
- [DateRangePicker](#daterangepicker) → Sélecteur de plage de dates simple

### Alternative recommandée pour les pages d'analyses
Si vous traversez les registres de caisse, utilisez plutôt :
- **AdvancedDatePicker** pour plus de contrôle (presets intégrés)
- **DateRangePicker** pour un sélecteur simple et minimaliste

---

## 2. Composants Tabs

### 📍 Localisation
- **Fichier** : [src/components/ui/tabs.tsx](src/components/ui/tabs.tsx)
- **Bibliothèque** : `@radix-ui/react-tabs` (v1.1.12)

### Structure et Props

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Props de Tabs
<Tabs defaultValue="tab1" onValueChange={(value) => {}}>
  <TabsList>
    <TabsTrigger value="tab1">Onglet 1</TabsTrigger>
    <TabsTrigger value="tab2">Onglet 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Contenu 1</TabsContent>
  <TabsContent value="tab2">Contenu 2</TabsContent>
</Tabs>
```

### Exemple d'utilisation (FinancialReports.tsx)

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="reports">
  <TabsList>
    <TabsTrigger value="reports">Rapports</TabsTrigger>
    <TabsTrigger value="exports">Exports</TabsTrigger>
  </TabsList>
  <TabsContent value="reports">{/* Contenu */}</TabsContent>
  <TabsContent value="exports">{/* Contenu */}</TabsContent>
</Tabs>
```

### Styling par défaut
- Hauteur : `h-10`
- Background : `bg-muted`
- Padding : `p-1`
- Rounded : `rounded-md`

### ✅ Adaptation pour la page Analyses
```typescript
<Tabs defaultValue="kpis" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="kpis">KPIs</TabsTrigger>
    <TabsTrigger value="trends">Tendances</TabsTrigger>
    <TabsTrigger value="details">Détails</TabsTrigger>
  </TabsList>
  
  <TabsContent value="kpis">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* StatCards */}
    </div>
  </TabsContent>
  
  <TabsContent value="trends">
    {/* Graphiques de tendances */}
  </TabsContent>
  
  <TabsContent value="details">
    {/* Tableaux détaillés */}
  </TabsContent>
</Tabs>
```

---

## 3. Composants de Graphiques

### 📊 Bibliothèque Utilisée
- **Recharts** v2.15.4 (https://recharts.org)
- **Locales** : `date-fns` pour la localisation française

### Graphiques Implémentés

#### 3.1 **PaymentChart** (Graphique en barres empilées)
- **Fichier** : [src/components/reports/PaymentChart.tsx](src/components/reports/PaymentChart.tsx)
- **Type** : `BarChart` de Recharts
- **Données** : Paiements par jour, groupés par méthode

```typescript
import { PaymentChart } from '@/components/reports/PaymentChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PaymentChartProps {
  data: PaymentDayData[];
}

<PaymentChart data={paymentData?.calendar || []} />

// PaymentChart implémente:
// - Stacked bars par méthode de paiement
// - Tooltip custom avec devise EUR
// - Legend
// - Grid responsive
```

#### 3.2 **VATChart** (Graphique en camembert)
- **Fichier** : [src/components/reports/VATChart.tsx](src/components/reports/VATChart.tsx)
- **Type** : `PieChart` de Recharts
- **Données** : Distribution TVA par taux

```typescript
import { VATChart } from '@/components/reports/VATChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface VATChartProps {
  data: VATDayData[];
}

<VATChart data={vatData?.calendar || []} />

// VATChart implémente:
// - Pie chart avec labels en percentages
// - Colors dynamiques (primary, accent, secondary, muted)
// - Tooltip avec formatage EUR
```

#### 3.3 **HourlyChannelChart** (Graphique linéaire empilé)
- **Fichier** : [src/components/dashboard/HourlyChannelChart.tsx](src/components/dashboard/HourlyChannelChart.tsx)
- **Type** : Graphique de chiffre d'affaires par canal horaire
- **Canaux** : sur_place, emporter, livraison, uber_eats, deliveroo

```typescript
import { HourlyChannelChart } from '@/components/dashboard/HourlyChannelChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HourlyChannelChartProps {
  data: HourlyChannelData[];
}

<HourlyChannelChart data={...} />

// Couleurs par canal:
const CHANNEL_COLORS = {
  sur_place: '#6366f1',      // indigo
  emporter: '#22c55e',        // green
  livraison: '#f97316',       // orange
  uber_eats: '#1c1917',       // black
  deliveroo: '#00ccbc',       // teal
};
```

#### 3.4 **RevenueEvolutionChart** (Graphique d'aires)
- **Fichier** : [src/components/dashboard/RevenueEvolutionChart.tsx](src/components/dashboard/RevenueEvolutionChart.tsx)
- **Type** : `AreaChart` avec progression du CA par heure

```typescript
import { RevenueEvolutionChart } from '@/components/dashboard/RevenueEvolutionChart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

<RevenueEvolutionChart />

// Features:
// - Mock data (à remplacer par API call)
// - Custom tooltip
// - Responsive
// - Données en centimes (conversion en euros pour affichage)
```

### ✅ Adaptation pour la page Analyses

```typescript
// Importer les composants
import { PaymentChart } from '@/components/reports/PaymentChart';
import { VATChart } from '@/components/reports/VATChart';
import { HourlyChannelChart } from '@/components/dashboard/HourlyChannelChart';
import { RevenueEvolutionChart } from '@/components/dashboard/RevenueEvolutionChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Structure layout
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <Card>
    <CardHeader>
      <CardTitle>Paiements par jour</CardTitle>
    </CardHeader>
    <CardContent>
      <PaymentChart data={paymentData} />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Distribution TVA</CardTitle>
    </CardHeader>
    <CardContent>
      <VATChart data={vatData} />
    </CardContent>
  </Card>

  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>Chiffre d'affaires par canal</CardTitle>
    </CardHeader>
    <CardContent>
      <HourlyChannelChart data={hourlyData} />
    </CardContent>
  </Card>
</div>
```

### Patterns Recharts Réutilisables

#### Pattern 1 : Tooltip Custom
```typescript
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartData }> }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-foreground">{data.label}</p>
        <p className="text-sm text-muted-foreground">{data.value}</p>
      </div>
    );
  }
  return null;
};

<YourChart>
  <Tooltip content={<CustomTooltip />} />
</YourChart>
```

#### Pattern 2 : Formatage Devise
```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100); // Divisez par 100 si données en centimes
};
```

#### Pattern 3 : Responsive Container
```typescript
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    {/* Configuration */}
  </BarChart>
</ResponsiveContainer>
```

---

## 4. Composants de Tableaux

### 📍 Source Unique
- **Fichier** : [src/components/ui/table.tsx](src/components/ui/table.tsx)
- **Composant shadcn/ui** basé sur HTML natif `<table>`

### Structure et Props

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<div className="rounded-lg border overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Colonne 1</TableHead>
        <TableHead>Colonne 2</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Données 1</TableCell>
        <TableCell>Données 2</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### Inventaire des Tableaux du Codebase

| # | Page | Tri | Filtres | Pagination | Drag-Drop | Notes |
|---|------|-----|---------|-----------|-----------|-------|
| 1 | [CategoriesTable](src/pages/CategoriesTable.tsx) | ❌ | ❌ | ❌ | ✅ (@dnd-kit) | Gestion des catégories |
| 2 | [TagsTable](src/pages/TagsTable.tsx) | ❌ | ❌ | ❌ | ❌ | Édition inline |
| 3 | [PriceGrid](src/pages/PriceGrid.tsx) | ❌ | ❌ | ❌ | ❌ | 2 tables, structure prix |
| 4 | [MarketCategoriesTable](src/pages/MarketCategoriesTable.tsx) | ❌ | ❌ | ❌ | ❌ | Catégories marketplace |
| 5 | [CustomersList](src/pages/CustomersList.tsx) | ✅ | ✅ | ❌ | ❌ | Recherche et tri |
| 6 | [LoyaltyPrograms](src/pages/LoyaltyPrograms.tsx) | ✅ | ✅ | ❌ | ❌ | Programmes fidélité |
| 7 | [CashRegisterHistory](src/pages/CashRegisterHistory.tsx) | ✅ | ✅ | ❌ | ❌ | Ligne expansible |
| 8 | [Attributes](src/pages/Attributes.tsx) | ❌ | ❌ | ❌ | ❌ | Attributs produit |
| 9 | [Stocks](src/pages/Stocks.tsx) | ✅ | ✅ | ❌ | ❌ | Gestion stock |
| 10 | [ProductsTable](src/components/menu/ProductsTable.tsx) | ✅ | ❌ | ❌ | ❌ | Composant réutilisable |
| 11 | [VATDetailTable](src/components/reports/VATDetailTable.tsx) | ✅ | ❌ | ❌ | ❌ | Tableau TVA détaillé |
| 12 | [PaymentDetailTable](src/components/reports/PaymentDetailTable.tsx) | ✅ | ❌ | ❌ | ❌ | Tableau paiements détaillé |

### Pattern de Wrapper Standard

```typescript
// Pattern RECOMMANDÉ (avec bg-card explicite)
<div className="bg-card rounded-lg border border-border overflow-hidden">
  <div className="overflow-x-auto">
    <Table>
      {/* Contenu */}
    </Table>
  </div>
</div>

// Alternative (avec Card component)
<Card>
  <Table>
    {/* Contenu */}
  </Table>
</Card>
```

### Exemple : Implémentation avec Tri (CashRegisterHistory)

```typescript
type SortField = 'created_at' | 'register_number' | 'total_revenue' | 'transaction_count';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

const [sort, setSort] = useState<SortState>({ field: 'created_at', direction: 'desc' });

const handleSort = (field: SortField) => {
  if (sort.field === field) {
    // Inverser la direction
    setSort({ field, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  } else {
    // Nouveau champ
    setSort({ field, direction: 'asc' });
  }
};

const sortedRegisters = useMemo(() => {
  const sorted = [...registers];
  sorted.sort((a, b) => {
    let aVal: any = a[sort.field];
    let bVal: any = b[sort.field];

    if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}, [registers, sort]);

// Dans le header
<TableHead 
  className="cursor-pointer"
  onClick={() => handleSort('created_at')}
>
  Date
  {sort.field === 'created_at' && (
    sort.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
  )}
</TableHead>
```

### ✅ Adaptation pour la page Analyses

```typescript
<div className="space-y-6">
  {/* Table de détails TVA */}
  <div className="bg-card rounded-lg border border-border overflow-hidden">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => handleSort('date')} className="cursor-pointer">
              Date {sort.field === 'date' && <SortIcon />}
            </TableHead>
            <TableHead>Taux TVA</TableHead>
            <TableHead className="text-right">HT</TableHead>
            <TableHead className="text-right">TVA</TableHead>
            <TableHead className="text-right">TTC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{format(new Date(row.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
              <TableCell>{row.tva_title}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.ht)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.tva)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(row.ttc)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
</div>
```

---

## 5. Composants de Filtres

### 5.1 **AdvancedDatePicker** (Filtre de Date Avancé)

**📍 Fichier** : [src/components/shared/AdvancedDatePicker.tsx](src/components/shared/AdvancedDatePicker.tsx)

**Props**
```typescript
interface AdvancedDatePickerProps {
  value: DateRange;           // { from: Date; to: Date }
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}
```

**Presets Intégrés**
```typescript
const presets = [
  "Aujourd'hui",
  "7 derniers jours",
  "Cette semaine",
  "Ce mois",
  "30 derniers jours"
];
```

**Utilisation**
```typescript
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { useState } from 'react';

const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
});

<AdvancedDatePicker 
  value={dateRange} 
  onChange={setDateRange}
/>
```

**Utilisé dans** :
- [CashRegisterHistory](src/pages/CashRegisterHistory.tsx)
- [TVA](src/pages/TVA.tsx)

---

### 5.2 **DateRangePicker** (Sélecteur Simple)

**📍 Fichier** : [src/components/reports/DateRangePicker.tsx](src/components/reports/DateRangePicker.tsx)

**Props**
```typescript
interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}
```

**Utilisation**
```typescript
import { DateRangePicker } from '@/components/reports/DateRangePicker';

<DateRangePicker 
  dateRange={dateRange}
  onDateRangeChange={setDateRange}
/>
```

**Utilisé dans** :
- [FinancialReports](src/pages/FinancialReports.tsx)

---

### 5.3 **ChannelSelector** (Filtre Canaux Multi-sélection)

**📍 Fichier** : [src/components/accounting/ChannelSelector.tsx](src/components/accounting/ChannelSelector.tsx)

**Props**
```typescript
export interface Channel {
  id: string;
  label: string;
}

interface ChannelSelectorProps {
  channels: Channel[];
  selectedChannels: string[];
  onChange: (channels: string[]) => void;
  disabled?: boolean;
}
```

**Canaux Disponibles**
```typescript
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  restaurant: <Store />,
  takeaway: <ShoppingBag />,
  scannorder: <Smartphone />,
  ubereats: <Zap />,
  deliveroo: <Bike />,
};
```

**Utilisation**
```typescript
import { ChannelSelector, type Channel } from '@/components/accounting/ChannelSelector';
import { useState } from 'react';

const channels: Channel[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'takeaway', label: 'À emporter' },
  { id: 'ubereats', label: 'Uber Eats' },
  { id: 'deliveroo', label: 'Deliveroo' },
];

const [selectedChannels, setSelectedChannels] = useState<string[]>(['restaurant']);

<ChannelSelector
  channels={channels}
  selectedChannels={selectedChannels}
  onChange={setSelectedChannels}
/>
```

---

### 5.4 **Select Component** (Dropdown Select)

**📍 Fichier** : [src/components/ui/select.tsx](src/components/ui/select.tsx)
**Bibliothèque** : `@radix-ui/react-select`

**Utilisation**
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select value={selected} onValueChange={setSelected}>
  <SelectTrigger>
    <SelectValue placeholder="Sélectionner..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

---

### 5.5 **Checkbox** (Multi-sélection)

**📍 Fichier** : [src/components/ui/checkbox.tsx](src/components/ui/checkbox.tsx)
**Bibliothèque** : `@radix-ui/react-checkbox`

**Utilisation**
```typescript
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

<div className="flex items-center gap-2">
  <Checkbox 
    id="option1" 
    checked={isChecked}
    onCheckedChange={setIsChecked}
  />
  <Label htmlFor="option1">Option 1</Label>
</div>
```

---

### ✅ Adaptation pour la page Analyses

```typescript
// Filtres en ligne
<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
  {/* Filtre de date avancé */}
  <div className="flex-1">
    <Label>Période</Label>
    <AdvancedDatePicker 
      value={dateRange}
      onChange={setDateRange}
    />
  </div>

  {/* Sélection de canaux */}
  <div className="flex-1">
    <ChannelSelector
      channels={availableChannels}
      selectedChannels={selectedChannels}
      onChange={setSelectedChannels}
    />
  </div>

  {/* Filtre tri */}
  <Select value={sortBy} onValueChange={setSortBy}>
    <SelectTrigger className="w-full sm:w-48">
      <SelectValue placeholder="Trier par..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="date">Date (récent)</SelectItem>
      <SelectItem value="revenue">Chiffre d'affaires</SelectItem>
      <SelectItem value="transactions">Transactions</SelectItem>
    </SelectContent>
  </Select>

  {/* Actions */}
  <Button onClick={handleExport}>
    <Download className="w-4 h-4 mr-2" />
    Export
  </Button>
</div>
```

---

## 6. Exports (CSV, PDF)

### 6.1 **Export PDF** (Registres de Caisse)

**📍 Fichier Service** : [src/services/cashRegisterHistoryService.ts](src/services/cashRegisterHistoryService.ts)

**Fonction**
```typescript
export const exportRegisterPDF = async (registerId: string): Promise<void> => {
  logAPI('POST', `/accounting/registers/${registerId}/export-pdf`);
  
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/accounting/registers/${registerId}/export-pdf`,
    { method: 'POST' }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `register_${registerId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
};
```

**Utilisation**
```typescript
import { exportRegisterPDF } from '@/services/cashRegisterHistoryService';

const handleExportPDF = async (registerId: string) => {
  try {
    await exportRegisterPDF(registerId);
    toast.success('PDF exported');
  } catch (error) {
    toast.error('Export failed');
  }
};
```

---

### 6.2 **Export CSV** (Rapports Financiers)

**📍 Fichier Service** : [src/services/financialReportsService.ts](src/services/financialReportsService.ts)

**Fonctions Disponibles**
```typescript
class FinancialReportsService {
  async exportGlobal(dateFrom: string, dateTo: string): Promise<void>
  async exportVAT(dateFrom: string, dateTo: string): Promise<void>
  async exportPayments(dateFrom: string, dateTo: string): Promise<void>
}

const financialReportsService = new FinancialReportsService();
```

**Utilisation dans FinancialReports.tsx**
```typescript
const handleExportGlobal = () => {
  financialReportsService.exportGlobal(
    format(dateRange.from, 'yyyy-MM-dd'),
    format(dateRange.to, 'yyyy-MM-dd')
  );
};

const handleExportVAT = () => {
  financialReportsService.exportVAT(
    format(dateRange.from, 'yyyy-MM-dd'),
    format(dateRange.to, 'yyyy-MM-dd')
  );
};

<Button onClick={handleExportGlobal} className="bg-gradient-primary">
  <Download className="w-4 h-4 mr-2" />
  Export Comptable Global
</Button>
```

---

### 6.3 **Export CSV** (TVA)

**📍 Fichier Service** : [src/services/vatService.ts](src/services/vatService.ts)

**Fonction**
```typescript
export const exportVATCSV = async (
  dateFrom: string,
  dateTo: string,
  channels: string[]
): Promise<Blob> => {
  const response = await apiClient.post(
    `${API_BASE_URL}/accounting/vat/export-csv`,
    { date_from: dateFrom, date_to: dateTo, channels },
    { responseType: 'blob' }
  );
  return response.data;
};

export const downloadCSV = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
};
```

**Utilisation dans TVA.tsx**
```typescript
const handleExportCSV = async () => {
  try {
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');
    const parsedChannels = selectedChannels.split(',');
    
    const blob = await exportVATCSV(startDate, endDate, parsedChannels);
    downloadCSV(blob, `vat_report_${startDate}_to_${endDate}.csv`);
    
    toast.success(`Export CSV téléchargé`);
  } catch (error) {
    toast.error('Impossible de générer l\'export CSV');
  }
};
```

---

### ✅ Pattern pour la page Analyses

```typescript
import { Button } from '@/components/ui/button';
import { Download, FileText, Sheet } from 'lucide-react';
import { financialReportsService } from '@/services/financialReportsService';
import { formatDate } from 'date-fns';
import { toast } from 'sonner';

// Boutons d'export
<div className="flex gap-2">
  <Button 
    onClick={() => handleExport('csv')}
    variant="outline"
  >
    <Sheet className="w-4 h-4 mr-2" />
    Export CSV
  </Button>
  
  <Button 
    onClick={() => handleExport('pdf')}
    className="bg-gradient-primary"
  >
    <FileText className="w-4 h-4 mr-2" />
    Export PDF
  </Button>
</div>

// Fonction d'export flexible
const handleExport = async (format: 'csv' | 'pdf') => {
  try {
    const dateFrom = formatDate(dateRange.from, 'yyyy-MM-dd');
    const dateTo = formatDate(dateRange.to, 'yyyy-MM-dd');
    
    if (format === 'csv') {
      await financialReportsService.exportGlobal(dateFrom, dateTo);
    } else {
      // Implémenter le PDF export
      console.log('PDF export');
    }
    
    toast.success(`Export ${format.toUpperCase()} réussi`);
  } catch (error) {
    toast.error(`Erreur lors de l'export ${format}`);
  }
};
```

---

## 7. Patterns de Dashboards

### 7.1 **Pattern de Dashboard Principal** (Index.tsx)

**📍 Fichier** : [src/pages/Index.tsx](src/pages/Index.tsx)

**Structure Layout**
```typescript
<DashboardLayout>
  <div className="p-6 lg:p-8 space-y-6">
    {/* 1. Header avec Greeting & Quick Actions */}
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{greeting} 👋</h1>
      </div>
      <QuickActions onNewProduct={() => {}} onMarkRupture={() => {}} />
    </div>

    {/* 2. Hero Metrics (3 colonnes) */}
    <DashboardHero data={data} loading={loading} />

    {/* 3. Charts (2 colonnes) */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Chiffre d'affaires</CardTitle></CardHeader>
        <CardContent>
          <RevenueEvolutionChart />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Chiffre d'affaires par canal</CardTitle></CardHeader>
        <CardContent>
          <HourlyChannelChart data={...} />
        </CardContent>
      </Card>
    </div>

    {/* 4. KPI Cards (4 colonnes) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map(kpi => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>

    {/* 5. Additional Cards (Services, Activitys, etc.) */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ServiceCard />
      <ActivityFeed />
      <TopProductsCard />
    </div>
  </div>
</DashboardLayout>
```

---

### 7.2 **DashboardHero Component** (Metric Cards Héros)

**📍 Fichier** : [src/components/dashboard/DashboardHero.tsx](src/components/dashboard/DashboardHero.tsx)

**Structure**
```typescript
export const DashboardHero = ({ data, loading }: DashboardHeroProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <HeroMetricCard
        title="Chiffre d'affaires"
        icon={Euro}
        value={formatCurrency(revenueToday)}
        comparison={calculateTrend(revenueToday, revenueYesterday)}
        subtitle={`Hier: ${formatCurrency(revenueYesterday)}`}
      />
      
      <HeroMetricCard
        title="Commandes"
        icon={ShoppingCart}
        value={`${ordersToday}`}
        comparison={calculateTrend(ordersToday, ordersYesterday)}
        subtitle={`Hier: ${ordersYesterday}`}
      />
      
      <HeroMetricCard
        title="Panier moyen"
        icon={Receipt}
        value={formatCurrency(avgBasketToday)}
        comparison={calculateTrend(avgBasketToday, avgBasketYesterday)}
        subtitle={`Hier: ${formatCurrency(avgBasketYesterday)}`}
      />
    </div>
  );
};
```

---

### 7.3 **Pattern de Dashboard Analytique** (CashRegisterHistory.tsx)

**📍 Fichier** : [src/pages/CashRegisterHistory.tsx](src/pages/CashRegisterHistory.tsx)

**Structure Layout**
```typescript
<DashboardLayout>
  <div className="p-6 space-y-6">
    {/* Header avec Titre + Filtres */}
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold">Historique des Registres</h1>
      <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
    </div>

    {/* Stats Summary Cards (4 colonnes) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCardSmall title="Écritures Z" value={stats.z_count} />
      <StatCardSmall title="Écritures X" value={stats.x_count} />
      <StatCardSmall title="Chiffre d'affaires" value={formatCurrency(stats.total_revenue)} />
      <StatCardSmall title="Transactions" value={stats.total_transactions} />
    </div>

    {/* Data Table avec Tri et Expandable Rows */}
    <Card>
      <Table>
        {/* Header avec colonnes triables */}
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => handleSort('created_at')}>Date</TableHead>
            <TableHead onClick={() => handleSort('register_number')}>N° Registre</TableHead>
            <TableHead onClick={() => handleSort('total_revenue')}>CA</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        
        {/* Body avec expandable sections */}
        <TableBody>
          {sortedRegisters.map(register => (
            <Fragment key={register.id}>
              <TableRow 
                className="cursor-pointer"
                onClick={() => toggleExpanded(register.id)}
              >
                <TableCell>{format(new Date(register.created_at), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{register.register_number}</TableCell>
                <TableCell>{formatCurrency(register.total_revenue)}</TableCell>
                <TableCell>
                  <ChevronDown className={expandedId === register.id ? 'transform rotate-180' : ''} />
                </TableCell>
              </TableRow>
              
              {/* Expandable Detail Row */}
              {expandedId === register.id && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="p-4 bg-muted">
                      {/* Détails étendus */}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </Card>
  </div>
</DashboardLayout>
```

---

### ✅ Recommandations pour la page Analyses (DashboardAnalysis.tsx)

**Structure recommandée**
```typescript
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { ChannelSelector } from '@/components/accounting/ChannelSelector';
import { PaymentChart } from '@/components/reports/PaymentChart';
import { VATChart } from '@/components/reports/VATChart';
import { HourlyChannelChart } from '@/components/dashboard/HourlyChannelChart';

export const DashboardAnalysis = () => {
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30*24*60*60*1000), to: new Date() });
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold">Analyses</h1>
          <Button className="bg-gradient-primary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Période</Label>
            <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
          </div>
          <div>
            <ChannelSelector 
              channels={channels}
              selectedChannels={selectedChannels}
              onChange={setSelectedChannels}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="trends">Tendances</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="CA" value="15 500€" icon={Euro} />
              <StatCard title="Commandes" value="245" icon={ShoppingCart} />
              <StatCard title="TVA" value="3 100€" icon={TrendingUp} />
              <StatCard title="Transactions" value="892" icon={Receipt} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardContent><PaymentChart data={...} /></CardContent></Card>
              <Card><CardContent><VATChart data={...} /></CardContent></Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Chiffre d'affaires</CardTitle></CardHeader>
              <CardContent>
                <HourlyChannelChart data={...} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {/* Tableaux détaillés */}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
```

---

## 8. MetricCard / StatCard

### 8.1 **StatCard** (Carte Métrique Standard)

**📍 Fichier** : [src/components/dashboard/StatCard.tsx](src/components/dashboard/StatCard.tsx)

**Props**
```typescript
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: string;
  isHighlighted?: boolean;
}
```

**Utilisation**
```typescript
import { StatCard } from '@/components/dashboard/StatCard';
import { Euro, TrendingUp, Receipt } from 'lucide-react';

<StatCard
  title="Total TTC"
  value="€12,450"
  subtitle="Chiffre d'affaires"
  icon={Euro}
  isHighlighted
/>

<StatCard
  title="Total HT"
  value="€10,370"
  subtitle="Montant net"
  icon={TrendingUp}
/>
```

**Styling**
```typescript
// Non-highlighted (defaut)
<Card className="shadow-card transition-all hover:shadow-lg">

// Highlighted
<Card className="bg-gradient-primary border-transparent shadow-card">
```

---

### 8.2 **HeroMetricCard** (Carte Métrique Héros)

**📍 Fichier** : [src/components/dashboard/HeroMetricCard.tsx](src/components/dashboard/HeroMetricCard.tsx)

**Props**
```typescript
interface HeroMetricCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  comparison?: {
    text: string;         // ex: "+14%"
    trend: 'up' | 'down' | 'neutral';
  };
  subtitle?: string;
}
```

**Utilisation**
```typescript
import { HeroMetricCard } from '@/components/dashboard/HeroMetricCard';
import { TrendingUp } from 'lucide-react';

<HeroMetricCard
  title="Chiffre d'affaires"
  icon={Euro}
  value="€15,500"
  comparison={{
    text: "+14%",
    trend: "up"
  }}
  subtitle="Hier: €13,600"
/>
```

**Features**
- Icône avec background primaire
- Tendance colorée (vert=up, rouge=down, gris=neutral)
- Icons Trending Up/Down/Minus automatiques

---

### 8.3 **KPICard** (Carte KPI Avancée)

**📍 Fichier** : [src/components/dashboard/KPICard.tsx](src/components/dashboard/KPICard.tsx)

**Props**
```typescript
interface KPICardProps {
  title: string;
  icon: LucideIcon;
  data: KPIComparison;              // { current: number; reference: number }
  format?: 'currency' | 'integer' | 'decimal';
  currency?: string;
  target?: number;
  targetLabel?: string;
  badge?: { 
    label: string; 
    value: string | number; 
    color?: 'default' | 'warning' | 'danger' 
  };
}
```

**Utilisation**
```typescript
import { KPICard } from '@/components/dashboard/KPICard';
import { ShoppingCart } from 'lucide-react';

<KPICard
  title="Commandes"
  icon={ShoppingCart}
  data={{ current: 245, reference: 215 }}
  format="integer"
  target={300}
  targetLabel="Objectif"
  badge={{ 
    label: "En cours", 
    value: 12, 
    color: "warning" 
  }}
/>
```

**Features**
- Format automatique (devise, entier, décimal)
- Comparaison avec tendance calculée
- Barre de progression vers objectif
- Badge additionnel

---

### 8.4 **RevenueCard** (Carte Revenu Graphique)

**📍 Fichier** : [src/components/dashboard/RevenueCard.tsx](src/components/dashboard/RevenueCard.tsx)

**Utilisation**
```typescript
<RevenueCard data={...} />
```

---

### 8.5 **ServiceCard** (Carte de Service)

**📍 Fichier** : [src/components/dashboard/ServiceCard.tsx](src/components/dashboard/ServiceCard.tsx)

**Utilisation**
```typescript
<ServiceCard 
  title="Gestion des Commandes"
  icon={ShoppingCart}
  description="Voir toutes les commandes"
  onClick={() => navigate('/orders')}
/>
```

---

### ✅ Recommandations pour la page Analyses

```typescript
// Import tous les composants de métriques
import { StatCard } from '@/components/dashboard/StatCard';
import { HeroMetricCard } from '@/components/dashboard/HeroMetricCard';
import { KPICard } from '@/components/dashboard/KPICard';
import { Skeleton } from '@/components/ui/skeleton';

// Structure recommandée
<div className="space-y-6">
  
  {/* Hero Metrics (3 colonnes) */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {loading ? (
      <>
        <Skeleton className="h-[160px] rounded-lg" />
        <Skeleton className="h-[160px] rounded-lg" />
        <Skeleton className="h-[160px] rounded-lg" />
      </>
    ) : (
      <>
        <HeroMetricCard
          title="CA Aujourd'hui"
          icon={Euro}
          value={formatCurrency(todayRevenue)}
          comparison={{
            text: `+${percentChange}%`,
            trend: "up"
          }}
          subtitle={`Hier: ${formatCurrency(yesterdayRevenue)}`}
        />
        <HeroMetricCard
          title="Transactions"
          icon={ShoppingCart}
          value={`${transactionCount}`}
        />
        <HeroMetricCard
          title="Panier moyen"
          icon={Receipt}
          value={formatCurrency(avgBasket)}
        />
      </>
    )}
  </div>

  {/* KPI Cards (4 colonnes) */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard
      title="CA"
      icon={Euro}
      data={{ current: 15500, reference: 14200 }}
      format="currency"
      target={20000}
      targetLabel="Budget"
    />
    <KPICard
      title="Commandes"
      icon={ShoppingCart}
      data={{ current: 245, reference: 220 }}
      format="integer"
      badge={{ label: "Cette semaine", value: 1245 }}
    />
    <KPICard
      title="TVA"
      icon={TrendingUp}
      data={{ current: 3100, reference: 2840 }}
      format="currency"
    />
    <KPICard
      title="Remises"
      icon={Percent}
      data={{ current: 500, reference: 600 }}
      format="currency"
      badge={{ label: "-16.7%", color: "default" }}
    />
  </div>

  {/* Stat Cards (Summary) */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <StatCard
      title="Chiffre d'affaires TTC"
      value={formatCurrency(totals.ttc)}
      subtitle="Total période"
      icon={DollarSign}
      isHighlighted
      trend={`+12% vs période précédente`}
    />
    <StatCard
      title="TVA Collectée"
      value={formatCurrency(totals.tva)}
      subtitle="À reverser"
      icon={Receipt}
      trend={`+8% vs période précédente`}
    />
  </div>

</div>
```

---

## Résumé - Recommandations pour la Page Analyses

### Composants à Importer

```typescript
// Dashboard Layout & Tabs
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Metrics
import { StatCard } from '@/components/dashboard/StatCard';
import { HeroMetricCard } from '@/components/dashboard/HeroMetricCard';
import { KPICard } from '@/components/dashboard/KPICard';

// Chartsimport { PaymentChart } from '@/components/reports/PaymentChart';
import { VATChart } from '@/components/reports/VATChart';
import { HourlyChannelChart } from '@/components/dashboard/HourlyChannelChart';
import { RevenueEvolutionChart } from '@/components/dashboard/RevenueEvolutionChart';

// Filters
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { ChannelSelector } from '@/components/accounting/ChannelSelector';

// Table
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VATDetailTable } from '@/components/reports/VATDetailTable';
import { PaymentDetailTable } from '@/components/reports/PaymentDetailTable';

// Buttons & UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { Download, Euro, ShoppingCart, Receipt, TrendingUp } from 'lucide-react';
```

### Architecture Proposée

```
Page Analyses
├── Header (Titre + Export)
├── Filtres Section
│   ├── AdvancedDatePicker
│   └── ChannelSelector
├── Tabs
│   ├── Tab 1: Vue d'ensemble
│   │   ├── Hero Metrics (3 cards)
│   │   ├── StatCards (Summary)
│   │   └── Charts (2 colonnes)
│   ├── Tab 2: Tendances
│   │   └── HourlyChannelChart + RevenueEvolutionChart
│   └── Tab 3: Détails
│       ├── VATDetailTable
│       └── PaymentDetailTable
└── Footer (Pagination ou Scroll)
```

---

## Notes Importantes

### 🎯 Réutilisabilité Maximale
- ✅ Utiliser les composants existants plutôt que créer de nouveaux
- ✅ Suivre le pattern de wrapper `bg-card rounded-lg border border-border overflow-hidden`
- ✅ Respecter les imports depuis `@/components/` (alias)

### 🎨 Cohérence Design
- ✅ Utiliser les IIcons de `lucide-react`
- ✅ Suivre le système de couleurs (primary, accent, secondary, muted)
- ✅ Utiliser `formatCurrency()` pour tous les montants
- ✅ Localisation FR via `date-fns/locale`

### 📊 Gestion des Données
- ✅ Utiliser `@tanstack/react-query` pour les requêtes API
- ✅ Ajouter skeleton loaders avec `<Skeleton />`
- ✅ Utiliser `toast` (sonner) pour les notifications
- ✅ Données en centimes → convertir en euros pour affichage

### 🔄 Patterns API
- ✅ Services situés dans `/src/services/`
- ✅ Utiliser `withMock()` pour développement
- ✅ Logger les appels API via `logAPI()`
- ✅ Formater dates en `yyyy-MM-dd` pour les requêtes

---

**Document généré** : Avril 2026  
**Version** : 1.0  
**Codebase** : Wello Back-Office (React + TypeScript)
