import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsPageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * SettingsPageContainer - Conteneur principal pour les pages de paramétrage
 * Fournit:
 * - Max-width confortable
 * - Padding/espacement horizontal
 * - Conteneur pour SettingsGrid
 */
export const SettingsPageContainer = ({
  children,
  className,
}: SettingsPageContainerProps) => {
  return (
    <div className={cn(
      'w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6',
      className
    )}>
      {children}
    </div>
  );
};
