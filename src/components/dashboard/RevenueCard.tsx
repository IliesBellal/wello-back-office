import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Target, Trophy, CircleSlash2 } from 'lucide-react';

interface RevenueSection {
  value: number;
  currency: string;
  referenceValue: number;
  referenceLabel: string;
}

interface RevenueCardProps {
  day: RevenueSection;
  week: RevenueSection;
  month: RevenueSection;
}

const formatCurrency = (cents: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const computeCompletionIndex = (current: number, reference: number): number | null => {
  if (reference <= 0) {
    return null;
  }

  return (current / reference) * 100;
};

export const RevenueCard = ({ day, week, month }: RevenueCardProps) => {
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimateBars(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const sections = [
    {
      title: 'CA Jour',
      ...day,
    },
    {
      title: 'CA Semaine',
      ...week,
    },
    {
      title: 'CA Mois',
      ...month,
    },
  ];

  return (
    <Card className="border border-border/40 bg-white shadow-sm hover:shadow-md transition-all duration-200 h-full">
      <CardContent className="p-6 h-full flex flex-col">
        {/* 3 Sections - Verticale en mobile, Horizontale en desktop */}
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:divide-x md:divide-border/20 h-full md:items-center">
            {sections.map((section, idx) => {
              const completionIndex = computeCompletionIndex(section.value, section.referenceValue);
              const completionDisplay = completionIndex === null ? 'N/A' : `${Math.round(completionIndex)}%`;
              const progressPercent = completionIndex === null ? 0 : Math.min(completionIndex, 100);
              const isTargetReached = completionIndex !== null && completionIndex >= 100;

              return (
                <div key={idx} className="flex flex-col items-start gap-3 py-4 md:py-0 md:first:pl-0 md:px-6 md:last:pr-0">
              {/* Label */}
              <h3 className="text-sm font-bold text-muted-foreground">{section.title}</h3>

              {/* Valeur principale */}
              <div className="w-full">
                <p className="text-3xl font-bold text-foreground leading-none">
                  {formatCurrency(section.value, section.currency)}
                </p>
              </div>

              <div className="w-full">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span>{completionDisplay}</span>
                  {completionIndex === null ? (
                    <CircleSlash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : isTargetReached ? (
                    <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Target className="h-3.5 w-3.5 text-sky-600" />
                  )}
                </div>
              </div>

              {/* Barre de progression */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full cursor-default">
                    <Progress
                      value={animateBars ? progressPercent : 0}
                      className={`h-1.5 rounded-full bg-slate-100 [&>div]:transition-transform [&>div]:duration-700 [&>div]:ease-out ${
                        isTargetReached
                          ? '[&>div]:bg-emerald-500'
                          : completionIndex === null
                            ? '[&>div]:bg-slate-400'
                            : '[&>div]:bg-sky-500'
                      }`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  CA de reference : {formatCurrency(section.referenceValue, section.currency)}
                </TooltipContent>
              </Tooltip>

              <div className="w-full text-xs text-muted-foreground">
                <p className="text-muted-foreground">
                  {section.referenceLabel} : {formatCurrency(section.referenceValue, section.currency)}
                </p>
              </div>
            </div>
              );
            })}
              </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
