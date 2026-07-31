import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { getPrimaryNavItems, type NavItem } from '@/config/navConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Display order for the bottom nav, independent from the sidebar order in navConfig.
const BOTTOM_NAV_ORDER = ['menu', 'home', 'accounting', 'equipe', 'haccp'];

const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

/**
 * Mobile Bottom Navigation
 *
 * Displays primary navigation items marked in navConfig with primaryNav: true
 * Synced with desktop sidebar and mobile sidebar through single source of truth
 */
export const BottomNav = () => {
  const location = useLocation();
  const { authData } = useAuth();
  const primaryNavItems = useMemo(() => getPrimaryNavItems(authData), [authData]);

  const items = useMemo(() => {
    return BOTTOM_NAV_ORDER
      .map((id) => primaryNavItems.find((item) => item.id === id))
      .filter((item): item is NavItem => Boolean(item));
  }, [primaryNavItems]);

  const isParentActive = (item: NavItem) => {
    if (item.href && location.pathname === item.href) return true;
    return item.children?.some((child) => location.pathname === child.href) ?? false;
  };

  const gridColsClass = GRID_COLS_CLASS[items.length] ?? 'grid-cols-3';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-soft safe-area-bottom md:hidden">
      <div className={cn('grid items-center h-16 px-2', gridColsClass)}>
        {items.map((item, index) => {
          const align = index === 0 ? 'start' : index === items.length - 1 ? 'end' : 'center';

          if (!item.children) {
            return (
              <NavLink
                key={item.id}
                to={item.href!}
                end
                className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-3 py-2 text-muted-foreground transition-colors touch-target"
                activeClassName="text-primary"
                title={item.title}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </NavLink>
            );
          }

          return (
            <DropdownMenu key={item.id}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-auto w-full flex flex-col items-center justify-center gap-1 min-h-[48px] px-3 py-2',
                    'text-muted-foreground hover:text-primary hover:bg-transparent',
                    isParentActive(item) && 'text-primary'
                  )}
                  title={item.title}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.title}</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align={align} sideOffset={8} className="w-64 mb-1">
                {item.children?.map((child) => (
                  <DropdownMenuItem key={child.id} asChild>
                    <NavLink
                      to={child.href}
                      className="flex w-full items-center gap-2"
                      activeClassName="text-primary"
                    >
                      <child.icon className="w-4 h-4" />
                      <span>{child.title}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
    </nav>
  );
};
