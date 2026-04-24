import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  TrendingDown,
  LucideIcon,
  Trophy,
  Target,
  CircleSlash2,
} from 'lucide-react';
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
  completion?: {
    current: number;
    reference: number;
    referenceLabel?: string;
    referenceValueText?: string;
    tooltipLabel?: string;
    tooltipValueText?: string;
  };
}

export const MetricCard = ({
  label,
  value,
  icon: Icon,
  comparison,
  context,
  completion,
}: MetricCardProps) => {
  const [animateProgress, setAnimateProgress] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimateProgress(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const TrendIcon =
    comparison?.direction === 'up'
      ? TrendingUp
      : comparison?.direction === 'down'
        ? TrendingDown
        : null;

  const completionIndex =
    completion && completion.reference > 0
      ? (completion.current / completion.reference) * 100
      : null;
  const completionDisplay = completionIndex === null ? 'N/A' : `${Math.round(completionIndex)}%`;
  const progressValue = completionIndex === null ? 0 : Math.min(completionIndex, 100);
  const targetReached = completionIndex !== null && completionIndex >= 100;

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
            {!completion && comparison && (
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

          {completion && (
            <TooltipProvider>
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span>{completionDisplay}</span>
                  {completionIndex === null ? (
                    <CircleSlash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : targetReached ? (
                    <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Target className="h-3.5 w-3.5 text-sky-600" />
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-default">
                      <Progress
                        value={animateProgress ? progressValue : 0}
                        className={`h-1.5 rounded-full bg-slate-100 [&>div]:transition-transform [&>div]:duration-700 [&>div]:ease-out ${
                          targetReached
                            ? '[&>div]:bg-emerald-500'
                            : completionIndex === null
                              ? '[&>div]:bg-slate-400'
                              : '[&>div]:bg-sky-500'
                        }`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {completion.tooltipLabel ?? 'Reference'} : {completion.tooltipValueText ?? completion.reference}
                  </TooltipContent>
                </Tooltip>
                <div className="text-xs text-muted-foreground">
                  <p className="text-muted-foreground">
                    {completion.referenceLabel ?? 'Periode precedente'} : {completion.referenceValueText ?? completion.reference}
                  </p>
                </div>
              </div>
            </TooltipProvider>
          )}
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
