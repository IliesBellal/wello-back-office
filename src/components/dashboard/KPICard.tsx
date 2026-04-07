import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIComparison } from '@/services/dashboardService';

interface KPICardProps {
  title: string;
  icon: LucideIcon;
  data: KPIComparison;
  /** Format de la valeur affichée — 'currency' | 'integer' | 'decimal' */
  format?: 'currency' | 'integer' | 'decimal';
  currency?: string;
  /** Affiche une barre de progression vers un objectif */
  target?: number;
  targetLabel?: string;
  /** Badge additionnel sous la valeur principale (ex: "12 en cours") */
  badge?: { label: string; value: string | number; color?: 'default' | 'warning' | 'danger' };
}

const formatValue = (
  value: number,
  format: KPICardProps['format'],
  currency: string
): string => {
  if (format === 'currency') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === 'decimal') {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('fr-FR').format(value);
};

const trendPct = (current: number, reference: number): number => {
  if (reference === 0) return 0;
  return Math.round(((current - reference) / reference) * 100);
};

const TrendBadge = ({ current, reference }: { current: number; reference: number }) => {
  const pct = trendPct(current, reference);
  const isUp = pct > 0;
  const isDown = pct < 0;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold',
        isUp && 'text-green-600',
        isDown && 'text-destructive',
        !isUp && !isDown && 'text-muted-foreground'
      )}
    >
      <Icon className="h-3 w-3" />
      {isUp ? '+' : ''}{pct}%
    </span>
  );
};

export const KPICard = ({
  title,
  icon: Icon,
  data,
  format = 'integer',
  currency = 'EUR',
  target,
  targetLabel,
  badge,
}: KPICardProps) => {
  const fmt = (v: number) => formatValue(v, format, currency);
  const progressValue = target ? Math.min((data.today / target) * 100, 100) : undefined;

  const badgeColors = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
  };

  return (
    <Card className="shadow-card hover:shadow-lg transition-all">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Valeur principale + trend vs hier */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-foreground leading-none">
            {fmt(data.today)}
          </span>
          <TrendBadge current={data.today} reference={data.yesterday} />
        </div>

        {/* Badge optionnel */}
        {badge && (
          <div className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-3', badgeColors[badge.color ?? 'default'])}>
            {badge.label} : <span className="font-bold">{badge.value}</span>
          </div>
        )}

        {/* Barre objectif */}
        {progressValue !== undefined && target && (
          <div className="mb-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{targetLabel ?? 'Objectif'}</span>
              <span>{fmt(target)}</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}

        {/* Comparaisons temporelles */}
        <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-border/60">
          {[
            { label: 'Hier',    value: data.yesterday },
            { label: 'S-1',     value: data.same_day_last_week },
            { label: 'A-1',     value: data.same_day_last_year },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-xs font-semibold text-foreground/80 tabular-nums">{fmt(value)}</p>
              <TrendBadge current={data.today} reference={value} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
