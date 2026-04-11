# 🎯 Tile Component - Quick Reference

## Import & Basic Usage

```tsx
import { Tile } from '@/components/shared/Tile';
import { DollarSign, TrendingUp } from 'lucide-react';

// Simple tile
<Tile
  title="Revenue"
  value="€12,345"
  icon={DollarSign}
/>

// Highlighted tile (primary metric)
<Tile
  title="CA Actuel"
  value="€12,345"
  icon={DollarSign}
  isHighlighted
/>

// With subtitle and trend
<Tile
  title="Revenue"
  value="€12,345"
  subtitle="vs previous period"
  trend="+12.5%"
  icon={TrendingUp}
/>

// With custom content
<Tile title="Orders" value={245}>
  <div className="text-green-600 text-sm">+15%</div>
</Tile>

// Clickable
<Tile
  title="See Details"
  value="234"
  onClick={() => navigate('/details')}
/>
```

## Common Props

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | ✅ | Label for the metric |
| `value` | string\|ReactNode | ✅ | Main value (large text) |
| `icon` | LucideIcon | ❌ | Lucide icon component |
| `subtitle` | string | ❌ | Additional context |
| `isHighlighted` | boolean | ❌ | Gradient + white text |
| `onClick` | () => void | ❌ | Click handler |
| `children` | ReactNode | ❌ | Custom content below value |
| `className` | string | ❌ | Additional Tailwind classes |

## Responsive Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Tile title="Metric 1" value={val1} isHighlighted />
  <Tile title="Metric 2" value={val2} />
  <Tile title="Metric 3" value={val3} />
  <Tile title="Metric 4" value={val4} />
</div>
```

**Breakpoints:**
- Mobile: 1 column
- Tablet: 2 columns  
- Desktop: 4 columns

## Icons to Use

### Financial
```tsx
import { DollarSign, Euro, Percent, TrendingUp, TrendingDown } from 'lucide-react';
```

### Business
```tsx
import { ShoppingCart, Users, Package, Receipt, Clock } from 'lucide-react';
```

### General
```tsx
import { BarChart, PieChart, Target, CheckCircle2, AlertCircle } from 'lucide-react';
```

## Common Patterns

### Dashboard KPIs
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Tile title="Total Revenue" value="€50,234" icon={DollarSign} isHighlighted />
  <Tile title="Orders" value={1234} icon={ShoppingCart} />
  <Tile title="Customers" value={567} icon={Users} />
</div>
```

### Status Cards
```tsx
<Tile
  title="Active"
  value={count}
  icon={CheckCircle2}
  isHighlighted={isActive}
/>
```

### With Trend Badge
```tsx
<Tile title="Revenue" value="€10k">
  <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
    <TrendingUp size={14} />
    <span>+12.5%</span>
  </div>
</Tile>
```

### Account/Hierarchy
```tsx
<Tile
  title="Sub-metric"
  value={subValue}
  subtitle={`of ${totalValue} total`}
/>
```

## Pages Using Tile

✅ **FinancialReports** - StatCard (Tile alias)  
✅ **DashboardAnalysis** - MetricCard wrapper  
✅ **CashRegisterHistory** - Tile  
✅ **TVA** - StatCard (Tile alias)  

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/components/shared/Tile.tsx` | Core component | ✅ New |
| `src/components/dashboard/StatCard.tsx` | Backwards-compatible alias | ✅ Refactored |
| `TILE_COMPONENT_GUIDE.md` | Full usage guide | ✅ Documentation |
| `TILE_INTEGRATION_STATUS.md` | Implementation status | ✅ Status |
| `TILE_IMPLEMENTATION_REPORT.md` | Detailed report | ✅ Report |

## Troubleshooting

### Icon not showing?
Check that you're importing from 'lucide-react' and that the icon is a valid Lucide icon.

### Highlighted not working?
Ensure `isHighlighted` prop is set (no value needed: `isHighlighted` or `isHighlighted={true}`)

### Grid not responsive?
Check parent has classes: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

### Value not formatting?
Pass formatted string to `value` prop: `value={format(number)}`

## Design Tokens

```
Normal State:
  bg-card
  text-foreground
  shadow-card
  border border-border

Highlighted State:
  bg-gradient-primary
  text-white  
  border-transparent
  shadow-lg

Icon Background:
  Normal: bg-primary/10 rounded-2xl p-3
  Highlighted: bg-white/20 backdrop-blur-sm rounded-2xl p-3
```

## When to Highlight?

✅ **DO highlight:**
- The primary/most important metric per section
- Revenue on financial pages
- Goals or targets
- Current period vs historical

❌ **DON'T highlight:**
- Multiple tiles on same level (confuses hierarchy)
- Every tile (defeats purpose)
- Secondary metrics

## Next: Apply to Your Page

1. Copy 3-line import
2. Wrap metrics in responsive grid
3. Add `isHighlighted` to first/primary tile
4. Done! 🎉

See `TILE_COMPONENT_GUIDE.md` for detailed migration examples.
