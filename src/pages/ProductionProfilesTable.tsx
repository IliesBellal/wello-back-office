import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ListChecks, ChefHat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { productionProfileService } from '@/services/productionProfileService';
import { ProductionProfileFormSheet } from '@/components/settings/productionProfiles/ProductionProfileFormSheet';
import { ProductionProfileProductsDialog } from '@/components/settings/productionProfiles/ProductionProfileProductsDialog';
import type { ProductionProfileEntry } from '@/types/productionProfiles';

export default function ProductionProfilesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProductionProfileEntry | undefined>(undefined);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [profileForProducts, setProfileForProducts] = useState<ProductionProfileEntry | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<ProductionProfileEntry | undefined>(undefined);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: qk.productionProfiles.all,
    queryFn: () => productionProfileService.getProfiles(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productionProfileService.deleteProfile(id),
    onSuccess: () => {
      toast({ title: 'Profil de production supprimé' });
      queryClient.invalidateQueries({ queryKey: qk.productionProfiles.all });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le profil de production.',
        variant: 'destructive',
      });
    },
  });

  const handleAdd = () => {
    setEditingProfile(undefined);
    setFormOpen(true);
  };

  const handleEdit = (profile: ProductionProfileEntry) => {
    setEditingProfile(profile);
    setFormOpen(true);
  };

  const handleEditProducts = (profile: ProductionProfileEntry) => {
    setProfileForProducts(profile);
    setProductsDialogOpen(true);
  };

  const handleDelete = (profile: ProductionProfileEntry) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;
    await deleteMutation.mutateAsync(profileToDelete.id);
    setDeleteDialogOpen(false);
    setProfileToDelete(undefined);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Profils de production</h1>
            <Button className="bg-gradient-primary" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un profil
            </Button>
          </div>
        }
        description="Gérez les profils de production de votre établissement"
      >
        {isLoading ? (
          <p className="text-muted-foreground">Chargement des profils de production...</p>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <ChefHat className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun profil de production configuré pour le moment</p>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un profil
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProducts(profile)}
                          title="Gérer les produits du profil"
                        >
                          <ListChecks className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                          title="Renommer le profil"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(profile)}
                          title="Supprimer le profil"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContainer>

      <ProductionProfileFormSheet open={formOpen} onOpenChange={setFormOpen} profile={editingProfile} />

      <ProductionProfileProductsDialog
        open={productsDialogOpen}
        onOpenChange={setProductsDialogOpen}
        profile={profileForProducts}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer un profil de production"
        description={`Supprimer le profil "${profileToDelete?.name}" ?`}
        isDangerous
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}
