import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { menuService } from '@/services/menuService';

interface ExternalMenusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExternalMenusSheet = ({
  open,
  onOpenChange
}: ExternalMenusSheetProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [confirmationPlatform, setConfirmationPlatform] = useState<'uber-eats' | 'deliveroo' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleConfirmUpdate = async () => {
    if (!confirmationPlatform) return;

    setIsUpdating(true);
    try {
      await menuService.updateExternalMenu(confirmationPlatform);
      const platformName = confirmationPlatform === 'uber-eats' ? 'Uber Eats' : 'Deliveroo';
      toast({
        title: "Succès",
        description: `Menu ${platformName} mis à jour avec succès`
      });
      setConfirmationPlatform(null);
    } catch (error) {
      const platformName = confirmationPlatform === 'uber-eats' ? 'Uber Eats' : 'Deliveroo';
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour le menu ${platformName}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const ContentComponent = () => (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Uber Eats</h3>
          <img src="/uber_eats_logo.png" alt="Uber Eats" className="h-12 object-contain rounded-lg" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Synchronisez votre menu avec Uber Eats
        </p>
        <Button 
          onClick={() => setConfirmationPlatform('uber-eats')} 
          className="w-full"
          disabled={isUpdating}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Mettre à jour le menu
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Deliveroo</h3>
          <img src="/deliveroo_logo.png" alt="Deliveroo" className="h-12 object-contain rounded-lg" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Synchronisez votre menu avec Deliveroo
        </p>
        <Button 
          onClick={() => setConfirmationPlatform('deliveroo')} 
          className="w-full"
          disabled={isUpdating}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Mettre à jour le menu
        </Button>
      </Card>
    </>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Menus Externes</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <ContentComponent />
            </div>
          </SheetContent>
        </Sheet>

        <ConfirmationDialog 
          platform={confirmationPlatform}
          isUpdating={isUpdating}
          onConfirm={handleConfirmUpdate}
          onCancel={() => setConfirmationPlatform(null)}
        />
      </>
    );
  }

  // Desktop: Side Sheet
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Menus Externes</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <ContentComponent />
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationDialog 
        platform={confirmationPlatform}
        isUpdating={isUpdating}
        onConfirm={handleConfirmUpdate}
        onCancel={() => setConfirmationPlatform(null)}
      />
    </>
  );
};

interface ConfirmationDialogProps {
  platform: 'uber-eats' | 'deliveroo' | null;
  isUpdating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog = ({
  platform,
  isUpdating,
  onConfirm,
  onCancel
}: ConfirmationDialogProps) => {
  const platformName = platform === 'uber-eats' ? 'Uber Eats' : 'Deliveroo';

  return (
    <AlertDialog open={platform !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Synchroniser avec {platformName}</AlertDialogTitle>
          <AlertDialogDescription>
            Seuls les produits marqués comme activés pour {platformName} seront envoyés à la plateforme.
            Cette action peut prendre quelques minutes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2 justify-end pt-4">
          <AlertDialogCancel disabled={isUpdating}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synchronisation...
              </>
            ) : (
              'Synchroniser'
            )}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
