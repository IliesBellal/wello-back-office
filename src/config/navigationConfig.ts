import { SVGProps } from 'react';
import type { AuthData, ModuleCapability } from '@/types/auth';
import { hasModuleAccess } from '@/lib/moduleAccess';
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
  Link2,
  Gift,
  Receipt,
  Percent,
  LineChart,
  History,
  ArrowLeftRight,
  ShieldCheck,
  ClipboardList,
  UsersRound,
  CalendarDays,
} from 'lucide-react';

export type IconComponent = React.ComponentType<SVGProps<SVGSVGElement>>;

export interface NavigationSubItem {
  id: string;
  label: string;
  icon: IconComponent;
  path: string;
  badge?: number;
  requiredModule?: ModuleCapability;
  visibilityCheck?: (authData: AuthData | null | undefined) => boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: IconComponent;
  path?: string | null;
  badge?: number;
  subItems?: NavigationSubItem[];
  requiredModule?: ModuleCapability;
  visibilityCheck?: (authData: AuthData | null | undefined) => boolean;
}

/**
 * Main navigation configuration for WelloResto backoffice
 * 
 * Structure:
 * - Flat array of navigation items
 * - Items can have subItems (collapsible)
 * - Path is optional if item has subItems
 * - Badge shows notification count
 */
export const navigationConfig: NavigationItem[] = [
  // ═══ MAIN ═══
  {
    id: 'home',
    label: 'Accueil',
    icon: LayoutDashboard,
    path: '/',
  },
  // ═══ MAIN ═══
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    subItems: [
      {
        id: 'dashboard-analysis',
        label: 'Analyse',
        icon: LineChart,
        path: '/dashboard/analysis',
      },
      {
        id: 'dashboard-order-history',
        label: 'Historique des commandes',
        icon: History,
        path: '/dashboard/order-history',
      },
    ],
  },

  // ═══ MENU MANAGEMENT ═══
  {
    id: 'menu',
    label: 'Menu',
    icon: UtensilsCrossed,
    subItems: [
      {
        id: 'products',
        label: 'Produits',
        icon: Package,
        path: '/menu/products',
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
  // ═══ LOCATION & SERVICE ═══
  {
    id: 'floor-plan',
    label: 'Plan de salle',
    icon: LayoutGrid,
    path: '/locations',
  },
  {
    id: 'reservations',
    label: 'Réservations',
    icon: LayoutGrid,
    requiredModule: 'bookings',
    subItems: [
      {
        id: 'reservations-list',
        label: 'Liste des réservations',
        icon: ClipboardList,
        path: '/reservations/list',
        requiredModule: 'bookings',
      },
      {
        id: 'reservations-settings',
        label: 'Paramètres',
        icon: Settings,
        path: '/reservations/settings',
        requiredModule: 'bookings',
      },
    ],
  },
  {
    id: 'customers',
    label: 'Clients',
    icon: Users,
    subItems: [
      {
        id: 'customers-list',
        label: 'Liste clients',
        icon: Users,
        path: '/customers/list',
      },
      {
        id: 'loyalty-programs',
        label: 'Fidélité',
        icon: Gift,
        path: '/customers/loyalty-programs',
      },
    ],
  },
  // ═══ TEAM ═══
  {
    id: 'equipe',
    label: 'Équipe',
    icon: UsersRound,
    subItems: [
      {
        id: 'equipiers',
        label: 'Équipiers',
        icon: Users,
        path: '/equipe/equipiers',
      },
      {
        id: 'planning',
        label: 'Planning',
        icon: CalendarDays,
        path: '/equipe/planning',
      },
    ],
  },
  {
    id: 'stocks',
    label: 'Stocks',
    icon: Boxes,
    path: '/stocks',
    requiredModule: 'stock',
  },
  // ═══ ACCOUNTING ═══
  {
    id: 'accounting',
    label: 'Comptabilité',
    icon: Receipt,
    subItems: [
      {
        id: 'cash-registers-history',
        label: 'Registres de caisse',
        icon: Wallet,
        path: '/accounting/registers',
      },
      {
        id: 'vat-declaration',
        label: 'Déclaration de TVA',
        icon: Percent,
        path: '/accounting/vat',
      },
      {
        id: 'financial-report',
        label: 'Rapports financiers',
        icon: BarChart3,
        path: '/accounting/report',
      },
    ],
  },

  // ═══ REPORTS & ANALYTICS ═══
  // Note: Consolidated under Accounting section

  // ═══ INTEGRATIONS ═══
  {
    id: 'channels',
    label: 'Canaux et Plateformes',
    icon: Link2,
    subItems: [
      {
        id: 'integrations-overview',
        label: 'Vue d\'ensemble',
        icon: LayoutGrid,
        path: '/integrations/overview',
      },
      {
        id: 'market-categories',
        label: 'Catégories vitrine',
        icon: Folder,
        path: '/menu/market-categories',
      },
      {
        id: 'scannorder',
        label: 'ScanNOrder',
        icon: Store,
        path: '/integrations/scannorder',
        requiredModule: 'scannorder',
      },
      {
        id: 'uber-eats',
        label: 'Uber Eats',
        icon: Store,
        path: '/integrations/uber-eats',
      },
      {
        id: 'deliveroo',
        label: 'Deliveroo',
        icon: Store,
        path: '/integrations/deliveroo',
      },
    ],
  },

  // ═══ HYGIENE & SAFETY ═══
  {
    id: 'haccp',
    label: 'HACCP',
    icon: ShieldCheck,
    requiredModule: 'haccp',
    subItems: [
      {
        id: 'haccp-activity',
        label: 'Activité',
        icon: ClipboardList,
        path: '/haccp/activity',
        requiredModule: 'haccp',
      },
      {
        id: 'haccp-settings',
        label: 'Paramètres',
        icon: Settings,
        path: '/haccp/settings',
        requiredModule: 'haccp',
      },
    ],
  },

  // ═══ ADMINISTRATION ═══
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
    ],
  },
];

export const getVisibleNavigationConfig = (authData: AuthData | null | undefined): NavigationItem[] => {
  return navigationConfig.reduce<NavigationItem[]>((items, item) => {
    if (!hasModuleAccess(authData, item.requiredModule)) {
      return items;
    }

    if (item.visibilityCheck && !item.visibilityCheck(authData)) {
      return items;
    }

    if (!item.subItems) {
      items.push(item);
      return items;
    }

    const visibleSubItems = item.subItems.filter((subItem) => {
      if (!hasModuleAccess(authData, subItem.requiredModule)) {
        return false;
      }

      if (subItem.visibilityCheck && !subItem.visibilityCheck(authData)) {
        return false;
      }

      return true;
    });

    if (visibleSubItems.length === 0 && !item.path) {
      return items;
    }

    items.push({
      ...item,
      subItems: visibleSubItems,
    });

    return items;
  }, []);
};
