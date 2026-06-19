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
  Home,
  ShoppingBag,
  UsersRound,
  CalendarDays,
  Printer,
  MonitorSmartphone,
  Tablet,
  Settings2,
} from 'lucide-react';

export type IconComponent = React.ComponentType<SVGProps<SVGSVGElement>>;

export interface NavChild {
  id: string;
  title: string;
  icon: IconComponent;
  href: string;
  badge?: number;
  requiredModule?: ModuleCapability;
  visibilityCheck?: (authData: AuthData | null | undefined) => boolean;
}

export interface NavItem {
  id: string;
  title: string;
  icon: IconComponent;
  href?: string | null;
  children?: NavChild[];
  badge?: number;
  requiredModule?: ModuleCapability;
  visibilityCheck?: (authData: AuthData | null | undefined) => boolean;
  // For BottomNav: mark primary items that should appear in mobile bottom navigation
  primaryNav?: boolean;
}

/**
 * Centralized Navigation Configuration
 * 
 * Single source of truth for all navigation:
 * - Desktop Sidebar (expanded & collapsed modes)
 * - Mobile Sidebar
 * - Bottom Navigation (mobile)
 * 
 * Items marked with primaryNav=true appear in the BottomNav
 * 
 * Structure:
 * - title: Display label
 * - icon: Lucide icon component
 * - href: Route path (optional if has children)
 * - children: Submenu items (optional)
 * - primaryNav: Show in mobile bottom nav (optional)
 */
export const NAV_ITEMS: NavItem[] = [
  // ═══ MAIN ═══
  {
    id: 'home',
    title: 'Accueil',
    icon: Home,
    href: '/',
    primaryNav: true,
  },

  // ═══ DASHBOARD ═══
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    icon: LayoutDashboard,
    children: [
      {
        id: 'dashboard-analysis',
        title: 'Analyse',
        icon: LineChart,
        href: '/dashboard/analysis',
      },
      {
        id: 'dashboard-order-history',
        title: 'Historique des commandes',
        icon: History,
        href: '/dashboard/order-history',
      },
    ],
  },

  // ═══ MENU MANAGEMENT ═══
  {
    id: 'menu',
    title: 'Menu',
    icon: UtensilsCrossed,
    children: [
      {
        id: 'products',
        title: 'Produits',
        icon: Package,
        href: '/menu/products',
      },
      {
        id: 'categories',
        title: 'Catégories caisse',
        icon: Folder,
        href: '/menu/categories',
      },
      {
        id: 'tags',
        title: 'Tags',
        icon: Tag,
        href: '/menu/tags',
      },
      {
        id: 'ingredients',
        title: 'Ingrédients',
        icon: Boxes,
        href: '/menu/components',
      },
      {
        id: 'price-grid',
        title: 'Grille de prix',
        icon: DollarSign,
        href: '/menu/price-grid',
      },
      {
        id: 'modifiers',
        title: 'Options & Suppléments',
        icon: Cog,
        href: '/menu/attributes',
      },
      {
        id: 'promotions',
        title: 'Promotions & Disponibilités',
        icon: TrendingUp,
        href: '/menu/promotions',
      },
    ],
    primaryNav: true,
  },

  // ═══ LOCATIONS & RESERVATIONS ═══
  {
    id: 'floor-plan',
    title: 'Plan de salle',
    icon: LayoutGrid,
    href: '/locations',
  },

  {
    id: 'reservations',
    title: 'Réservations',
    icon: LayoutGrid,
    requiredModule: 'bookings',
    children: [
      {
        id: 'reservations-list',
        title: 'Liste des réservations',
        icon: ClipboardList,
        href: '/reservations/list',
        requiredModule: 'bookings',
      },
      {
        id: 'reservations-settings',
        title: 'Paramètres',
        icon: Settings,
        href: '/reservations/settings',
        requiredModule: 'bookings',
      },
    ],
  },

  // ═══ CUSTOMERS ═══
  {
    id: 'customers',
    title: 'Clients',
    icon: Users,
    children: [
      {
        id: 'customers-list',
        title: 'Liste clients',
        icon: Users,
        href: '/customers/list',
      },
      {
        id: 'loyalty-programs',
        title: 'Fidélité',
        icon: Gift,
        href: '/customers/loyalty-programs',
      },
    ],
  },

  // ═══ TEAM ═══
  {
    id: 'equipe',
    title: 'Équipe',
    icon: UsersRound,
    children: [
      {
        id: 'equipiers',
        title: 'Équipiers',
        icon: Users,
        href: '/equipe/equipiers',
      },
      {
        id: 'planning',
        title: 'Planning',
        icon: CalendarDays,
        href: '/equipe/planning',
      },
      {
        id: 'pointages',
        title: 'Pointages',
        icon: Clock,
        href: '/equipe/pointages',
      },
      {
        id: 'conges-echanges',
        title: 'Congés & échanges',
        icon: ArrowLeftRight,
        href: '/equipe/conges-echanges',
      },
      {
        id: 'equipe-parametres',
        title: 'Paramètres',
        icon: Settings,
        href: '/equipe/parametres',
      },
    ],
  },

  // ═══ STOCKS ═══
  {
    id: 'stocks',
    title: 'Stocks',
    icon: Boxes,
    href: '/stocks',
    requiredModule: 'stock',
  },
  // ═══ ACCOUNTING ═══
  {
    id: 'accounting',
    title: 'Comptabilité',
    icon: Receipt,
    children: [
      {
        id: 'cash-registers-history',
        title: 'Registres de caisse',
        icon: Wallet,
        href: '/accounting/registers',
      },
      {
        id: 'vat-declaration',
        title: 'Déclaration de TVA',
        icon: Percent,
        href: '/accounting/vat',
      },
      {
        id: 'financial-report',
        title: 'Rapports financiers',
        icon: BarChart3,
        href: '/accounting/report',
      },
    ],
  },

  // ═══ INTEGRATIONS ═══
  {
    id: 'channels',
    title: 'Canaux et Plateformes',
    icon: Link2,
    children: [
      {
        id: 'integrations-overview',
        title: 'Vue d\'ensemble',
        icon: LayoutGrid,
        href: '/integrations/overview',
      },
      {
        id: 'market-categories',
        title: 'Catégories vitrine',
        icon: Folder,
        href: '/menu/market-categories',
      },
      {
        id: 'scannorder',
        title: 'ScanNOrder',
        icon: Store,
        href: '/integrations/scannorder',
        requiredModule: 'scannorder',
      },
      {
        id: 'uber-eats',
        title: 'Uber Eats',
        icon: Store,
        href: '/integrations/uber-eats',
      },
      {
        id: 'deliveroo',
        title: 'Deliveroo',
        icon: Store,
        href: '/integrations/deliveroo',
      },
    ],
  },

  // ═══ HYGIENE & SAFETY (HACCP) ═══
  {
    id: 'haccp',
    title: 'HACCP',
    icon: ShieldCheck,
    requiredModule: 'haccp',
    children: [
      {
        id: 'haccp-activity',
        title: 'Activité',
        icon: ClipboardList,
        href: '/haccp/activity',
        requiredModule: 'haccp',
      },
      {
        id: 'haccp-settings',
        title: 'Paramètres',
        icon: Settings,
        href: '/haccp/settings',
        requiredModule: 'haccp',
      },
    ],
  },

  // ═══ KIOSK ═══
  {
    id: 'kiosk',
    title: 'Kiosk',
    icon: MonitorSmartphone,
    children: [
      {
        id: 'kiosk-devices',
        title: 'Mes bornes',
        icon: Tablet,
        href: '/kiosk/devices',
      },
      {
        id: 'kiosk-settings',
        title: 'Paramètres',
        icon: Settings2,
        href: '/kiosk/settings',
      },
    ],
  },

  // ═══ SETTINGS & ADMINISTRATION ═══
  {
    id: 'settings',
    title: 'Paramètres',
    icon: Settings,
    children: [
      {
        id: 'establishment',
        title: 'Établissement',
        icon: Store,
        href: '/settings/establishment',
      },
      {
        id: 'printers',
        title: 'Imprimantes',
        icon: Printer,
        href: '/settings/printers',
      },
      {
        id: 'profile',
        title: 'Mon Profil',
        icon: Users,
        href: '/settings/profile',
      },
    ],
    primaryNav: true,
  },
];

/**
 * Filter navigation items based on module access.
 */
export const getVisibleNavItems = (authData: AuthData | null | undefined): NavItem[] => {
  return NAV_ITEMS.reduce<NavItem[]>((items, item) => {
    if (!hasModuleAccess(authData, item.requiredModule)) {
      return items;
    }

    if (item.visibilityCheck && !item.visibilityCheck(authData)) {
      return items;
    }

    if (!item.children) {
      items.push(item);
      return items;
    }

    const visibleChildren = item.children.filter((child) => {
      if (!hasModuleAccess(authData, child.requiredModule)) {
        return false;
      }

      if (child.visibilityCheck && !child.visibilityCheck(authData)) {
        return false;
      }

      return true;
    });

    if (visibleChildren.length === 0 && !item.href) {
      return items;
    }

    items.push({
      ...item,
      children: visibleChildren,
    });

    return items;
  }, []);
};

/**
 * Get primary navigation items for BottomNav
 * Returns only items marked with primaryNav: true
 */
export const getPrimaryNavItems = (authData: AuthData | null | undefined): NavItem[] => {
  return getVisibleNavItems(authData).filter(item => item.primaryNav);
};
