import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { NAV_ITEMS, type NavItem } from '@/config/navConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Mobile Bottom Navigation
 * 
 * Displays primary navigation items marked in navConfig with primaryNav: true
 * Synced with desktop sidebar and mobile sidebar through single source of truth
 */
export const BottomNav = () => {
  const location = useLocation();

  const { menuItem, homeItem, settingsItem } = useMemo(() => {
    const findItem = (id: string): NavItem | undefined => NAV_ITEMS.find((item) => item.id === id);

    return {
      menuItem: findItem('menu'),
      homeItem: findItem('home'),
      settingsItem: findItem('settings'),
    };
  }, []);

  const isParentActive = (item?: NavItem) => {
    if (!item) return false;
    if (item.href && location.pathname === item.href) return true;
    return item.children?.some((child) => location.pathname === child.href) ?? false;
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-soft safe-area-bottom md:hidden">
      <div className="grid grid-cols-3 items-center h-16 px-2">
        {menuItem && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-auto w-full flex flex-col items-center justify-center gap-1 min-h-[48px] px-3 py-2',
                  'text-muted-foreground hover:text-primary hover:bg-transparent',
                  isParentActive(menuItem) && 'text-primary'
                )}
                title={menuItem.title}
              >
                <menuItem.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{menuItem.title}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-64 mb-1">
              {menuItem.children?.map((child) => (
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
        )}

        {homeItem?.href && (
          <NavLink
            to={homeItem.href}
            end
            className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-3 py-2 text-muted-foreground transition-colors touch-target"
            activeClassName="text-primary"
            title={homeItem.title}
          >
            <homeItem.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{homeItem.title}</span>
          </NavLink>
        )}

        {settingsItem && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-auto w-full flex flex-col items-center justify-center gap-1 min-h-[48px] px-3 py-2',
                  'text-muted-foreground hover:text-primary hover:bg-transparent',
                  isParentActive(settingsItem) && 'text-primary'
                )}
                title={settingsItem.title}
              >
                <settingsItem.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{settingsItem.title}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-64 mb-1">
              {settingsItem.children?.map((child) => (
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
        )}
      </div>
    </nav>
  );
};
