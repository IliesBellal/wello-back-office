import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer - Pro Dashboard Standard
 * 
 * Composant de structure unique pour toutes les pages du back-office.
 * Garantit l'alignement parfait entre le titre et le contenu.
 * 
 * Specs standardisées:
 * - Max-width: 1280px (max-w-7xl)  
 * - Padding: px-4 sm:px-6 lg:px-8
 * - Spacing: py-8 (header), py-10 (content)
 * 
 * Props:
 * - header: Optional ReactNode for page header/title section
 * - children: Page content
 * - className: Optional CSS class override
 */

interface PageContainerProps {
  header?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const PageContainer = ({
  header,
  description,
  children,
  className,
}: PageContainerProps) => {
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
