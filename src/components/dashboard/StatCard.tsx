import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: string;
  isHighlighted?: boolean;
}

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  isHighlighted = false 
}: StatCardProps) => {
  return (
    <Card className={cn(
      "shadow-card transition-all hover:shadow-lg",
      isHighlighted && "bg-gradient-primary border-transparent"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
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
              <p className={cn(
                "text-sm mt-1",
                isHighlighted ? "text-white/80" : "text-muted-foreground"
              )}>
                {subtitle}
              </p>
            </div>
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                isHighlighted ? "text-white/90" : "text-foreground"
              )}>
                {trend}
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-2xl",
            isHighlighted 
              ? "bg-white/20 backdrop-blur-sm" 
              : "bg-primary/10"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              isHighlighted ? "text-white" : "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
