import { Plus, FileText, CreditCard, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  onNewProduct: () => void;
}

export const QuickActions = ({ onNewProduct }: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: 'Nouveau Produit',
      onClick: onNewProduct,
      variant: 'default' as const,
    },
    {
      icon: FileText,
      label: 'Compta M-1',
      onClick: () => navigate('/reports/financial?period=last_month'),
      variant: 'outline' as const,
    },
    {
      icon: CreditCard,
      label: 'Fermer une caisse',
      onClick: () => navigate('/cash-registers'),
      variant: 'outline' as const,
    },
    {
      icon: ShoppingBag,
      label: 'Nouvelle Commande',
      onClick: () => navigate('/orders'),
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          onClick={action.onClick}
          className="gap-2"
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};
