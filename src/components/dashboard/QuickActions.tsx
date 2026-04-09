import { Plus, AlertTriangle, CalendarDays, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  onNewProduct: () => void;
  onMarkRupture: () => void;
}

export const QuickActions = ({ onNewProduct, onMarkRupture }: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: AlertTriangle,
      label: 'Marquer une rupture',
      onClick: onMarkRupture,
      variant: 'outline' as const,
      className: 'border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400',
    },
    {
      icon: Plus,
      label: 'Créer un produit',
      onClick: onNewProduct,
      variant: 'default' as const,
      className: '',
    },
    {
      icon: CalendarDays,
      label: 'Planning du jour',
      onClick: () => navigate('/orders?view=planning'),
      variant: 'outline' as const,
      className: '',
    },
    {
      icon: CreditCard,
      label: 'Caisses du jour',
      onClick: () => navigate('/accounting/registers'),
      variant: 'outline' as const,
      className: '',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          onClick={action.onClick}
          className={`gap-2 ${action.className}`}
          size="sm"
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};
