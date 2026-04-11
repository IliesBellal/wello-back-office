import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { NavigationItem, NavigationSubItem } from '@/config/navigationConfig';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export type NavigationVariant = 'desktop' | 'mobile';

interface NavigationItemsProps {
  /** Configuration items to render */
  items: NavigationItem[];
  /** Display variant (affects styling and behavior) */
  variant: NavigationVariant;
  /** Callback when navigation item is clicked (useful for mobile to close menu) */
  onItemClick?: () => void;
  /** Desktop-only: Whether sidebar is collapsed */
  isCollapsed?: boolean;
  /** Desktop-only: State of collapsible sections */
  collapsibleState?: Record<string, boolean>;
  /** Desktop-only: Toggle collapsible section */
  onToggleCollapsible?: (itemId: string) => void;
}

/**
 * Unified Navigation Items Component
 * 
 * Renders navigation items for both desktop (sidebar) and mobile (drawer).
 * Handles:
 * - Simple items (with path)
 * - Collapsible items (with subItems)
 * - Active state detection
 * - Badge display
 * - Icon rendering
 * 
 * For Desktop (variant="desktop"):
 * - Shows collapsed state with popover
 * - Uses collapsibleState prop
 * - Applies desktop-specific styling
 * 
 * For Mobile (variant="mobile"):
 * - Uses local state for collapsibles
 * - All items shown at full width
 * - Larger touch targets (44px minimum)
 */
export const NavigationItems: React.FC<NavigationItemsProps> = ({
  items,
  variant,
  onItemClick,
  isCollapsed = false,
  collapsibleState = {},
  onToggleCollapsible,
}) => {
  const location = useLocation();
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>({});

  // Determine if a sub-item is active
  const isSubItemActive = (subItem: NavigationSubItem) => {
    return location.pathname === subItem.path;
  };

  // Determine if any sub-item in a section is active
  const hasActiveSubItem = (item: NavigationItem) => {
    return item.subItems?.some(sub => isSubItemActive(sub)) ?? false;
  };

  const handleNavClick = () => {
    if (onItemClick) onItemClick();
  };

  const toggleMobileSection = (itemId: string) => {
    setMobileOpenSections(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  if (variant === 'desktop') {
    return (
      <>
        {items.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;

          // Simple item without subItems
          if (!hasSubItems && item.path) {
            return (
              <NavLink
                key={item.id}
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
          }

          // Collapsible item with subItems (expanded view)
          if (hasSubItems && !isCollapsed) {
            const isOpen = collapsibleState[item.id] ?? false;

            return (
              <Collapsible key={item.id} open={isOpen} onOpenChange={() => onToggleCollapsible?.(item.id)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg h-auto transition-all duration-200 w-full justify-between',
                      'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      'group relative active:bg-sidebar-accent/80',
                      hasActiveSubItem(item) && [
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

                    {/* Animated Chevron - Desktop */}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="flex items-center justify-center w-4 h-4 shrink-0"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </Button>
                </CollapsibleTrigger>

                {/* Animated Sub-items Container - Desktop */}
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
                        {item.subItems?.map((subItem, index) => {
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
          }

          return null;
        })}
      </>
    );
  }

  // Mobile variant
  return (
    <>
      {items.map((item) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isOpen = mobileOpenSections[item.id];

        // Simple item without sub-items
        if (!hasSubItems && item.path) {
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={handleNavClick}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]"
              activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        }

        // Collapsible item with sub-items
        if (hasSubItems) {
          return (
            <Collapsible key={item.id} open={isOpen} onOpenChange={() => toggleMobileSection(item.id)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {/* Animated Chevron - Mobile */}
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="flex items-center justify-center w-4 h-4 shrink-0"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </CollapsibleTrigger>

              {/* Animated Sub-items Container - Mobile */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={`mobile-content-${item.id}`}
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
                    <div className="space-y-1 mt-1">
                      {item.subItems?.map((subItem, index) => (
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
                            onClick={handleNavClick}
                            className="flex items-center gap-3 px-4 py-3 ml-4 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]"
                            activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
                          >
                            <subItem.icon className="w-4 h-4" />
                            <span>{subItem.label}</span>
                          </NavLink>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible>
          );
        }

        return null;
      })}
    </>
  );
};
