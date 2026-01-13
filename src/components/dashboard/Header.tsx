import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ChevronDown, LogOut, Building2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const Header = () => {
  const { authData, setAuthData, logout } = useAuth();
  const { toast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleMerchantSwitch = async (token: string, businessName: string) => {
    setIsSwitching(true);
    try {
      const response = await authService.loginWithToken(token);

      const status = response.data?.status;

      switch (status) {
        case '0':
        case 'user_not_found':
          toast({
            title: 'Compte introuvable',
            description: 'Email ou mot de passe incorrect',
            variant: 'destructive',
          });
          break;
          
        case '3':
        case 'account_disabled':
          toast({
            title: 'Compte désactivé',
            description: 'Votre compte a été désactivé.',
            variant: 'destructive',
          });
          break;
          
        case 'user_not_allowed':
          toast({
            title: 'Accès refusé',
            description: 'Vous n\'avez pas la permission d\'accéder à cette application.',
            variant: 'destructive',
          });
          break;

        case '1':
        default:
          setAuthData(response.data);
          toast({
            title: 'Établissement changé',
            description: `Vous êtes maintenant connecté à ${businessName}`,
          });
          // Recharger la page avec un petit délai pour que le toast s'affiche
          setTimeout(() => {
            window.location.reload();
          }, 500);
          break;
      }
      
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de changer d\'établissement',
        variant: 'destructive',
      });
    } finally {
      setIsSwitching(false);
    }
  };

  if (!authData) return null;

  return (
    <header className="h-16 bg-card border-b border-border shadow-soft flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Bonjour, {authData.first_name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-10 rounded-xl" disabled={isSwitching}>
              <Building2 className="w-4 h-4" />
              <span className="font-medium">{authData.merchantName}</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-popover">
            <DropdownMenuLabel>Établissements</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {authData.merchants.map((merchant, index) => (
              <DropdownMenuItem
                key={merchant.merchant_id || `merchant-${index}`}
                onClick={() => handleMerchantSwitch(merchant.token, merchant.business_name)}
                className={`flex flex-col items-start gap-0.5 py-3 cursor-pointer ${
                  merchant.merchant_id === authData.merchantId
                    ? 'bg-primary/10'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className={`font-medium ${
                    merchant.merchant_id === authData.merchantId ? 'text-primary' : ''
                  }`}>
                    {merchant.business_name}
                  </span>
                </div>
                {merchant.address && (
                  <span className="text-xs text-muted-foreground ml-6 line-clamp-1">
                    {merchant.address}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowLogoutDialog(true)}
          className="h-10 w-10 rounded-xl"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
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
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={logout}>Se déconnecter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};
