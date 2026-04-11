import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { navigationConfig } from '@/config/navigationConfig';

const SIDEBAR_EXPANDED_KEY = 'wello-sidebar-expanded';
const SIDEBAR_OPEN_MENU_KEY = 'wello-sidebar-open-menu';

export interface UseSidebarState {
  isExpanded: boolean;
  openMenuId: string | null;  // ✨ NEW: Only ONE menu open at a time (accordion pattern)
}

export interface UseSidebarActions {
  toggleExpanded: () => void;
  toggleSubItem: (itemId: string) => void;
  expandSubItem: (itemId: string) => void;
  collapseSubItem: (itemId: string) => void;
  isSubItemOpen: (itemId: string) => boolean;
  closeAllMenus: () => void;
}

/**
 * ✨ Auto-detect which parent menu should be open based on current URL
 * Scans navigationConfig and finds the parent menu containing the current path
 */
const detectActiveMenuFromPath = (pathname: string): string | null => {
  for (const item of navigationConfig) {
    if (item.subItems) {
      const matchingSubItem = item.subItems.find(sub => sub.path === pathname);
      if (matchingSubItem) {
        return item.id;  // Return parent menu ID
      }
    }
  }
  return null;
};

export const useSidebar = (): UseSidebarState & UseSidebarActions => {
  const location = useLocation();  // ✨ NEW: Track current URL for auto-detection

  // Initialize expanded state from localStorage with SSR safety
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  // ✨ NEW: Initialize with only ONE menu open (or null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(SIDEBAR_OPEN_MENU_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // ✨ NEW: Auto-detect and open the menu for the current page
  useEffect(() => {
    const activeMenuId = detectActiveMenuFromPath(location.pathname);
    if (activeMenuId) {
      setOpenMenuId(activeMenuId);
    }
  }, [location.pathname]);

  // Persist expanded state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, JSON.stringify(isExpanded));
    } catch (e) {
      console.warn('Failed to save sidebar expanded state:', e);
    }
  }, [isExpanded]);

  // ✨ NEW: Persist open menu (only one ID instead of Set)
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_OPEN_MENU_KEY, JSON.stringify(openMenuId));
    } catch (e) {
      console.warn('Failed to save sidebar open menu:', e);
    }
  }, [openMenuId]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  /**
   * ✨ NEW: Toggle a submenu with accordion pattern
   * If already open → close it
   * If closed → open it (and close others automatically)
   */
  const toggleSubItem = useCallback((itemId: string) => {
    setOpenMenuId(prev => (prev === itemId ? null : itemId));
  }, []);

  /**
   * ✨ NEW: Explicitly open a submenu (closes others automatically)
   */
  const expandSubItem = useCallback((itemId: string) => {
    setOpenMenuId(itemId);
  }, []);

  /**
   * ✨ NEW: Close a specific menu
   */
  const collapseSubItem = useCallback((itemId: string) => {
    setOpenMenuId(prev => (prev === itemId ? null : prev));
  }, []);

  /**
   * ✨ NEW: Check if a specific menu is open
   */
  const isSubItemOpen = useCallback((itemId: string) => {
    return openMenuId === itemId;
  }, [openMenuId]);

  /**
   * ✨ NEW: Close all menus
   */
  const closeAllMenus = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  return {
    isExpanded,
    openMenuId,  // ✨ NEW: Return openMenuId instead of openItems
    toggleExpanded,
    toggleSubItem,
    expandSubItem,
    collapseSubItem,
    isSubItemOpen,
    closeAllMenus,  // ✨ NEW: Export new action
  };
};
