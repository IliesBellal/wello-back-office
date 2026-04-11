# Composant Tile - Guide de Réutilisation

## Vue d'ensemble

Le composant **Tile** est un composant de métrique unifié utilisé à travers l'application pour afficher les KPIs, statistiques et métriques.

### Design

- **Style cohérent** : Shadow, border, rounded-lg
- **Interactif** : Hover effect avec animation
- **État highlighted** : Gradient primaire avec icône glasmorphism
- **Flexible** : Accepte icône, valeur, trend, et contenu personnalisé

## Props

```typescript
interface TileProps {
  title: string;              // Libellé du KPI ex: "CA Actuel"
  value: string | ReactNode;  // Valeur affichée en gros ex: "€12,345.67"
  subtitle?: string;          // Sous-titre optionnel ex: "Chiffre d'affaires"
  icon?: LucideIcon;          // Icône Lucide optionnelle
  trend?: string;             // Trend optionnel ex: "+12.5%"
  isHighlighted?: boolean;    // Mettre en avant avec gradient (défaut: false)
  onClick?: () => void;       // Callback au clic
  className?: string;         // Classes Tailwind supplémentaires
  children?: ReactNode;       // Contenu enfant personnalisé
}
```

## Exemples d'Utilisation

### Tile Basique
```tsx
import { Tile } from '@/components/shared/Tile';
import { DollarSign } from 'lucide-react';

<Tile
  title="CA Actuel"
  value="€12,345.67"
  subtitle="Chiffre d'affaires"
  icon={DollarSign}
/>
```

### Tile Mise en Avant (isHighlighted)
```tsx
<Tile
  title="Total TTC"
  value="€50,234"
  subtitle="Montant brut"
  icon={Euro}
  isHighlighted
/>
```

### Tile avec Trend
```tsx
<Tile
  title="Commandes"
  value={245}
  subtitle="Nombre de commandes"
  icon={ShoppingCart}
>
  <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
    <TrendingUp size={14} />
    <span className="font-medium">+12.5%</span>
  </div>
</Tile>
```

### Tile Cliquable
```tsx
<Tile
  title="Voir détails"
  value="123"
  icon={ChevronRight}
  onClick={() => navigate('/details')}
/>
```

## Pages Utilisant Tile

### ✅ Actuellement Implémentées
1. **FinancialReports.tsx** - StatCard (3 tiles - CA TTC highlighted)
2. **DashboardAnalysis.tsx** - MetricCard wrapper (CA Actuel highlighted)
3. **CashRegisterHistory.tsx** - Stats tiles (Z de caisse highlighted)

### 📋 Prêtes pour Migration
- **TVA.tsx** - État charges TVA
- **Stocks.tsx** - Inventaire metrics
- **Index.tsx** - DashboardHero (RevenueCard + MetricCard)
- **Menu.tsx** - Produits metrics

## Design Cohérent

### Couleurs
- **Normal** : `bg-card`, `text-foreground`
- **Highlighted** : `bg-gradient-primary`, `text-white`
- **Icon background** : `bg-primary/10` (normal), `bg-white/20 backdrop-blur-sm` (highlighted)

### Spacing
- CardContent : `p-6`
- Icon wrapper : `p­-3`
- Icon size : `w-6 h-6`
- Gap icon-content : `ml-4`

### Typography
- Titre : `text-sm font-medium text-muted-foreground`
- Valeur : `text-3xl font-bold text-foreground`
- Sous-titre : `text-sm mt-1 text-muted-foreground`
- Trend : `text-xs font-medium`

## Pattern: Une Tile Highlighted par Page

**Convention** : Mettre `isHighlighted` sur le **premier** ou le **plus important** Tile de chaque page/tab.

**Raisons** :
- Crée une hiérarchie visuelle claire
- Guide l'utilisateur vers la métrique clé
- Cohérent avec FinancialReports et CashRegisterHistory

### Implémentation
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Tile
    title="CA Actuel"
    value={currentRevenue}
    icon={DollarSign}
    isHighlighted  // 👈 Première tile en avant
  />

  <Tile
    title="Période Précédente"
    value={previousRevenue}
    icon={TrendingUp}
  />

  <Tile
    title="Année Passée"
    value={yearAgoRevenue}
    icon={BarChart}
  />
</div>
```

## Migration Depuis Anciens Composants

### De Cards Simples
```tsx
// ❌ Avant
<Card>
  <CardContent className="pt-6">
    <p className="text-sm text-muted-foreground">Titre</p>
    <p className="text-3xl font-bold">€12,345</p>
  </CardContent>
</Card>

// ✅ Après
<Tile
  title="Titre"
  value="€12,345"
/>
```

### De MetricCard Custom
```tsx
// ❌ Avant
<MetricCard label="CA" value={12345} change={5} />

// ✅ Après
<Tile
  title="CA"
  value={12345}
  trend={"+5%"}
/>
```

### De StatCard
```tsx
// ✅ Déjà un alias pour Tile
// StatCard = Tile (voir StatCard.tsx)
```

## Avantages

✅ **Unicité de design** - Un seul composant pour toutes les métriques  
✅ **Cohérence visuelle** - Même style à travers l'application  
✅ **Maintenabilité** - Un seul fichier à mettre à jour  
✅ **Flexibilité** - Props et children pour cas spécialisés  
✅ **Performance** - Composant simple et léger  
✅ **Accessibilité** - Utilise des composants accessibles (Card)  

## À Venir

- [ ] Tile avec progress bar (targets)
- [ ] Tile avec comparaison année/mois
- [ ] Tile avec sparkline (mini-chart)
- [ ] Tile interactive (drill-down)
