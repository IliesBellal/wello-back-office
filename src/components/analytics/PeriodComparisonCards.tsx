import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodData {
  value: number;
  label: string;
}

interface PeriodComparisonCardsProps {
  currentPeriod: PeriodData;
  previousPeriod: { value: number; changePercent: number };
  yearAgo: { value: number; changePercent: number };
  isLoading?: boolean;
  format?: (value: number) => string;
}

/**
 * Affiche 3 cards comparant : Période actuelle, Précédente, N-1 
 */
export function PeriodComparisonCards({
  currentPeriod,
  previousPeriod,
  yearAgo,
  isLoading = false,
  format = (v) => v.toString(),
}: PeriodComparisonCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 animate-pulse" />
              <div className="h-3 bg-muted rounded w-24 mt-2 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const previousChangeIsPositive = previousPeriod.changePercent >= 0;
  const yearAgoChangeIsPositive = yearAgo.changePercent >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
      {/* Période actuelle */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Période actuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{format(currentPeriod.value)}</div>
          <p className="text-xs text-muted-foreground mt-2">{currentPeriod.label}</p>
        </CardContent>
      </Card>

      {/* Période précédente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Période précédente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{format(previousPeriod.value)}</div>
          <div
            className={cn(
              'flex items-center gap-1 text-xs mt-2 font-medium',
              previousChangeIsPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {previousChangeIsPositive ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            <span>{Math.abs(previousPeriod.changePercent).toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Année dernière (N-1) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Année dernière (N-1)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{format(yearAgo.value)}</div>
          <div
            className={cn(
              'flex items-center gap-1 text-xs mt-2 font-medium',
              yearAgoChangeIsPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {yearAgoChangeIsPositive ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            <span>{Math.abs(yearAgo.changePercent).toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
