import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavLogoutButtonProps {
  isCollapsed?: boolean;
  onClick: () => void;
  className?: string;
}

export const NavLogoutButton: React.FC<NavLogoutButtonProps> = ({
  isCollapsed = false,
  onClick,
  className,
}) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full text-sm font-medium transition-all duration-200',
        'text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'group relative',
        isCollapsed ? 'justify-center w-11 h-11 p-0' : 'justify-start gap-3 px-3 py-2.5 min-h-[44px]',
        className,
      )}
      onClick={onClick}
      title="Déconnexion"
      aria-label="Se déconnecter"
    >
      <LogOut className="w-5 h-5 shrink-0" />
      {!isCollapsed && <span className="truncate">Déconnexion</span>}
    </Button>
  );
};
