import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { NavMenuContent } from './NavMenuContent';
import { NavHeader } from './NavHeader';
import { NavLogoutButton } from './NavLogoutButton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Get collapsible state from the useSidebar hook
  const collapsibleState = useMemo(() => {
    return {
      [openMenuId || '']: openMenuId !== null,
    };
  }, [openMenuId]);

  const handleLogoutConfirm = async () => {
    setShowLogoutDialog(false);
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
      <NavHeader
        title="Wello Resto"
        isCollapsed={!isExpanded}
        onTitleClick={() => navigate('/')}
        className="transition-all duration-300"
        action={(
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
        )}
      />

      {/* ═══ NAVIGATION ═══ */}
      <NavMenuContent
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
        <NavLogoutButton
          isCollapsed={!isExpanded}
          onClick={() => setShowLogoutDialog(true)}
          className={!isExpanded ? undefined : 'animate-in fade-in duration-300'}
        />
      </div>

      {/* ═══ LOGOUT CONFIRMATION DIALOG ═══ */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm}>Déconnexion</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
};
