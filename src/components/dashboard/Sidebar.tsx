import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import {
  Home,
  ShoppingBag,
  Menu as MenuIcon,
  Users,
  Settings,
  Store,
  User,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  LayoutGrid,
  Users2,
  Calculator,
  Warehouse,
  Utensils,
  Tag,
  TicketPercent,
  BarChart3,
  Clock,
  ChevronsLeft,
  ChevronsRight,
  Link2,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MenuItem = {
  title: string;
  icon: typeof Home;
  path: string;
  end?: boolean;
};

const dashboardItems: MenuItem[] = [
  {
    title: 'Analyse',
    icon: BarChart3,
    path: '/dashboard/analysis',
    end: true,
  },
  {
    title: 'Historique de commandes',
    icon: Clock,
    path: '/dashboard/order-history',
    end: true,
  },
];

const mainMenuItems: MenuItem[] = [
  { title: 'Dashboard', icon: Home, path: '/', end: true },
  { title: 'Commandes', icon: ShoppingBag, path: '/orders', end: false },
  { title: 'Plan de Salle', icon: LayoutGrid, path: '/locations' },
  { title: 'Utilisateurs', icon: Users2, path: '/users' },
  { title: 'Registres de Caisse', icon: Calculator, path: '/cash-registers' },
  { title: 'Clients', icon: Users, path: '/customers' },
  { title: 'Stocks', icon: Warehouse, path: '/stocks' },
  { title: 'Rapports & Comptabilité', icon: FileText, path: '/reports/financial' },
];

const menuSubItems: MenuItem[] = [
  { title: 'Produits', icon: Utensils, path: '/menu', end: true },
  { title: 'Ingrédients', icon: Package, path: '/menu/components', end: false },
  { title: 'Grille de prix', icon: Tag, path: '/menu/price-grid', end: false },
  { title: 'Options & Suppléments', icon: Settings, path: '/menu/attributes', end: false },
  { title: 'Promotions & Dispo.', icon: TicketPercent, path: '/menu/promotions', end: false },
];

const settingsSubItems: MenuItem[] = [
  { title: 'Établissement', icon: Store, path: '/settings/establishment' },
  { title: 'Mon Profil', icon: User, path: '/settings/profile' },
];

const integrationsSubItems: MenuItem[] = [
  { title: 'Vue d\'ensemble', icon: LayoutGrid, path: '/integrations/overview', end: true },
  { title: 'Uber Eats', icon: Store, path: '/integrations/uber-eats', end: true },
  { title: 'Deliveroo', icon: Store, path: '/integrations/deliveroo', end: true },
];

// ─── Collapsed NavItem ────────────────────────────────────────────────────

interface CollapsedNavItemProps {
  item: MenuItem;
}

const CollapsedNavItem = ({ item }: CollapsedNavItemProps) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-center w-12 h-12 rounded-lg transition-all',
          'text-sidebar-foreground hover:bg-sidebar-accent/80 hover:shadow-md',
          isActive && 'bg-gradient-primary text-white shadow-lg',
        )
      }
      title={item.title}
    >
      <Icon className="w-5 h-5" />
    </NavLink>
  );
};

// ─── Expanded NavItem ─────────────────────────────────────────────────────

interface ExpandedNavItemProps {
  item: MenuItem;
}

const ExpandedNavItem = ({ item }: ExpandedNavItemProps) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full',
          'text-sidebar-foreground hover:bg-sidebar-accent/70',
          isActive && 'bg-gradient-primary text-white font-medium shadow-md'
        )
      }
    >
      <Icon className="w-5 h-5 shrink-0 flex-none" />
      <span className="text-sm font-medium truncate">{item.title}</span>
    </NavLink>
  );
};

// ─── Collapsed Collapsible Item ───────────────────────────────────────────

interface CollapsedCollapsibleProps {
  icon: typeof Home;
  title: string;
  children: MenuItem[];
}

const CollapsedCollapsible = ({ icon: Icon, title, children }: CollapsedCollapsibleProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/80 hover:shadow-md transition-all"
          title={title}
        >
          <Icon className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-56 p-0 rounded-xl shadow-xl border border-border/80">
        <div className="p-3 space-y-1">
          <p className="text-xs font-bold text-muted-foreground px-3 py-2 uppercase tracking-wider">
            {title}
          </p>
          {children.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  'text-sidebar-foreground hover:bg-sidebar-accent/50',
                  isActive && 'bg-gradient-primary text-white font-medium'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </NavLink>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── Expanded Collapsible Item ────────────────────────────────────────────

interface ExpandedCollapsibleProps {
  icon: typeof Home;
  title: string;
  children: MenuItem[];
  defaultOpen?: boolean;
}

const ExpandedCollapsible = ({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: ExpandedCollapsibleProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all">
        <div className="flex items-center gap-4">
          <Icon className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 mt-1 pl-2">
        {children.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm transition-all',
                'text-sidebar-foreground hover:bg-sidebar-accent/50',
                isActive && 'bg-gradient-primary text-white font-medium'
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────

const SIDEBAR_STORAGE_KEY = 'wello-sidebar-collapsed';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });
  
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [integrationsOpen, setIntegrationsOpen] = useState(true);

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed));
    } catch (e) {
      console.warn('Failed to save sidebar state:', e);
    }
  }, [collapsed]);

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border shadow-soft flex flex-col overflow-y-auto transition-all duration-200',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'border-b border-sidebar-border flex items-center justify-between transition-all duration-200',
        collapsed ? 'h-20 px-2 py-4' : 'h-20 px-4 py-4'
      )}>
        {!collapsed && (
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Wello Resto
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 shrink-0"
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <ChevronsLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 transition-all duration-200',
        collapsed ? 'px-2 py-3 space-y-3 flex flex-col items-center' : 'p-4 space-y-1.5'
      )}>
        {/* Main items */}
        {mainMenuItems.map((item) => 
          collapsed ? (
            <CollapsedNavItem key={item.path} item={item} />
          ) : (
            <ExpandedNavItem key={item.path} item={item} />
          )
        )}

        {/* Divider */}
        {!collapsed && <div className="my-2 h-px bg-sidebar-border" />}

        {/* Dashboard (with sub-items) */}
        {collapsed ? (
          <CollapsedCollapsible
            title="Tableau de bord"
            icon={Home}
            children={dashboardItems}
          />
        ) : (
          <ExpandedCollapsible
            title="Tableau de bord"
            icon={Home}
            children={dashboardItems}
            defaultOpen={dashboardOpen}
          />
        )}

        {/* Menu (with sub-items) */}
        {collapsed ? (
          <CollapsedCollapsible
            title="Menu"
            icon={MenuIcon}
            children={menuSubItems}
          />
        ) : (
          <ExpandedCollapsible
            title="Menu"
            icon={MenuIcon}
            children={menuSubItems}
            defaultOpen={menuOpen}
          />
        )}

        {/* Settings (with sub-items) */}
        {collapsed ? (
          <CollapsedCollapsible
            title="Paramètres"
            icon={Settings}
            children={settingsSubItems}
          />
        ) : (
          <ExpandedCollapsible
            title="Paramètres"
            icon={Settings}
            children={settingsSubItems}
            defaultOpen={settingsOpen}
          />
        )}

        {/* Integrations (with sub-items) */}
        {collapsed ? (
          <CollapsedCollapsible
            title="Canaux et Plateformes"
            icon={Link2}
            children={integrationsSubItems}
          />
        ) : (
          <ExpandedCollapsible
            title="Canaux et Plateformes"
            icon={Link2}
            children={integrationsSubItems}
            defaultOpen={integrationsOpen}
          />
        )}
      </nav>
    </aside>
  );
};
