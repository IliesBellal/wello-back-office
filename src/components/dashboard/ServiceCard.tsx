import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  avgTimeMinutes: number;
  status: 'excellent' | 'warning' | 'critical';
  ordersPerHour: number;
}

export const ServiceCard = ({
  avgTimeMinutes,
  status,
  ordersPerHour,
}: ServiceCardProps) => {
  const statusConfig = {
    excellent: {
      label: 'Excellent',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    warning: {
      label: 'Attention',
      icon: AlertTriangle,
      className: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    critical: {
      label: 'Critique',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-red-200',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="shadow-card hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Performance Service
            </p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold text-foreground">
                {avgTimeMinutes} <span className="text-xl font-normal text-muted-foreground">min</span>
              </h2>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <Badge
            variant="outline"
            className={cn('gap-1.5 px-3 py-1', config.className)}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {config.label}
          </Badge>

          <div className="text-sm text-muted-foreground">
            <span className="text-lg font-semibold text-foreground">{ordersPerHour}</span>
            {' '}Commandes / heure
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
