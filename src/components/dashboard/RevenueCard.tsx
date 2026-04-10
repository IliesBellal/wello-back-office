import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueSection {
  value: number;
  currency: string;
  comparison: {
    text: string;
    direction: 'up' | 'down' | 'neutral';
  };
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

const TrendIndicator = ({
  direction,
  text,
}: {
  direction: 'up' | 'down' | 'neutral';
  text: string;
}) => {
  const TrendIcon =
    direction === 'up'
      ? TrendingUp
      : direction === 'down'
        ? TrendingDown
        : null;

  return (
    <span
      className={cn(
        'text-xs font-semibold flex items-center gap-0.5 justify-center',
        direction === 'up' && 'text-green-600',
        direction === 'down' && 'text-red-600',
        direction === 'neutral' && 'text-gray-500'
      )}
    >
      {TrendIcon && <TrendIcon className="h-3.5 w-3.5" />}
      {text}
    </span>
  );
};

export const RevenueCard = ({ day, week, month }: RevenueCardProps) => {
  const sections = [
    {
      title: 'CA Jour',
      subtitle: 'vs hier',
      ...day,
    },
    {
      title: 'CA Semaine',
      subtitle: 'vs semaine dernière',
      ...week,
    },
    {
      title: 'CA Mois',
      subtitle: 'vs mois dernier',
      ...month,
    },
  ];

  return (
    <Card className="border border-border/40 bg-white shadow-sm hover:shadow-md transition-all duration-200 h-full">
      <CardContent className="p-6 h-full flex flex-col">
        {/* 3 Sections Horizontales */}
        <div className="grid grid-cols-3 gap-6 divide-x divide-border/20 h-full items-center">
          {sections.map((section, idx) => (
            <div key={idx} className="flex flex-col items-center space-y-3 first:pl-0 px-6 last:pr-0">
              {/* Label */}
              <h3 className="text-sm font-bold text-muted-foreground">{section.title}</h3>

              {/* Valeur principale */}
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground leading-none">
                  {formatCurrency(section.value, section.currency)}
                </p>
              </div>

              {/* Comparaison */}
              <div className="w-full">
                <TrendIndicator
                  direction={section.comparison.direction}
                  text={section.comparison.text}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
