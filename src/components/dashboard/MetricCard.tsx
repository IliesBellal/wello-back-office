import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  comparison?: {
    text: string;
    direction: 'up' | 'down' | 'neutral';
  };
  context?: string;
}

export const MetricCard = ({
  label,
  value,
  icon: Icon,
  comparison,
  context,
}: MetricCardProps) => {
  const TrendIcon =
    comparison?.direction === 'up'
      ? TrendingUp
      : comparison?.direction === 'down'
        ? TrendingDown
        : null;

  return (
    <Card className="border border-border/40 bg-white shadow-sm hover:shadow-md transition-all duration-200 ease-out h-full">
      <CardContent className="p-5 space-y-3.5 h-full flex flex-col">
        {/* Header: Label avec optionnel icône */}
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/12 to-primary/8">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <h3 className="text-xs font-semibold text-muted-foreground tracking-tight">{label}</h3>
        </div>

        {/* Main Value + Comparison */}
        <div className="space-y-1 flex-1 flex flex-col justify-center">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground leading-none">
              {value}
            </span>
            {comparison && (
              <span
                className={cn(
                  'text-sm font-semibold flex items-center gap-0.5 flex-shrink-0',
                  comparison.direction === 'up' && 'text-green-600',
                  comparison.direction === 'down' && 'text-red-600',
                  comparison.direction === 'neutral' && 'text-gray-500'
                )}
              >
                {TrendIcon && <TrendIcon className="h-4 w-4" />}
                {comparison.text}
              </span>
            )}
          </div>
        </div>

        {/* Context */}
        {context && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {context}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
