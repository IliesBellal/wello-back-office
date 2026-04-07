import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopProduct } from '@/services/dashboardService';

interface TopProductsCardProps {
  products: TopProduct[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const TrendIcon = ({
  trend,
  pct,
}: {
  trend: TopProduct['trend_vs_yesterday'];
  pct: number;
}) => {
  if (trend === 'up')
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600 font-medium">
        <TrendingUp className="h-3 w-3" />+{pct}%
      </span>
    );
  if (trend === 'down')
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-destructive font-medium">
        <TrendingDown className="h-3 w-3" />-{pct}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground font-medium">
      <Minus className="h-3 w-3" />~
    </span>
  );
};

export const TopProductsCard = ({ products }: TopProductsCardProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Top produits du jour</CardTitle>
        <p className="text-xs text-muted-foreground">Classement par quantité vendue</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-colors',
                product.out_of_stock
                  ? 'bg-red-50/60 border border-red-100'
                  : 'bg-muted/30 hover:bg-muted/50'
              )}
            >
              {/* Rang */}
              <span
                className={cn(
                  'text-sm font-bold w-5 text-center shrink-0',
                  product.rank === 1 && 'text-amber-500',
                  product.rank === 2 && 'text-slate-400',
                  product.rank === 3 && 'text-orange-400',
                  product.rank > 3 && 'text-muted-foreground'
                )}
              >
                {product.rank === 1 ? '🥇' : product.rank === 2 ? '🥈' : product.rank === 3 ? '🥉' : product.rank}
              </span>

              {/* Infos produit */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {product.name}
                  </p>
                  {product.out_of_stock && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0 gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Rupture
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{product.category}</p>
              </div>

              {/* Stats */}
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {product.quantity_sold} vendus
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(product.revenue)}
                </p>
              </div>

              {/* Trend */}
              <div className="shrink-0 w-14 text-right">
                <TrendIcon trend={product.trend_vs_yesterday} pct={product.trend_percentage} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
