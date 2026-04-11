import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { NavigationContent } from './NavigationContent';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

/**
 * Desktop Sidebar Component
 * 
 * Features:
 * - Smooth collapse/expand animation (300ms)
 * - Persistent state in localStorage
 * - Hierarchical navigation with sub-items
 * - Active page highlighting with left border
 * - Popover sub-items when collapsed
 * - Responsive design (hidden on mobile)
 * - Accessibility features (ARIA labels, keyboard nav)
 * - Uses shared NavigationContent component for unified rendering
 */
export const Sidebar: React.FC = () => {
  const { isExpanded, toggleExpanded, openMenuId, toggleSubItem } = useSidebar();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Get collapsible state from the useSidebar hook
  const collapsibleState = useMemo(() => {
    return {
      [openMenuId || '']: openMenuId !== null,
    };
  }, [openMenuId]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        // Layout & Size
        'h-screen overflow-hidden flex flex-col',
        'bg-sidebar border-r border-sidebar-border',
        'transition-all duration-300 ease-in-out',
        // Animation & width
        isExpanded ? 'w-64' : 'w-16',
        // Shadow
        'shadow-soft flex-shrink-0'
      )}
      aria-label="Navigation principale"
    >
      {/* ═══ HEADER ═══ */}
      <div
        className={cn(
          'flex items-center justify-between h-20 px-4 border-b border-sidebar-border',
          'shrink-0 bg-gradient-to-r from-sidebar/50 to-sidebar',
          'transition-all duration-300'
        )}
      >
        {/* Logo */}
        {isExpanded && (
          <div className="animate-in fade-in duration-300">
            <button
              onClick={() => navigate('/')}
              className={cn(
                'text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500',
                'bg-clip-text text-transparent hover:opacity-80 transition-opacity',
                'truncate'
              )}
              title="Aller au tableau de bord"
            >
              Wello Resto
            </button>
          </div>
        )}

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleExpanded}
          className={cn(
            'h-8 w-8 shrink-0',
            'hover:bg-sidebar-accent/50 transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
          )}
          title={isExpanded ? 'Réduire le menu' : 'Agrandir le menu'}
          aria-label={isExpanded ? 'Réduire le menu' : 'Agrandir le menu'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <NavigationContent
        variant="desktop"
        isCollapsed={!isExpanded}
        collapsibleState={collapsibleState}
        onToggleCollapsible={toggleSubItem}
        containerClassName={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          'py-4 space-y-1',
          'transition-all duration-300',
          isExpanded ? 'px-3' : 'px-2 flex flex-col items-center'
        )}
      />

      {/* ═══ FOOTER - USER MENU ═══ */}
      <div
        className={cn(
          'border-t border-sidebar-border p-3 shrink-0',
          'bg-gradient-to-t from-sidebar/50 to-sidebar',
          'transition-all duration-300'
        )}
      >
        <Button
          variant="ghost"
          className={cn(
            'w-full text-sm font-medium transition-all duration-200',
            'text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            'group relative',
            isExpanded ? 'justify-start gap-3 px-3 py-2.5' : 'justify-center w-11 h-11 p-0'
          )}
          onClick={handleLogout}
          title={isExpanded ? 'Déconnexion' : 'Déconnexion'}
          aria-label="Se déconnecter"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isExpanded && (
            <span className="truncate animate-in fade-in duration-300">Déconnexion</span>
          )}
        </Button>
      </div>
    </aside>
  );
};
