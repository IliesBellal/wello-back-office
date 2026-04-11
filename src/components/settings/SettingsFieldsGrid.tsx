import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsFieldsGridProps {
  children: ReactNode;
  /** Nombre de colonnes: 'single' (1), 'double' (2), ou 'triple' (3) */
  columns?: 'single' | 'double' | 'triple';
  className?: string;
}

/**
 * SettingsFieldsGrid - Grille pour les champs à l'intérieur d'une SettingsCard
 * Permet d'aligner les champs de formulaire côte à côte
 * 
 * Utilisation:
 * <SettingsCard title="Identité">
 *   <SettingsFieldsGrid columns="double">
 *     <SettingsField label="Nom" ... />
 *     <SettingsField label="Email" ... />
 *   </SettingsFieldsGrid>
 * </SettingsCard>
 */
export const SettingsFieldsGrid = ({
  children,
  columns = 'single',
  className,
}: SettingsFieldsGridProps) => {
  const colsClass = {
    single: 'grid-cols-1',
    double: 'md:grid-cols-2',
    triple: 'md:grid-cols-3',
  };

  return (
    <div className={cn(
      'grid gap-4',
      colsClass[columns],
      className
    )}>
      {children}
    </div>
  );
};
