import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Building2, ChevronDown, Check } from 'lucide-react';
import { MobileSidebar } from './MobileSidebar';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

export const MobileHeader = () => {
  const { authData, setAuthData } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

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
    <header className="h-14 bg-card border-b border-border shadow-soft flex items-center justify-between px-3 safe-area-top md:hidden">
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 safe-area-left">
          <MobileSidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Merchant Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-sm h-auto py-2 px-3 min-h-[44px]"
            disabled={isSwitching}
          >
            <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium truncate max-w-[120px]">{authData.merchantName}</span>
            <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72 bg-popover z-50">
          <DropdownMenuLabel>Établissements</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {authData.merchants.map((merchant, index) => {
            const isActive = merchant.merchant_id === authData.merchantId;
            return (
              <DropdownMenuItem
                key={merchant.merchant_id || `merchant-${index}`}
                onClick={() => !isActive && handleMerchantSwitch(merchant.token, merchant.business_name)}
                className={`flex flex-col items-start gap-0.5 py-3 cursor-pointer min-h-[44px] ${
                  isActive ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className={`font-medium flex-1 ${isActive ? 'text-primary' : ''}`}>
                    {merchant.business_name}
                  </span>
                  {isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
                {merchant.address && (
                  <span className="text-xs text-muted-foreground ml-6 line-clamp-1">
                    {merchant.address}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-11" /> {/* Spacer for balance */}
    </header>
  );
};
