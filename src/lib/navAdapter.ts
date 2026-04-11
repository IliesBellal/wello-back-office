/**
 * Navigation Adapter
 * Converts NAV_ITEMS (simplified format) to NavigationConfig format
 * This ensures compatibility with existing NavigationItems component
 */

import { NavItem, NavChild } from '@/config/navConfig';
import { NavigationItem, NavigationSubItem } from '@/config/navigationConfig';

/**
 * Convert NavChild to NavigationSubItem
 */
function adaptNavChild(child: NavChild): NavigationSubItem {
  return {
    id: child.id,
    label: child.title,
    icon: child.icon,
    path: child.href,
    badge: child.badge,
  };
}

/**
 * Convert NavItem to NavigationItem
 */
function adaptNavItem(item: NavItem): NavigationItem {
  return {
    id: item.id,
    label: item.title,
    icon: item.icon,
    path: item.href ?? null,
    badge: item.badge,
    subItems: item.children ? item.children.map(adaptNavChild) : undefined,
  };
}

/**
 * Convert entire NAV_ITEMS array to NavigationItem format
 */
export function adaptNavConfig(items: NavItem[]): NavigationItem[] {
  return items.map(adaptNavItem);
}
