import { NavLink } from '@/components/NavLink';
import { getPrimaryNavItems } from '@/config/navConfig';

/**
 * Mobile Bottom Navigation
 * 
 * Displays primary navigation items marked in navConfig with primaryNav: true
 * Synced with desktop sidebar and mobile sidebar through single source of truth
 */
export const BottomNav = () => {
  const primaryItems = getPrimaryNavItems();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-soft safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {primaryItems.map((item) => {
          // For items with children, use the first child's href or skip if no href
          const href = item.href || (item.children?.[0]?.href ?? null);
          
          if (!href) return null;

          return (
            <NavLink
              key={item.id}
              to={href}
              end={item.id === 'home'}
              className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-3 py-2 text-muted-foreground transition-colors touch-target"
              activeClassName="text-primary"
              title={item.title}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
