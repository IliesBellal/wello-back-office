import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { NAV_ITEMS, NavItem } from '@/config/navConfig';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export type NavigationVariant = 'desktop' | 'mobile';

export interface NavMenuContentProps {
  variant: NavigationVariant;
  onClose?: () => void;
  isCollapsed?: boolean;
  collapsibleState?: Record<string, boolean>;
  onToggleCollapsible?: (itemId: string) => void;
  containerClassName?: string;
  itemClassName?: string;
  collapsedItemClassName?: string;
}

const primaryItemClassName = cn(
  'flex items-center gap-3 rounded-lg transition-all duration-200',
  'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
  'group relative',
);

const primaryActiveClassName = cn(
  'bg-sidebar-accent/90 font-medium',
  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
  'before:w-1 before:h-6 before:rounded-r-lg before:bg-sidebar-primary',
);

const secondaryItemClassName = cn(
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
  'transition-all duration-150 text-sidebar-foreground/80',
  'hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
  'group relative',
);

const secondaryActiveClassName = cn(
  'bg-sidebar-accent/70 text-sidebar-foreground font-medium',
  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
  'before:w-0.5 before:h-5 before:rounded-r-full before:bg-sidebar-primary',
);

const hasActiveChild = (item: NavItem, pathname: string): boolean => {
  return item.children?.some((child) => pathname === child.href) ?? false;
};

export const NavMenuContent: React.FC<NavMenuContentProps> = ({
  variant,
  onClose,
  isCollapsed = false,
  collapsibleState = {},
  onToggleCollapsible,
  containerClassName,
  itemClassName,
  collapsedItemClassName,
}) => {
  const location = useLocation();
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>({});

  const handleNavClick = () => {
    onClose?.();
  };

  const toggleMobileSection = (itemId: string) => {
    setMobileOpenSections((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  return (
    <nav className={containerClassName}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const hasChildren = Boolean(item.children && item.children.length > 0);

        if (!hasChildren && item.href) {
          return (
            <NavLink
              key={item.id}
              to={item.href}
              onClick={variant === 'mobile' ? handleNavClick : undefined}
              className={cn(
                primaryItemClassName,
                variant === 'desktop'
                  ? isCollapsed
                    ? cn('justify-center w-11 h-11 p-0', collapsedItemClassName)
                    : 'px-3 py-2.5 w-full'
                  : cn('px-3 py-2.5 w-full min-h-[44px]', itemClassName),
              )}
              activeClassName={primaryActiveClassName}
              title={isCollapsed ? item.title : undefined}
              aria-label={item.title}
            >
              <Icon className="w-5 h-5 shrink-0 flex-none transition-transform duration-200 group-hover:scale-105" />

              {(!isCollapsed || variant === 'mobile') && (
                <span className="text-sm font-medium truncate">{item.title}</span>
              )}

              {item.badge && item.badge > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center py-1 font-bold text-destructive-foreground bg-destructive/80 rounded-full',
                    isCollapsed && variant === 'desktop'
                      ? 'absolute top-0 right-0 w-5 h-5 text-xs'
                      : 'ml-auto px-2 text-xs',
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        }

        if (hasChildren) {
          const isOpen =
            variant === 'desktop'
              ? collapsibleState[item.id] ?? false
              : mobileOpenSections[item.id] ?? false;

          const toggleOpen = () => {
            if (variant === 'desktop') {
              onToggleCollapsible?.(item.id);
              return;
            }
            toggleMobileSection(item.id);
          };

          if (variant === 'desktop' && isCollapsed) {
            return (
              <Popover key={item.id}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'w-11 h-11 rounded-lg transition-all duration-200',
                      'hover:bg-sidebar-accent/80 hover:shadow-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      hasActiveChild(item, location.pathname) && 'bg-sidebar-accent/80',
                    )}
                    title={item.title}
                    aria-label={item.title}
                  >
                    <Icon className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  side="right"
                  align="start"
                  className="w-56 p-3 rounded-lg shadow-lg border border-sidebar-border"
                >
                  <div className="space-y-1">
                    <div className="px-3 py-2 mb-2">
                      <p className="text-xs font-bold text-sidebar-foreground/60 uppercase tracking-wide">
                        {item.title}
                      </p>
                    </div>

                    {item.children?.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <NavLink
                          key={child.id}
                          to={child.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                            'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                          )}
                          activeClassName="bg-sidebar-accent/80 text-sidebar-foreground font-medium"
                        >
                          <ChildIcon className="w-4 h-4 shrink-0 flex-none" />
                          <span className="truncate">{child.title}</span>
                          {child.badge && child.badge > 0 && (
                            <span className="ml-auto inline-flex items-center rounded-full bg-destructive/80 px-2 py-1 text-xs font-medium text-destructive-foreground">
                              {child.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <Collapsible key={item.id} open={isOpen} onOpenChange={toggleOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    primaryItemClassName,
                    'px-3 py-2.5 h-auto w-full justify-between active:bg-sidebar-accent/80',
                    variant === 'mobile' && 'min-h-[44px]',
                    hasActiveChild(item, location.pathname) && primaryActiveClassName,
                    itemClassName,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0 flex-none transition-transform duration-200 group-hover:scale-105" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex items-center justify-center w-4 h-4 shrink-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </Button>
              </CollapsibleTrigger>

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
                      opacity: { duration: 0.2 },
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
                              delay: index * 0.05,
                            }}
                          >
                            <NavLink
                              to={child.href}
                              onClick={variant === 'mobile' ? handleNavClick : undefined}
                              className={secondaryItemClassName}
                              activeClassName={secondaryActiveClassName}
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
        }

        return null;
      })}
    </nav>
  );
};
