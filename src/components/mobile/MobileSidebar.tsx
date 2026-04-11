import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LogOut, Building2 } from 'lucide-react';
import { NavigationContent } from '@/components/navigation/NavigationContent';
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
      <SheetHeader className="p-4 border-b border-sidebar-border">
        <SheetTitle className="text-left">
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Wello Resto
          </span>
        </SheetTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Building2 className="w-4 h-4" />
          <span className="truncate">{authData.merchantName}</span>
        </div>
      </SheetHeader>

      <NavigationContent
        variant="mobile"
        onItemClick={onClose}
        containerClassName="flex-1 overflow-y-auto p-3 space-y-1"
      />

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </Button>
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
