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
    id: 'reservations',
    label: 'Réservations',
    icon: LayoutGrid,
    subItems: [
      {
        id: 'floor-plan',
        label: 'Plan de salle',
        icon: LayoutGrid,
        path: '/locations',
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
  {
    id: 'stocks',
    label: 'Stocks',
    icon: Boxes,
    path: '/stocks',
  },

  // ═══ TEAM MANAGEMENT ═══
  {
    id: 'team',
    label: 'Équipe',
    icon: Briefcase,
    subItems: [
      {
        id: 'team-planning',
        label: 'Planning',
        icon: Calendar,
        path: '/equipe/planning',
      },
      {
        id: 'team-employees',
        label: 'Employés',
        icon: Users,
        path: '/equipe/employes',
      },
      {
        id: 'team-timesheets',
        label: 'Pointages',
        icon: Clock,
        path: '/equipe/pointages',
      },
      {
        id: 'team-leaves',
        label: 'Congés & Échanges',
        icon: Umbrella,
        path: '/equipe/conges',
      },
    ],
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
    subItems: [
      {
        id: 'haccp-compliance',
        label: 'Conformité',
        icon: ShieldCheck,
        path: '/haccp/compliance',
      },
      {
        id: 'haccp-history',
        label: 'Historique',
        icon: ClipboardList,
        path: '/haccp/history',
      },
      {
        id: 'haccp-alerts',
        label: 'Alertes',
        icon: AlertTriangle,
        path: '/haccp/alerts',
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
