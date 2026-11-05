import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface PropertiesShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Enveloppe commune des panneaux de propriétés : feuille en bas de l'écran sur
 * mobile, carte flottante dans l'angle du plan sur ordinateur. Doit être
 * rendue dans un parent positionné (le conteneur du canvas).
 */
export function PropertiesShell({ title, onClose, children }: PropertiesShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open onOpenChange={open => !open && onClose()}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="max-h-[calc(85vh-100px)] overflow-y-auto py-4">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="absolute right-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-80 flex-col overflow-hidden border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0" aria-label="Fermer le panneau">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-4">{children}</div>
    </Card>
  );
}
