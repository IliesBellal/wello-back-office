import { Allergen } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AlertCircle } from 'lucide-react';

interface AllergensSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allergens: Allergen[];
}

export const AllergensSheet = ({
  open,
  onOpenChange,
  allergens
}: AllergensSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Allergènes</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-2">
            Cette liste d'allergènes est maintenue par Wello Resto. Les allergènes vous aident à signaler les produits potentiellement dangereux pour les clients allergiques.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
          {allergens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun allergène disponible</p>
          ) : (
            allergens.map((allergen) => (
              <div key={allergen.allergen_id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                {allergen.icon && (
                  <div className="w-8 h-8 flex items-center justify-center text-lg">
                    {allergen.icon}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{allergen.name}</h3>
                  <p className="text-xs text-muted-foreground">{allergen.code}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
