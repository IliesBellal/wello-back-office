import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateProductCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Crée la catégorie. Le rapport à l'utilisateur — succès comme échec — est
   * déjà assuré par l'appelant (`useMenuData.createProductCategory` notifie et
   * relance), on ne le double pas ici.
   */
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
  /** Appelé avec la catégorie créée, pour l'utiliser dans la foulée. */
  onCreated?: (categoryId: string, name: string) => void;
}

/**
 * Création d'une catégorie caisse, sans quitter la page produits.
 *
 * Composant à part plutôt qu'un dialogue inline : deux points d'entrée
 * l'ouvrent — le filtre par catégorie et le menu du bouton de création — et
 * dupliquer la saisie, l'appel et la gestion d'erreur à chaque endroit les
 * ferait diverger.
 *
 * « Caisse » figure dans le titre parce que le back-office manipule deux
 * familles de catégories : celles-ci, qui organisent la caisse et dont chaque
 * produit doit porter une, et les catégories marketing, qui pilotent
 * l'affichage sur la borne et le Scan'N'Order.
 */
export const CreateProductCategoryDialog = ({
  open,
  onOpenChange,
  onCreateCategory,
  onCreated,
}: CreateProductCategoryDialogProps) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Repartir d'un champ vide à chaque ouverture : retrouver le nom précédent
  // invite à créer un doublon sans le vouloir.
  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    try {
      const created = await onCreateCategory(trimmed);
      onCreated?.(created.category_id, trimmed);
      onOpenChange(false);
    } catch {
      // Déjà notifié par l'appelant : on garde simplement le dialogue ouvert,
      // avec la saisie intacte, pour pouvoir corriger et réessayer.
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isCreating && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie caisse</DialogTitle>
          <DialogDescription>
            Les catégories caisse organisent votre menu ; chaque produit doit en avoir une.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="new-product-category">Nom de la catégorie</Label>
          <Input
            id="new-product-category"
            autoFocus
            value={name}
            placeholder="Pizzas, Desserts, Boissons…"
            disabled={isCreating}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreate();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création…
              </>
            ) : (
              'Créer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
