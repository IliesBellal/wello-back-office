import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Home, ShoppingBag, Menu as MenuIcon, Users, Settings, 
  Store, User, ChevronDown, FileText, Package, LayoutGrid, 
  Users2, Calculator, Warehouse, LogOut, Building2 
} from 'lucide-react';
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

const menuItems = [
  { title: 'Dashboard', icon: Home, path: '/', end: true },
  { title: 'Commandes', icon: ShoppingBag, path: '/orders', end: false },
  { title: 'Menu', icon: MenuIcon, path: '/menu', end: true },
  { title: 'Composants', icon: Package, path: '/menu/components', end: false },
  { title: 'Plan de Salle', icon: LayoutGrid, path: '/locations' },
  { title: 'Utilisateurs', icon: Users2, path: '/users' },
  { title: 'Registres de Caisse', icon: Calculator, path: '/cash-registers' },
  { title: 'Clients', icon: Users, path: '/customers' },
  { title: 'Stocks', icon: Warehouse, path: '/stocks' },
  { title: 'Rapports', icon: FileText, path: '/reports/financial' },
];

const settingsSubItems = [
  { title: 'Établissement', icon: Store, path: '/settings/establishment' },
  { title: 'Mon Profil', icon: User, path: '/settings/profile' },
];

interface MobileSidebarProps {
  onClose: () => void;
}

export const MobileSidebar = ({ onClose }: MobileSidebarProps) => {
  const { authData, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  if (!authData) return null;

  const handleNavClick = () => {
    onClose();
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
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={handleNavClick}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]"
            activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}

        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <span>Paramètres</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {settingsSubItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className="flex items-center gap-3 px-4 py-3 ml-4 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-h-[44px]"
                activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
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
