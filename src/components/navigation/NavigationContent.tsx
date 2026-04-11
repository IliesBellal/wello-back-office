import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { NAV_ITEMS, NavItem } from '@/config/navConfig';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export type NavigationVariant = 'desktop' | 'mobile';

interface NavigationContentProps {
  /** Display variant: 'desktop' or 'mobile' */
  variant: NavigationVariant;
  
  /** Callback when navigation item is clicked (useful for mobile to close menu) */
  onItemClick?: () => void;
  
  /** Desktop-only: Whether sidebar is collapsed */
  isCollapsed?: boolean;
  
  /** Desktop-only: State of collapsible sections */
  collapsibleState?: Record<string, boolean>;
  
  /** Desktop-only: Toggle collapsible section */
  onToggleCollapsible?: (itemId: string) => void;
  
  /** CSS classes for the main nav container */
  containerClassName?: string;
  
  /** CSS classes for individual items */
  itemClassName?: string;
  
  /** CSS classes for collapsed items */
  collapsedItemClassName?: string;
}

/**
 * Unified Navigation Content Component
 * 
 * Centralized logic for rendering navigation items in both desktop and mobile sidebars.
 * Handles:
 * - Simple items (with href)
 * - Collapsible items (with children)
 * - Active state detection
 * - Animations with Framer Motion
 * - Desktop collapse/expand state
 * - Mobile local state for accordions
 * 
 * Desktop variant:
 * - Supports collapsed mode with popover tooltips
 * - Uses external collapsibleState prop
 * - Applies desktop-specific styling
 * 
 * Mobile variant:
 * - Uses local state for collapsibles
 * - Larger touch targets (44px)
 * - Closer to native mobile navigation
 */
export const NavigationContent: React.FC<NavigationContentProps> = ({
  variant,
  onItemClick,
  isCollapsed = false,
  collapsibleState = {},
  onToggleCollapsible,
  containerClassName,
  itemClassName,
  collapsedItemClassName,
}) => {
  const location = useLocation();
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>({});

  // Determine if a sub-item is active
  const isSubItemActive = (href: string): boolean => {
    return location.pathname === href;
  };

  // Determine if any sub-item is active
  const hasActiveChild = (item: NavItem): boolean => {
    return item.children?.some(child => isSubItemActive(child.href)) ?? false;
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

  return (
    <nav className={containerClassName}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;

        // ═══ SIMPLE ITEM (no children) ═══
        if (!hasChildren && item.href) {
          if (variant === 'desktop') {
            return (
              <NavLink
                key={item.id}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg transition-all duration-200',
                  'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  'group relative',
                  isCollapsed 
                    ? cn('justify-center w-11 h-11 p-0', collapsedItemClassName)
                    : 'px-3 py-2.5 w-full'
                )}
                activeClassName={cn(
                  'bg-sidebar-accent/90 font-medium',
                  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                  'before:w-1 before:h-6 before:rounded-r-lg before:bg-sidebar-primary'
                )}
                title={isCollapsed ? item.title : undefined}
                aria-label={item.title}
              >
                <Icon className="w-5 h-5 shrink-0 flex-none transition-transform duration-200 group-hover:scale-105" />

                {!isCollapsed && (
                  <span className="text-sm font-medium truncate">{item.title}</span>
                )}

                {item.badge && item.badge > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center py-1 font-bold text-destructive-foreground bg-destructive/80 rounded-full',
                      isCollapsed ? 'absolute top-0 right-0 w-5 h-5 text-xs' : 'ml-auto px-2 text-xs'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          } else {
            // Mobile simple item
            return (
              <NavLink
                key={item.id}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground',
                  'hover:bg-sidebar-accent transition-colors min-h-[44px]',
                  itemClassName
                )}
                activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            );
          }
        }

        // ═══ COLLAPSIBLE ITEM (with children) ═══
        if (hasChildren) {
          const isOpen = variant === 'desktop'
            ? collapsibleState[item.id] ?? false
            : mobileOpenSections[item.id] ?? false;

          const toggleOpen = () => {
            if (variant === 'desktop') {
              onToggleCollapsible?.(item.id);
            } else {
              toggleMobileSection(item.id);
            }
          };

          if (variant === 'desktop' && isCollapsed) {
            // Desktop collapsed - don't show collapsibles
            return null;
          }

          if (variant === 'desktop') {
            // Desktop expanded - Collapsible with Framer Motion
            return (
              <Collapsible key={item.id} open={isOpen} onOpenChange={toggleOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg h-auto',
                      'transition-all duration-200 w-full justify-between',
                      'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      'group relative active:bg-sidebar-accent/80',
                      hasActiveChild(item) && [
                        'bg-sidebar-accent/80 font-medium',
                        'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                        'before:w-1 before:h-6 before:rounded-r-lg before:bg-sidebar-primary'
                      ]
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0 flex-none transition-transform duration-200 group-hover:scale-105" />
                      <span className="text-sm font-medium">{item.title}</span>
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

                {/* Animated Children - Desktop */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
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
                      <div className="space-y-1 pl-3 border-l border-sidebar-border ml-5 py-1">
                        {item.children?.map((child, index) => {
                          const ChildIcon = child.icon;
                          return (
                            <motion.div
                              key={child.id}
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
                                to={child.href}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                                  'transition-all duration-150 text-sidebar-foreground/80',
                                  'hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                                  'group relative'
                                )}
                                activeClassName={cn(
                                  'bg-sidebar-accent/70 text-sidebar-foreground font-medium',
                                  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                                  'before:w-0.5 before:h-5 before:rounded-r-full before:bg-sidebar-primary'
                                )}
                              >
                                <ChildIcon className="w-4 h-4 shrink-0 flex-none" />
                                <span className="truncate">{child.title}</span>

                                {child.badge && child.badge > 0 && (
                                  <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-destructive-foreground bg-destructive/80 rounded-full">
                                    {child.badge}
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
          } else {
            // Mobile - Collapsible with Framer Motion
            return (
              <Collapsible key={item.id} open={isOpen} onOpenChange={toggleOpen}>
                <CollapsibleTrigger className={cn(
                  'flex items-center justify-between w-full gap-3',
                  'px-4 py-3 rounded-xl text-sidebar-foreground',
                  'hover:bg-sidebar-accent transition-colors min-h-[44px]',
                  itemClassName
                )}>
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </div>
                  
                  {/* Animated Chevron */}
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex items-center justify-center w-4 h-4 shrink-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </CollapsibleTrigger>

                {/* Animated Children - Mobile */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
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
                        {item.children?.map((child, index) => {
                          const ChildIcon = child.icon;
                          return (
                            <motion.div
                              key={child.id}
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
                                to={child.href}
                                onClick={handleNavClick}
                                className={cn(
                                  'flex items-center gap-3 px-4 py-3 ml-4 rounded-xl text-sm',
                                  'text-sidebar-foreground hover:bg-sidebar-accent',
                                  'transition-colors min-h-[44px]'
                                )}
                                activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
                              >
                                <ChildIcon className="w-4 h-4" />
                                <span>{child.title}</span>
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
        }

        return null;
      })}
    </nav>
  );
};
