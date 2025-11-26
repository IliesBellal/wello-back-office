import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

  const handleUpdateUberEats = async () => {
    try {
      await menuService.updateExternalMenu('uber_eats');
      toast({
        title: "Succès",
        description: "Menu Uber Eats mis à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le menu Uber Eats",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDeliveroo = async () => {
    try {
      await menuService.updateExternalMenu('deliveroo');
      toast({
        title: "Succès",
        description: "Menu Deliveroo mis à jour avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le menu Deliveroo",
        variant: "destructive"
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Menus Externes</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Uber Eats</h3>
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">UE</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Synchronisez votre menu avec Uber Eats
            </p>
            <Button onClick={handleUpdateUberEats} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Mettre à jour le menu
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Deliveroo</h3>
              <div className="w-12 h-12 bg-[#00CCBC] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Synchronisez votre menu avec Deliveroo
            </p>
            <Button onClick={handleUpdateDeliveroo} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Mettre à jour le menu
            </Button>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};
