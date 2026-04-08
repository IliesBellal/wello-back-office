import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LogOut, ChevronDown, Building2 } from 'lucide-react';
import { navigationConfig } from '@/config/navigationConfig';
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

export const MobileSidebar = ({ onClose }: MobileSidebarProps) => {
  const { authData, logout } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  if (!authData) return null;

  const handleNavClick = () => {
    onClose();
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

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

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navigationConfig.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openSections[item.id];

          if (!hasSubItems && item.path) {
            // Simple item without sub-items
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
              <Collapsible key={item.id} open={isOpen} onOpenChange={() => toggleSection(item.id)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {item.subItems?.map((subItem) => (
                    <NavLink
                      key={subItem.id}
                      to={subItem.path}
                      onClick={handleNavClick}
                      className="flex items-center gap-3 px-4 py-3 ml-4 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]"
                      activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
                    >
                      <subItem.icon className="w-4 h-4" />
                      <span>{subItem.label}</span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return null;
        })}
      </nav>

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
