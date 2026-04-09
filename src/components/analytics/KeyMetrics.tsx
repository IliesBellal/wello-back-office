import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyMetricData {
  label: string;
  value: string | number;
  changePercent: number;
  isPositive?: boolean;
}

interface KeyMetricsProps {
  metrics: KeyMetricData[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
}

/**
 * Affiche une grille de métriques clés avec variations
 * Utilisé dans l'onglet Commandes
 */
export function KeyMetrics({ 
  metrics, 
  isLoading = false,
  columns = 4 
}: KeyMetricsProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 animate-pulse" />
              <div className="h-3 bg-muted rounded w-12 mt-2 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {metrics.map((metric, idx) => {
        const isPositive = metric.isPositive !== undefined ? metric.isPositive : metric.changePercent >= 0;
        
        return (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{metric.value}</div>
              <div
                className={cn(
                  'flex items-center gap-1 text-xs mt-2 font-medium',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isPositive ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                <span>{Math.abs(metric.changePercent).toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
