import React from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavHeaderProps {
  title: string;
  subtitle?: string;
  isCollapsed?: boolean;
  onTitleClick?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const NavHeader: React.FC<NavHeaderProps> = ({
  title,
  subtitle,
  isCollapsed = false,
  onTitleClick,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between h-20 px-4 border-b border-sidebar-border',
        'shrink-0 bg-gradient-to-r from-sidebar/50 to-sidebar',
        className,
      )}
    >
      {!isCollapsed && (
        <div className="min-w-0 animate-in fade-in duration-300">
          {onTitleClick ? (
            <button
              onClick={onTitleClick}
              className={cn(
                'text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500',
                'bg-clip-text text-transparent hover:opacity-80 transition-opacity',
                'truncate text-left max-w-full',
              )}
              title={title}
            >
              {title}
            </button>
          ) : (
            <p
              className={cn(
                'text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500',
                'bg-clip-text text-transparent truncate',
              )}
              title={title}
            >
              {title}
            </p>
          )}

          {subtitle && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5">
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{subtitle}</span>
            </div>
          )}
        </div>
      )}

      {action}
    </div>
  );
};
