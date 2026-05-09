import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavMenuContent } from '@/components/navigation/NavMenuContent';
import { NavHeader } from '@/components/navigation/NavHeader';
import { NavLogoutButton } from '@/components/navigation/NavLogoutButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MobileSidebarProps {
  onClose: () => void;
}

/**
 * Mobile Sidebar Component
 * 
 * Uses shared NavigationContent for consistent navigation rendering
 * across desktop and mobile.
 */
export const MobileSidebar = ({ onClose }: MobileSidebarProps) => {
  const { authData, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  if (!authData) return null;

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <NavHeader
        title="Wello Resto"
        subtitle={authData.merchantName || 'Wello Resto'}
        className="h-auto min-h-20 py-4"
      />

      <NavMenuContent
        variant="mobile"
        onClose={onClose}
        containerClassName="flex-1 overflow-y-auto p-3 space-y-1"
      />

      <div className="p-3 border-t border-sidebar-border bg-gradient-to-t from-sidebar/50 to-sidebar">
        <NavLogoutButton onClick={() => setShowLogoutDialog(true)} />
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="min-h-[44px]">Se déconnecter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
