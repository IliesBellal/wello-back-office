import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  LoyaltyProgram,
  CreateLoyaltyProgramPayload,
  getLoyaltyPrograms,
  createLoyaltyProgram,
  updateLoyaltyProgram,
  deleteLoyaltyProgram,
} from '@/services/customersService';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pencil, Trash2, Plus, Gift, Loader2 } from 'lucide-react';

interface ProgramFormData {
  name: string;
  description: string;
  type: 'orders_count' | 'total_spent' | 'product_count';
  target_value: number;
  target_order_types: string[];
  reward_type: 'fixed_discount' | 'percent_discount' | 'free_product';
  reward_value: number;
}

const LoyaltyPrograms = () => {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProgramFormData>({
    name: '',
    description: '',
    type: 'orders_count',
    target_value: 10,
    target_order_types: ['all'],
    reward_type: 'fixed_discount',
    reward_value: 10,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await getLoyaltyPrograms();
      setPrograms(data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les programmes de fidélité',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'orders_count',
      target_value: 10,
      target_order_types: ['all'],
      reward_type: 'fixed_discount',
      reward_value: 10,
    });
    setEditingId(null);
  };

  const handleOpenDialog = (program?: LoyaltyProgram) => {
    if (program) {
      setFormData({
        name: program.name,
        description: program.description,
        type: program.type,
        target_value: program.target_value,
        target_order_types: ['all'],
        reward_type: 'fixed_discount',
        reward_value: 0,
      });
      setEditingId(program.id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSaveProgram = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du programme est requis',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateLoyaltyProgramPayload = {
        ...formData,
        target_products: [],
      };

      if (editingId) {
        await updateLoyaltyProgram(editingId, payload);
        toast({
          title: 'Succès',
          description: 'Programme de fidélité mis à jour',
        });
      } else {
        await createLoyaltyProgram(payload);
        toast({
          title: 'Succès',
          description: 'Programme de fidélité créé',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      await loadPrograms();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le programme',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProgram = (programId: string) => {
    setProgramToDelete(programId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!programToDelete) return;

    setIsDeleting(true);
    try {
      await deleteLoyaltyProgram(programToDelete);
      toast({
        title: 'Succès',
        description: 'Programme de fidélité supprimé',
      });
      await loadPrograms();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le programme',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setProgramToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      orders_count: 'Nombre de commandes',
      total_spent: 'Montant dépensé',
      product_count: 'Nombre de produits',
    };
    return labels[type] || type;
  };

  const getRewardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fixed_discount: 'Réduction fixe',
      percent_discount: 'Réduction en %',
      free_product: 'Produit gratuit',
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Programmes de fidélité</h1>
            <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau programme
            </Button>
          </div>
        }
      >
        {/* Programs Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Gift className="h-12 w-12 mb-4" />
              <p>Aucun programme de fidélité</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Objectif</TableHead>
                    <TableHead>Récompense</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium">{program.name}</TableCell>
                      <TableCell className="text-sm">{getTypeLabel(program.type)}</TableCell>
                      <TableCell className="text-center text-sm">{program.target_value}</TableCell>
                      <TableCell className="text-sm">{getRewardTypeLabel(program.type)}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            program.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {program.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(program)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProgram(program.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </PageContainer>

        {/* Program Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier le programme' : 'Créer un nouveau programme'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Modifiez les paramètres du programme de fidélité'
                  : 'Créez un nouveau programme de fidélité pour vos clients'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">Nom du programme</Label>
                <Input
                  id="name"
                  placeholder="Points de fidélité"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Description du programme..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              {/* Type */}
              <div>
                <Label htmlFor="type">Type de programme</Label>
                <Select value={formData.type} onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders_count">Nombre de commandes</SelectItem>
                    <SelectItem value="total_spent">Montant dépensé</SelectItem>
                    <SelectItem value="product_count">Nombre de produits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Value */}
              <div>
                <Label htmlFor="target">Objectif ({getTypeLabel(formData.type)})</Label>
                <Input
                  id="target"
                  type="number"
                  min="1"
                  value={formData.target_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_value: parseFloat(e.target.value),
                    })
                  }
                  className="mt-2"
                />
              </div>

              {/* Reward Type */}
              <div>
                <Label htmlFor="reward-type">Type de récompense</Label>
                <Select value={formData.reward_type} onValueChange={(value: any) =>
                  setFormData({ ...formData, reward_type: value })
                }>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_discount">Réduction fixe (€)</SelectItem>
                    <SelectItem value="percent_discount">Réduction en %</SelectItem>
                    <SelectItem value="free_product">Produit gratuit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reward Value */}
              <div>
                <Label htmlFor="reward-value">Valeur de la récompense</Label>
                <Input
                  id="reward-value"
                  type="number"
                  min="0"
                  value={formData.reward_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reward_value: parseFloat(e.target.value),
                    })
                  }
                  className="mt-2"
                  placeholder="10"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSaveProgram}
                disabled={isSaving}
                className="bg-gradient-primary"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {editingId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer le programme"
          description="Êtes-vous sûr de vouloir supprimer ce programme de fidélité ? Cette action est irréversible."
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          confirmText="Supprimer"
          isDangerous={true}
        />
    </DashboardLayout>
  );
};

export default LoyaltyPrograms;
