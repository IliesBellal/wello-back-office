import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Euro } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface RevenueCardProps {
  current: number;
  currency: string;
  trendPercentage: number;
  trendDirection: 'up' | 'down';
  comparisons: {
    last_year: number;
    last_month: number;
    last_week: number;
  };
  progressTarget: number;
}

export const RevenueCard = ({
  current,
  trendPercentage,
  trendDirection,
  comparisons,
  progressTarget,
}: RevenueCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const progressValue = Math.min((current / progressTarget) * 100, 100);
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className="shadow-card hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Chiffre d'affaires
            </p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold text-foreground">
                {formatCurrency(current)}
              </h2>
              <span
                className={cn(
                  'flex items-center gap-1 text-sm font-semibold',
                  trendDirection === 'up' ? 'text-green-600' : 'text-destructive'
                )}
              >
                <TrendIcon className="h-4 w-4" />
                {trendDirection === 'up' ? '+' : '-'}{trendPercentage}%
              </span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10">
            <Euro className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block text-foreground/60">vs J-7</span>
              <span className="font-medium text-foreground/80">{formatCurrency(comparisons.last_week)}</span>
            </div>
            <div>
              <span className="block text-foreground/60">vs M-1</span>
              <span className="font-medium text-foreground/80">{formatCurrency(comparisons.last_month)}</span>
            </div>
            <div>
              <span className="block text-foreground/60">vs Y-1</span>
              <span className="font-medium text-foreground/80">{formatCurrency(comparisons.last_year)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Objectif du jour</span>
              <span>{formatCurrency(progressTarget)}</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
