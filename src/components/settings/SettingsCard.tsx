import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
  /** Titre de la carte */
  title: string;
  /** Description sous le titre */
  description?: string;
  /** Icône affichée à côté du titre */
  icon?: LucideIcon;
  /** Contenu de la carte */
  children: ReactNode;
  /** Classe CSS personnalisée pour la carte */
  className?: string;
  /** Contrôle le nombre de colonnes que la carte occupe */
  colSpan?: 'full' | 'auto';
}

/**
 * SettingsCard - Carte de paramètres réutilisable
 * Groupe les champs logiques avec un titre et une description
 * 
 * Utilisation:
 * <SettingsCard
 *   title="Identité"
 *   description="Informations générales"
 *   icon={Store}
 * >
 *   <SettingsField label="Nom" ... />
 * </SettingsCard>
 */
export const SettingsCard = ({
  title,
  description,
  icon: Icon,
  children,
  className,
  colSpan = 'auto',
}: SettingsCardProps) => {
  return (
    <Card className={cn(
      colSpan === 'full' && 'md:col-span-2 lg:col-span-3',
      className
    )}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" />}
            {title}
          </CardTitle>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
