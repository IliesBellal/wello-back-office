import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroMetricCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  comparison?: {
    text: string; // ex: "+14%" ou "-2.5%"
    trend: 'up' | 'down' | 'neutral';
  };
  subtitle?: string;
}

const trendStyles = {
  up: 'text-green-600 dark:text-green-500',
  down: 'text-red-600 dark:text-red-500',
  neutral: 'text-gray-500 dark:text-gray-400',
};

export const HeroMetricCard = ({
  title,
  icon: Icon,
  value,
  comparison,
  subtitle,
}: HeroMetricCardProps) => {
  const TrendIcon = comparison?.trend === 'up' ? TrendingUp : comparison?.trend === 'down' ? TrendingDown : null;

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 space-y-4">
        {/* Icône */}
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Titre */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
          
          {/* Valeur principale */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground leading-tight">
              {value}
            </span>
            
            {/* Comparaison avec tendance */}
            {comparison && (
              <div className={cn(
                'flex items-center gap-1 text-sm font-semibold',
                trendStyles[comparison.trend]
              )}>
                {TrendIcon && <TrendIcon className="h-4 w-4" />}
                <span>{comparison.text}</span>
              </div>
            )}
          </div>

          {/* Sous-texte optionnel */}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
