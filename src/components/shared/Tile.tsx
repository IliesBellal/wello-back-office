import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface TileProps {
  title: string;
  value: string | ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  isHighlighted?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

/**
 * Tile Component - Design unifiée pour toutes les métriques/KPI de l'application
 * 
 * Design:
 * - Borderées avec shadow-card
 * - Icône avec rounded-2xl background
 * - Quand isHighlighted: gradient primaire + white text + backdrop blur
 * - Hover effect avec animation shadow
 * 
 * Utilisation:
 * ```tsx
 * <Tile
 *   title="Total TTC"
 *   value="€12,345.67"
 *   subtitle="Chiffre d'affaires"
 *   icon={DollarSign}
 *   isHighlighted
 * />
 * ```
 */
export const Tile = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  isHighlighted = false,
  onClick,
  className,
  children
}: TileProps) => {
  return (
    <Card 
      className={cn(
        "shadow-card transition-all hover:shadow-lg",
        isHighlighted && "bg-gradient-primary border-transparent",
        onClick && "cursor-pointer hover:scale-105",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className={cn(
              "text-sm font-medium",
              isHighlighted ? "text-white/90" : "text-muted-foreground"
            )}>
              {title}
            </p>
            <div>
              <h3 className={cn(
                "text-3xl font-bold",
                isHighlighted ? "text-white" : "text-foreground"
              )}>
                {value}
              </h3>
              {subtitle && (
                <p className={cn(
                  "text-sm mt-1",
                  isHighlighted ? "text-white/80" : "text-muted-foreground"
                )}>
                  {subtitle}
                </p>
              )}
              {trend && (
                <p className={cn(
                  "text-xs font-medium mt-2",
                  isHighlighted ? "text-white/90" : "text-foreground"
                )}>
                  {trend}
                </p>
              )}
            </div>
          </div>
          {Icon && (
            <div className={cn(
              "p-3 rounded-2xl flex-shrink-0 ml-4",
              isHighlighted 
                ? "bg-white/20 backdrop-blur-sm" 
                : "bg-primary/10"
            )}>
              <Icon className={cn(
                "w-6 h-6",
                isHighlighted ? "text-white" : "text-primary"
              )} />
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
};

export default Tile;
