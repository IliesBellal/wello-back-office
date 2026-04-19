import React, { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResponsiveProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'outline' | 'ghost' | 'default';
  };
}

/**
 * ResponsiveProductSheet
 * Bascule automatiquement entre Sheet (Desktop) et fullscreen Dialog (Mobile)
 * Fournit un layout mobile-optimisé avec header fixe et contenu scrollable
 */
export function ResponsiveProductSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
}: ResponsiveProductSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!h-screen !max-h-screen !w-screen !p-0 !gap-0 !rounded-none flex flex-col [&_button[aria-label='Close']]:hidden">
          {/* Mobile Header - Fixed */}
          <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="flex-1 min-w-0 text-center px-2">
              <h2 className="text-sm font-semibold truncate">{title}</h2>
            </div>

            <div className="w-8" />
          </div>

          {/* Mobile Description */}
          {description && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border flex-shrink-0">
              {description}
            </div>
          )}

          {/* Mobile Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            {children}
          </div>

          {/* Mobile Footer Actions - Always at Bottom */}
          {primaryAction && (
            <div className="bg-white border-t border-border px-4 py-3 flex-shrink-0">
              <Button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
                className="w-full bg-gradient-primary"
              >
                {primaryAction.loading ? 'Enregistrement...' : primaryAction.label}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop: Original Sheet layout
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>{title}</SheetTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
