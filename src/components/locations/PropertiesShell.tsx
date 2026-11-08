import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PropertiesShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Enveloppe commune des panneaux de propriétés. Elle s'affiche dans la partie
 * basse du panneau latéral de l'éditeur (et non plus en carte flottante sur le
 * plan, qui pouvait masquer une table placée à droite).
 */
export function PropertiesShell({ title, onClose, children }: PropertiesShellProps) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0" aria-label="Fermer le panneau">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
