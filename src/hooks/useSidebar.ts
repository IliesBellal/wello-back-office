import { useState, useCallback, useEffect } from 'react';

const SIDEBAR_EXPANDED_KEY = 'wello-sidebar-expanded';
const SIDEBAR_OPEN_ITEMS_KEY = 'wello-sidebar-open-items';

export interface UseSidebarState {
  isExpanded: boolean;
  openItems: Set<string>;
}

export interface UseSidebarActions {
  toggleExpanded: () => void;
  toggleSubItem: (itemId: string) => void;
  expandSubItem: (itemId: string) => void;
  collapseSubItem: (itemId: string) => void;
  isSubItemOpen: (itemId: string) => boolean;
}

export const useSidebar = (): UseSidebarState & UseSidebarActions => {
  // Initialize from localStorage with SSR safety
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const [openItems, setOpenItems] = useState(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const stored = localStorage.getItem(SIDEBAR_OPEN_ITEMS_KEY);
      const parsed = stored ? JSON.parse(stored) : ['dashboard', 'menu'];
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>(['dashboard', 'menu']);
    }
  });

  // Persist expanded state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, JSON.stringify(isExpanded));
    } catch (e) {
      console.warn('Failed to save sidebar expanded state:', e);
    }
  }, [isExpanded]);

  // Persist open items
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_OPEN_ITEMS_KEY, JSON.stringify(Array.from(openItems)));
    } catch (e) {
      console.warn('Failed to save sidebar open items:', e);
    }
  }, [openItems]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const toggleSubItem = useCallback((itemId: string) => {
    setOpenItems(prev => {
      const newSet = new Set<string>(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const expandSubItem = useCallback((itemId: string) => {
    setOpenItems(prev => {
      const newSet = new Set<string>(prev);
      newSet.add(itemId);
      return newSet;
    });
  }, []);

  const collapseSubItem = useCallback((itemId: string) => {
    setOpenItems(prev => {
      const newSet = new Set<string>(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const isSubItemOpen = useCallback((itemId: string) => {
    return openItems.has(itemId);
  }, [openItems]);

  return {
    isExpanded,
    openItems,
    toggleExpanded,
    toggleSubItem,
    expandSubItem,
    collapseSubItem,
    isSubItemOpen,
  };
};
