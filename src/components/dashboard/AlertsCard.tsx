import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Package, XCircle, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertsCardProps {
  lowStockCount: number;
  voidedOrders: number;
  pendingDeliveries: number;
}

export const AlertsCard = ({
  lowStockCount,
  voidedOrders,
  pendingDeliveries,
}: AlertsCardProps) => {
  const alerts = [
    {
      icon: Package,
      label: 'Stocks critiques',
      count: lowStockCount,
      severity: 'critical' as const,
    },
    {
      icon: XCircle,
      label: 'Commandes annulées',
      count: voidedOrders,
      severity: 'warning' as const,
    },
    {
      icon: Truck,
      label: 'Livraisons en attente',
      count: pendingDeliveries,
      severity: 'info' as const,
    },
  ];

  const severityColors = {
    critical: 'bg-red-500',
    warning: 'bg-orange-500',
    info: 'bg-blue-500',
  };

  const totalAlerts = lowStockCount + voidedOrders + pendingDeliveries;

  return (
    <Card className="shadow-card hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Santé & Alertes
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold text-foreground">
                {totalAlerts}
              </h2>
              <span className="text-lg text-muted-foreground">alertes</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <div
              key={alert.label}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  severityColors[alert.severity]
                )}
              />
              <alert.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground flex-1">{alert.label}</span>
              <span className="font-semibold text-foreground">{alert.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
