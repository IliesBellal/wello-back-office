import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * SettingsGrid - Wrapper pour les formulaires de paramétrage
 * Fournit une grille responsive avec max-width
 *
 * Responsive breakpoints:
 * - Mobile: 1 colonne
 * - Tablet: 2 colonnes
 * - Desktop: 3 colonnes
 */
export const SettingsGrid = ({ children, className }: SettingsGridProps) => {
  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12',
      'max-w-6xl mx-auto',
      className
    )}>
      {children}
    </div>
  );
};
