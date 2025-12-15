import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Crown, Flame } from "lucide-react";
import { Customer, acquisitionSourceLabels } from "@/services/customersService";

interface CustomerCardProps {
  customer: Customer;
  onClick: () => void;
}

const CustomerCard = ({ customer, onClick }: CustomerCardProps) => {
  const displayName = customer.first_name 
    ? `${customer.first_name} ${customer.last_name}` 
    : customer.customer_name || "Client";
  
  const totalSpentFormatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"
  }).format(customer.customer_total_spent / 100);

  const isVIP = customer.customer_total_spent > 50000; // > 500€
  const sourceLabel = acquisitionSourceLabels[customer.acquisition_source] || customer.acquisition_source;
  const hasHighMatchScore = customer.match_score && customer.match_score >= 80;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate">{displayName}</h3>
              {hasHighMatchScore && (
                <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />
              )}
            </div>
            
            {customer.phone && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <Phone className="h-3.5 w-3.5" />
                <span>{customer.phone}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              {isVIP && (
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                  <Crown className="h-3 w-3 mr-1" />
                  VIP
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {sourceLabel}
              </Badge>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-semibold text-foreground">{totalSpentFormatted}</p>
            <p className="text-xs text-muted-foreground">{customer.customer_total_orders} commandes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
