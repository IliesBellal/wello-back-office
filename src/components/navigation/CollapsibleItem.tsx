import { NavigationItem } from '@/config/navigationConfig';
import { useSidebar } from '@/hooks/useSidebar';
import { SubItemsPopover } from './SubItemsPopover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';

interface CollapsibleItemProps {
  item: NavigationItem;
  isCollapsed: boolean;
}

export const CollapsibleItem: React.FC<CollapsibleItemProps> = ({ item, isCollapsed }) => {
  const { toggleSubItem, isSubItemOpen } = useSidebar();
  const isOpen = isSubItemOpen(item.id);
  const Icon = item.icon;
  const location = useLocation();
  
  if (!item.subItems || item.subItems.length === 0) {
    return null;
  }

  // Check if any sub-item is active
  const hasActiveSubItem = item.subItems.some(sub => location.pathname === sub.path);

  // When collapsed, show popover
  if (isCollapsed) {
    return (
      <SubItemsPopover
        itemId={item.id}
        label={item.label}
        icon={Icon}
        subItems={item.subItems}
      />
    );
  }

  // When expanded, show collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleSubItem(item.id)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg h-auto transition-all duration-200 w-full justify-between',
            'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            'group relative active:bg-sidebar-accent/80',
            hasActiveSubItem && [
              'bg-sidebar-accent/80 font-medium',
              'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
              'before:w-1 before:h-6 before:rounded-r-lg before:bg-sidebar-primary',
            ]
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className={cn(
              'w-5 h-5 shrink-0 flex-none transition-transform duration-200 group-hover:scale-105'
            )} />
            <span className="text-sm font-medium">{item.label}</span>
          </div>

          <ChevronDown
            className={cn(
              'w-4 h-4 shrink-0 transition-transform duration-300',
              isOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className={cn(
        'space-y-1 pl-3 mt-1 border-l border-sidebar-border ml-5',
        'data-state-open:animate-in data-state-closed:animate-out',
        'data-state-open:fade-in data-state-closed:fade-out',
      )}>
        {item.subItems.map((subItem) => {
          const SubIcon = subItem.icon;

          return (
            <NavLink
              key={subItem.id}
              to={subItem.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                'group relative',
              )}
              activeClassName={cn(
                'bg-sidebar-accent/70 text-sidebar-foreground font-medium',
                'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                'before:w-0.5 before:h-5 before:rounded-r-full before:bg-sidebar-primary',
              )}
            >
              <SubIcon className="w-4 h-4 shrink-0 flex-none" />
              <span className="truncate">{subItem.label}</span>

              {subItem.badge && subItem.badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-destructive-foreground bg-destructive/80 rounded-full">
                  {subItem.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
};
