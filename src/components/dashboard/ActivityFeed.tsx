import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, FileText, AlertTriangle, ShoppingBag, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityEvent } from '@/services/dashboardService';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed = ({ events }: ActivityFeedProps) => {
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'ORDER_PAYMENT':
        return CreditCard;
      case 'Z_REPORT':
        return FileText;
      case 'STOCK_ALERT':
        return AlertTriangle;
      case 'ORDER_CREATED':
        return ShoppingBag;
      case 'DELIVERY':
        return Truck;
      default:
        return FileText;
    }
  };

  const getEventColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'ORDER_PAYMENT':
        return 'bg-green-100 text-green-600';
      case 'Z_REPORT':
        return 'bg-blue-100 text-blue-600';
      case 'STOCK_ALERT':
        return 'bg-red-100 text-red-600';
      case 'ORDER_CREATED':
        return 'bg-primary/10 text-primary';
      case 'DELIVERY':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="shadow-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Activité Récente
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {events.map((event) => {
            const Icon = getEventIcon(event.type);
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={cn('p-2 rounded-lg shrink-0', getEventColor(event.type))}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {event.message}
                  </p>
                  {event.value && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.value}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {event.time}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
