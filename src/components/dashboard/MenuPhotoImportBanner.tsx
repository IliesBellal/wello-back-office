import { useQuery } from '@tanstack/react-query';
import { Camera, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { menuService } from '@/services/menuService';

/**
 * Encart du tableau de bord pour un établissement qui n'a encore aucun
 * produit : c'est là qu'arrive le restaurateur en fin d'inscription. Il mène
 * directement à la porte photo de l'import (`/menu/products?import=photo`).
 *
 * Masqué dès qu'un produit existe, et aussi si la carte ne peut pas être lue
 * (droits, panne) : un encart d'onboarding ne doit jamais afficher d'erreur.
 */
export const MenuPhotoImportBanner = () => {
  const navigate = useNavigate();
  const { data: categories, isSuccess } = useQuery({
    queryKey: ['dashboard', 'menuIsEmpty'],
    queryFn: () => menuService.getMenuData(),
    retry: false,
    staleTime: 60 * 1000,
  });

  const productCount = (categories ?? []).reduce((sum, category) => sum + (category.products?.length ?? 0), 0);
  if (!isSuccess || productCount > 0) return null;

  return (
    <Card className="flex flex-col gap-4 border-primary/40 p-6 sm:flex-row sm:items-center">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Camera className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <h2 className="font-semibold">Créez votre carte en quelques minutes</h2>
        <p className="text-sm text-muted-foreground">
          Prenez votre carte en photo : nous lisons les produits, les prix et les catégories, et vous
          vérifiez tout avant l’enregistrement.
        </p>
      </div>
      <Button onClick={() => navigate('/menu/products?import=photo')}>
        Importer ma carte en photos
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};
