import { SVGProps } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  LayoutGrid,
  Users,
  Wallet,
  TrendingUp,
  UtensilsCrossed,
  Package,
  Settings,
  Store,
  Cog,
  BarChart3,
  Clock,
  DollarSign,
  Boxes,
  Folder,
  Tag,
} from 'lucide-react';

export type IconComponent = React.ComponentType<SVGProps<SVGSVGElement>>;

export interface NavigationSubItem {
  id: string;
  label: string;
  icon: IconComponent;
  path: string;
  badge?: number;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: IconComponent;
  path?: string | null;
  badge?: number;
  subItems?: NavigationSubItem[];
}

export interface NavigationSection {
  id: string;
  label?: string;
  items: NavigationItem[];
}

/**
 * Main navigation configuration for WelloResto backoffice
 * 
 * Structure:
 * - Grouped by logical sections
 * - Items can have subItems (collapsible)
 * - Path is optional if item has subItems
 * - Badge shows notification count
 */
export const navigationConfig: NavigationSection[] = [
  // ═══ MAIN SECTION ═══
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Accueil',
        icon: LayoutDashboard,
        path: '/',
      },
      {
        id: 'orders',
        label: 'Commandes',
        icon: ShoppingCart,
        path: '/orders',
        badge: 0,
      },
    ],
  },

  // ═══ LOCATION & SERVICE ═══
  {
    id: 'location-service',
    label: 'Établissement',
    items: [
      {
        id: 'floor-plan',
        label: 'Plan de salle',
        icon: LayoutGrid,
        path: '/locations',
      },
      {
        id: 'cash-registers',
        label: 'Registres de caisse',
        icon: Wallet,
        path: '/cash-registers',
      },
      {
        id: 'customers',
        label: 'Clients',
        icon: Users,
        path: '/customers',
      },
    ],
  },

  // ═══ MENU MANAGEMENT ═══
  {
    id: 'menu-management',
    label: 'Menu & Articles',
    items: [
      {
        id: 'menu',
        label: 'Menu',
        icon: UtensilsCrossed,
        subItems: [
          {
            id: 'products',
            label: 'Produits',
            icon: Package,
            path: '/menu',
          },
          {
            id: 'categories',
            label: 'Catégories caisse',
            icon: Folder,
            path: '/menu/categories',
          },
          {
            id: 'tags',
            label: 'Tags',
            icon: Tag,
            path: '/menu/tags',
          },
          {
            id: 'ingredients',
            label: 'Ingrédients',
            icon: Boxes,
            path: '/menu/components',
          },
          {
            id: 'price-grid',
            label: 'Grille de prix',
            icon: DollarSign,
            path: '/menu/price-grid',
          },
          {
            id: 'modifiers',
            label: 'Options & Suppléments',
            icon: Cog,
            path: '/menu/attributes',
          },
          {
            id: 'promotions',
            label: 'Promotions & Disponibilités',
            icon: TrendingUp,
            path: '/menu/promotions',
          },
        ],
      },
      {
        id: 'stocks',
        label: 'Stocks',
        icon: Boxes,
        path: '/stocks',
      },
    ],
  },

  // ═══ REPORTS & ANALYTICS ═══
  {
    id: 'reports-analytics',
    label: 'Rapports & Analytiques',
    items: [
      {
        id: 'financial-reports',
        label: 'Rapports financiers',
        icon: BarChart3,
        path: '/reports/financial',
      },
      {
        id: 'performance',
        label: 'Performance',
        icon: TrendingUp,
        path: '/reports/performance',
      },
    ],
  },

  // ═══ ADMINISTRATION ═══
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'users',
        label: 'Utilisateurs',
        icon: Users,
        path: '/users',
      },
      {
        id: 'settings',
        label: 'Paramètres',
        icon: Settings,
        subItems: [
          {
            id: 'establishment',
            label: 'Établissement',
            icon: Store,
            path: '/settings/establishment',
          },
          {
            id: 'profile',
            label: 'Mon Profil',
            icon: Users,
            path: '/settings/profile',
          },
          {
            id: 'integrations',
            label: 'Intégrations',
            icon: Cog,
            path: '/settings/integrations',
          },
        ],
      },
    ],
  },
];
