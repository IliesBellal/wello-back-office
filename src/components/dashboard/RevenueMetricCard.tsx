import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Euro, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonItem {
  label: string;
  value: number;
  currency: string;
}

interface RevenueMetricCardProps {
  title: string;
  value: number;
  currency: string;
  target: number;
  comparisons: ComparisonItem[];
  trend?: {
    text: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

const formatCurrency = (cents: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const calculateProgress = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};

export const RevenueMetricCard = ({
  title,
  value,
  currency,
  target,
  comparisons,
  trend,
}: RevenueMetricCardProps) => {
  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
        ? TrendingDown
        : null;

  const progress = calculateProgress(value, target);
  const isOnTrack = value >= target;

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-2">
        {/* Header: Titre avec icône et Comparaisons */}
        <div className="flex items-start justify-between gap-3">
          {/* Titre avec icône */}
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
              <Euro className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
          </div>

          {/* Comparaisons à droite */}
          <div className="space-y-0.5 text-right">
            {comparisons.map((comp, idx) => (
              <div key={idx} className="text-xs">
                <div className="text-muted-foreground text-[10px] leading-none">{comp.label}</div>
                <div className="font-semibold text-foreground text-[11px] leading-tight">
                  {formatCurrency(comp.value, comp.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Valeur principale */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground leading-none">
            {formatCurrency(value, currency)}
          </span>
          {trend && (
            <span
              className={cn(
                'text-xs font-semibold flex items-center gap-0.5',
                trend.direction === 'up' && 'text-green-600 dark:text-green-500',
                trend.direction === 'down' && 'text-red-600 dark:text-red-500',
                trend.direction === 'neutral' && 'text-gray-500 dark:text-gray-400'
              )}
            >
              {TrendIcon && <TrendIcon className="h-3.5 w-3.5" />}
              {trend.text}
            </span>
          )}
        </div>

        {/* Barre de progression vers l'objectif */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>{formatCurrency(target, currency)}</span>
            </div>
            <span
              className={cn(
                'text-[10px] font-bold',
                isOnTrack
                  ? 'text-green-600 dark:text-green-500'
                  : progress < 50
                    ? 'text-red-600 dark:text-red-500'
                    : 'text-orange-600 dark:text-orange-500'
              )}
            >
              {progress}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                isOnTrack
                  ? 'bg-green-500'
                  : progress < 50
                    ? 'bg-red-500'
                    : 'bg-orange-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
