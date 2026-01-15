import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showBadge?: boolean;
}

export const CardSkeleton = ({ 
  className, 
  lines = 3, 
  showAvatar = false,
  showBadge = true 
}: CardSkeletonProps) => {
  return (
    <div className={cn(
      "bg-card rounded-xl p-4 shadow-soft animate-pulse",
      className
    )}>
      <div className="flex items-start gap-3">
        {showAvatar && (
          <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 bg-muted rounded w-2/3" />
            {showBadge && <div className="h-5 bg-muted rounded-full w-16" />}
          </div>
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <div 
              key={i} 
              className="h-3 bg-muted rounded" 
              style={{ width: `${Math.random() * 30 + 50}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton = ({ count = 3, ...props }: CardSkeletonProps & { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} {...props} />
      ))}
    </div>
  );
};

export const TableRowSkeleton = ({ columns = 4 }: { columns?: number }) => {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-muted rounded flex-1"
          style={{ maxWidth: i === 0 ? '40%' : '20%' }}
        />
      ))}
    </div>
  );
};

export const GridSkeleton = ({ count = 6, columns = 3 }: { count?: number; columns?: number }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};
