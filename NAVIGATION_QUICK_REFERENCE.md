# Quick Reference: Navigation System

## 🎯 TL;DR

- ✅ Navigation unifiée desktop/mobile
- ✅ Un composant: `NavigationItems.tsx`
- ✅ Configuration: `navigationConfig.ts`
- ✅ Aucun changement au Layout requis

---

## 📍 Fichiers clés

| Fichier | Rôle | À modifier? |
|---------|------|-----------|
| `src/config/navigationConfig.ts` | Configuration du menu | ✏️ OUI |
| `src/components/navigation/NavigationItems.tsx` | Composant réutilisable | 🔒 NON |
| `src/components/navigation/Sidebar.tsx` | Sidebar desktop | 🔒 NON |
| `src/components/mobile/MobileSidebar.tsx` | Navigation mobile | 🔒 NON |
| `src/components/dashboard/DashboardLayout.tsx` | Layout principal | 🔒 NON |

---

## ✏️ Comment modifier le menu

### Ajouter un simple item

```typescript
// Dans navigationConfig.ts
{
  id: 'unique-id',
  label: 'Mon Item',
  icon: IconName,
  path: '/mon-chemin',
}
```

### Ajouter une section collapsible

```typescript
{
  id: 'section-id',
  label: 'Ma Section',
  icon: IconName,
  subItems: [
    {
      id: 'sub-item-1',
      label: 'Sous-item 1',
      icon: SubIcon,
      path: '/chemin/1',
    },
    {
      id: 'sub-item-2',
      label: 'Sous-item 2',
      icon: SubIcon,
      path: '/chemin/2',
    },
  ]
}
```

### Ajouter un badge

```typescript
{
  id: 'commandes',
  label: 'Commandes',
  icon: ShoppingCart,
  path: '/orders',
  badge: 5,  // ← Ajouter juste ça
}
```

---

## 🏗️ Architecture

```
DashboardLayout
├── Desktop (isMobile === false)
│   └── Sidebar
│       └── NavigationItems (variant="desktop")
│
└── Mobile (isMobile === true)
    ├── MobileHeader
    │   └── Sheet (tiroir)
    │       └── MobileSidebar
    │           └── NavigationItems (variant="mobile")
    └── BottomNav
```

---

## 🔌 Intégration dans un nouveau composant

### Utiliser NavigationItems seul

```typescript
import { NavigationItems } from '@/components/navigation/NavigationItems';
import { navigationConfig } from '@/config/navigationConfig';

export function MyComponent() {
  return (
    <NavigationItems
      items={navigationConfig}
      variant="mobile"  // ou "desktop"
      onItemClick={() => console.log('clicked')}
    />
  );
}
```

### Utiliser le Sidebar complet

```typescript
import { Sidebar } from '@/components/navigation/Sidebar';

export function MyLayout() {
  return (
    <div className="flex">
      <Sidebar />  {/* Prêt à l'emploi */}
      <main>Contenu</main>
    </div>
  );
}
```

---

## 🎨 Icônes recommandées

```typescript
import {
  LayoutDashboard,     // Accueil, Dashboard
  ShoppingCart,        // Commandes, Orders
  UtensilsCrossed,     // Menu, Restaurant
  Users,               // Clients, Utilisateurs
  LayoutGrid,          // Grille, Plan de salle
  Package,             // Produits, Stock
  Settings,            // Paramètres
  BarChart3,           // Rapports, Analytics
  Wallet,              // Paiements, Comptabilité
  Tag,                 // Tags, Catégories
  Gift,                // Promotions, Fidélité
  Link2,               // Intégrations
  Calendar,            // Réservations, Dates
  Bell,                // Notifications
  AlertTriangle,       // Alertes
} from 'lucide-react';
```

---

## 🔍 Structure de navigationConfig

```typescript
export const navigationConfig: NavigationItem[] = [
  // item 1 simple (sans enfants)
  {
    id: 'home',
    label: 'Accueil',
    icon: LayoutDashboard,
    path: '/',
  },
  
  // item 2 collapsible (avec enfants)
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    subItems: [
      { id: 'dashboard-1', label: 'Analyse', icon: LineChart, path: '/dashboard/analysis' },
      { id: 'dashboard-2', label: 'Historique', icon: History, path: '/dashboard/history' },
    ],
  },
  
  // item 3 avec badge
  {
    id: 'orders',
    label: 'Commandes',
    icon: ShoppingCart,
    path: '/orders',
    badge: 5,
  },
];
```

---

## 🐛 Dépannage

### Le menu ne s'affiche pas?
1. Vérifier que `navigationConfig` est importé
2. Vérifier les `id` uniques pour chaque item
3. Vérifier que les icônes sont importées

### Les sous-items ne s'ouvrent pas?
- Mode Desktop: Utiliser `collapsibleState` et `onToggleCollapsible`
- Mode Mobile: Vérifié automatiquement

### Active state ne fonctionne pas?
- Vérifier que `path` correspond exactement à la route
- `NavLink` détecte automatiquement avec `location.pathname`

### Badge ne s'affiche pas?
- Vérifier que `badge` > 0
- Vérifier le CSS de `.badge` class

---

## 📦 Props complètes

### NavigationItems.props
```typescript
interface NavigationItemsProps {
  items: NavigationItem[];
  variant: 'desktop' | 'mobile';
  onItemClick?: () => void;
  isCollapsed?: boolean;
  collapsibleState?: Record<string, boolean>;
  onToggleCollapsible?: (itemId: string) => void;
}
```

### NavigationItem
```typescript
interface NavigationItem {
  id: string;
  label: string;
  icon: IconComponent;
  path?: string | null;
  badge?: number;
  subItems?: NavigationSubItem[];
}
```

### NavigationSubItem
```typescript
interface NavigationSubItem {
  id: string;
  label: string;
  icon: IconComponent;
  path: string;
  badge?: number;
}
```

---

## ⚡ Exemples rapides

### Afficher pour les admins uniquement
```typescript
const visibleItems = navigationConfig.filter(item => {
  if (item.id === 'admin-panel' && !isAdmin) return false;
  return true;
});

<NavigationItems items={visibleItems} variant="desktop" {...props} />
```

### Nombre de commandes dynamique
```typescript
const configWithBadges = navigationConfig.map(item => {
  if (item.id === 'orders') {
    return { ...item, badge: pendingOrdersCount };
  }
  return item;
});

<NavigationItems items={configWithBadges} variant="desktop" {...props} />
```

### Écouter les changements de navigation
```typescript
<NavigationItems
  items={navigationConfig}
  variant="mobile"
  onItemClick={() => {
    console.log('Navigation item clicked');
    // Fermer le drawer, tracker l'event, etc.
  }}
/>
```

---

## ✅ Checklist: Ajouter une nouvelle page

- [ ] Créer le composant page (ex: `/src/pages/MyPage.tsx`)
- [ ] Ajouter la route dans le router
- [ ] Ajouter un item dans `navigationConfig.ts`
- [ ] Tester le lien (desktop et mobile)
- [ ] Vérifier l'active state en visitant la page
- [ ] Ajouter un badge si nécessaire (ex: notifications)

---

## 🎓 Apprentissage supplémentaire

- **Lucide Icons**: https://lucide.dev
- **Radix UI Collapsible**: https://www.radix-ui.com/docs/primitives/components/collapsible
- **useSidebar hook**: Gère l'état localStorage automatiquement
- **NavLink component**: Détecte l'active state automatiquement
