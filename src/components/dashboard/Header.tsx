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
import { ChevronDown, LogOut, Building2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const Header = () => {
  const { authData, setAuthData, logout } = useAuth();
  const { toast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleMerchantSwitch = async (token: string, businessName: string) => {
    setIsSwitching(true);
    try {
      const response = await authService.switchMerchant(token);
      setAuthData(response.data);
      toast({
        title: 'Établissement changé',
        description: `Vous êtes maintenant connecté à ${businessName}`,
      });
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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Établissements</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {authData.merchants.map((merchant) => (
              <DropdownMenuItem
                key={merchant.merchant_id}
                onClick={() => handleMerchantSwitch(merchant.token, merchant.business_name)}
                className={
                  merchant.merchant_id === authData.merchantId
                    ? 'bg-primary/10 font-medium'
                    : ''
                }
              >
                <Building2 className="w-4 h-4 mr-2" />
                {merchant.business_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          onClick={logout}
          className="h-10 w-10 rounded-xl"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};
