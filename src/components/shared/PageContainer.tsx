import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer - Pro Dashboard Standard
 *
 * Composant de structure unique pour toutes les pages du back-office.
 * Garantit l'alignement parfait entre le titre et le contenu.
 *
 * Deux variantes :
 *
 * `default` — pages de contenu (formulaires, listes, settings) :
 * - Max-width: 1280px (max-w-7xl)
 * - Padding: px-4 sm:px-6 lg:px-8
 * - Spacing: py-8 (header), py-10 (content)
 *
 * `workspace` — pages outil (planning, éditeurs, boards) :
 * - Pleine largeur (pas de max-width) et pleine hauteur du viewport
 * - Chrome vertical compact (py-3 header, py-4 content)
 * - Le contenu est une colonne flex : les enfants gèrent leur propre
 *   scroll interne via `flex-1 min-h-0` (pattern Linear/Skello)
 *
 * Props:
 * - header: Optional ReactNode for page header/title section
 * - children: Page content
 * - className: Optional CSS class override
 * - variant: 'default' | 'workspace'
 */

interface PageContainerProps {
  header?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'workspace';
}

export const PageContainer = ({
  header,
  description,
  children,
  className,
  variant = 'default',
}: PageContainerProps) => {
  if (variant === 'workspace') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {(header || description) && (
          <div className="w-full shrink-0 border-b border-border">
            <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
              {header}
              {description && (
                <p className="text-sm text-muted-foreground mt-2">{description}</p>
              )}
            </div>
          </div>
        )}

        <div
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8',
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Section - Same max-width as content */}
      {(header || description) && (
        <div className="w-full border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {header}
            {description && (
              <p className="text-sm text-muted-foreground mt-2">{description}</p>
            )}
          </div>
        </div>
      )}

      {/* Content Section - Same max-width constraint */}
      <div
        className={cn(
          'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};
