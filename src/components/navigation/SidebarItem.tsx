import { NavLink } from '@/components/NavLink';
import { NavigationItem } from '@/config/navigationConfig';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  item: NavigationItem;
  isCollapsed: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ item, isCollapsed }) => {
  const Icon = item.icon;
  
  if (!item.path || item.subItems) {
    return null; // Handle items with subItems separately
  }

  return (
    <NavLink
      to={item.path}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-all duration-200',
        'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'group relative',
        isCollapsed ? 'justify-center w-11 h-11 p-0' : 'px-3 py-2.5 w-full',
      )}
      activeClassName={cn(
        'bg-sidebar-accent/90 font-medium',
        'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
        'before:w-1 before:h-6 before:rounded-r-lg before:bg-sidebar-primary',
      )}
      title={isCollapsed ? item.label : undefined}
      aria-label={item.label}
    >
      <Icon className={cn(
        'shrink-0 flex-none transition-transform duration-200 group-hover:scale-105',
        isCollapsed ? 'w-5 h-5' : 'w-5 h-5'
      )} />

      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}

      {item.badge && item.badge > 0 && (
        <span className={cn(
          'inline-flex items-center justify-center py-1 font-bold text-destructive-foreground bg-destructive/80 rounded-full',
          isCollapsed ? 'absolute top-0 right-0 w-5 h-5 text-xs' : 'ml-auto px-2 text-xs',
        )}>
          {item.badge}
        </span>
      )}
    </NavLink>
  );
};
