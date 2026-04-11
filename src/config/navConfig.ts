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
  Link2,
  Gift,
  Receipt,
  Percent,
  LineChart,
  History,
  Briefcase,
  Calendar,
  Umbrella,
  ArrowLeftRight,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  Home,
  ShoppingBag,
  Menu as MenuIcon,
} from 'lucide-react';

export type IconComponent = React.ComponentType<SVGProps<SVGSVGElement>>;

export interface NavChild {
  id: string;
  title: string;
  icon: IconComponent;
  href: string;
  badge?: number;
}

export interface NavItem {
  id: string;
  title: string;
  icon: IconComponent;
  href?: string | null;
  children?: NavChild[];
  badge?: number;
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
    icon: MenuIcon,
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
    id: 'reservations',
    title: 'Réservations',
    icon: LayoutGrid,
    children: [
      {
        id: 'floor-plan',
        title: 'Plan de salle',
        icon: LayoutGrid,
        href: '/locations',
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

  // ═══ STOCKS ═══
  {
    id: 'stocks',
    title: 'Stocks',
    icon: Boxes,
    href: '/stocks',
  },

  // ═══ TEAM MANAGEMENT ═══
  {
    id: 'team',
    title: 'Équipe',
    icon: Briefcase,
    children: [
      {
        id: 'team-planning',
        title: 'Planning',
        icon: Calendar,
        href: '/equipe/planning',
      },
      {
        id: 'team-employees',
        title: 'Employés',
        icon: Users,
        href: '/equipe/employes',
      },
      {
        id: 'team-timesheets',
        title: 'Pointages',
        icon: Clock,
        href: '/equipe/pointages',
      },
      {
        id: 'team-leaves',
        title: 'Congés & Échanges',
        icon: Umbrella,
        href: '/equipe/conges',
      },
    ],
    primaryNav: true,
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
    children: [
      {
        id: 'haccp-compliance',
        title: 'Conformité',
        icon: ShieldCheck,
        href: '/haccp/compliance',
      },
      {
        id: 'haccp-history',
        title: 'Historique',
        icon: ClipboardList,
        href: '/haccp/history',
      },
      {
        id: 'haccp-alerts',
        title: 'Alertes',
        icon: AlertTriangle,
        href: '/haccp/alerts',
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
 * Get primary navigation items for BottomNav
 * Returns only items marked with primaryNav: true
 */
export const getPrimaryNavItems = (): NavItem[] => {
  return NAV_ITEMS.filter(item => item.primaryNav);
};
