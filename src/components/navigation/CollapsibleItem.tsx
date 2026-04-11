import { NavigationItem } from '@/config/navigationConfig';
import { useSidebar } from '@/hooks/useSidebar';
import { SubItemsPopover } from './SubItemsPopover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { AnimatePresence, motion } from 'framer-motion';

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

          {/* Animated Chevron */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-center justify-center w-4 h-4 shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </Button>
      </CollapsibleTrigger>

      {/* Animated Sub-items Container */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`content-${item.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="overflow-hidden"
          >
            <div className={cn(
              'space-y-1 pl-3 border-l border-sidebar-border ml-5 py-1'
            )}>
              {item.subItems.map((subItem, index) => {
                const SubIcon = subItem.icon;

                return (
                  <motion.div
                    key={subItem.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      delay: index * 0.05
                    }}
                  >
                    <NavLink
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  );
};
