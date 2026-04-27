import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  createLoyaltyProgram,
  deleteLoyaltyProgram,
  getProducts,
  getLoyaltyPrograms,
  type LoyaltyProgram,
  type LoyaltyProgramMutationPayload,
  type LoyaltySelectionProduct,
  updateLoyaltyProgram,
} from '@/services/customersService';
import { Gift, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

interface ProgramFormData {
  name: string;
  description: string;
  available: boolean;
  type: 'orders_count' | 'total_spent' | 'product_count';
  target_value: number;
  target_order_types: string[];
  target_product_ids: string[];
  reward_type: 'fixed_discount' | 'percent_discount' | 'free_product';
  reward_value: number;
  reward_max_discount_value: number;
  reward_order_types: string[];
  reward_product_ids: string[];
}

const ORDER_TYPES = [
  { value: 'IN', label: 'Sur place' },
  { value: 'TAKE_AWAY', label: 'Emporter' },
  { value: 'DELIVERY', label: 'Livraison' },
];

const INITIAL_FORM_DATA: ProgramFormData = {
  name: '',
  description: '',
  available: true,
  type: 'orders_count',
  target_value: 10,
  target_order_types: ['IN', 'TAKE_AWAY', 'DELIVERY'],
  target_product_ids: [],
  reward_type: 'fixed_discount',
  reward_value: 10,
  reward_max_discount_value: 0,
  reward_order_types: ['IN', 'TAKE_AWAY', 'DELIVERY'],
  reward_product_ids: [],
};

const LoyaltyPrograms = () => {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<LoyaltySelectionProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [targetProductSearch, setTargetProductSearch] = useState('');
  const [rewardProductSearch, setRewardProductSearch] = useState('');
  const [formData, setFormData] = useState<ProgramFormData>(INITIAL_FORM_DATA);
  const { toast } = useToast();

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLoyaltyPrograms();
      setPrograms(data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les programmes de fidelite',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
    setTargetProductSearch('');
    setRewardProductSearch('');
  };

  const loadProducts = useCallback(async () => {
    if (products.length > 0) {
      return;
    }

    setProductsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les produits',
        variant: 'destructive',
      });
    } finally {
      setProductsLoading(false);
    }
  }, [products.length, toast]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    if (isDialogOpen) {
      loadProducts();
    }
  }, [isDialogOpen, loadProducts]);

  const toggleStringValue = (values: string[], value: string) =>
    values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

  const renderProductSelectionList = (
    selectedIds: string[],
    onToggle: (productId: string) => void,
    searchTerm: string
  ) => {
    if (productsLoading) {
      return <p className="text-sm text-muted-foreground">Chargement des produits...</p>;
    }

    if (products.length === 0) {
      return <p className="text-sm text-muted-foreground py-8 text-center">Aucun produit disponible</p>;
    }

    const filteredProducts = products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    if (filteredProducts.length === 0) {
      return <p className="text-sm text-muted-foreground py-8 text-center">Aucun resultat pour votre recherche</p>;
    }

    return (
      <div className="border border-border rounded-lg p-2 space-y-1">
        {filteredProducts.map((product) => {
          const isSelected = selectedIds.includes(product.id);

          return (
            <div
              key={product.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={product.image_url} alt={product.name} />
                <AvatarFallback style={{ backgroundColor: product.bg_color || '#e5e7eb' }} />
              </Avatar>
              <span className="text-sm font-medium flex-1 truncate">{product.name}</span>
              <Switch checked={isSelected} onCheckedChange={() => onToggle(product.id)} />
            </div>
          );
        })}
      </div>
    );
  };

  const handleOpenDialog = (program?: LoyaltyProgram) => {
    setTargetProductSearch('');
    setRewardProductSearch('');

    if (program) {
      setFormData({
        name: program.name,
        description: program.description,
        available: program.is_active,
        type: program.type,
        target_value: program.type === 'total_spent' ? (program.target_value / 100) : program.target_value,
        target_order_types: program.target_order_types?.length ? program.target_order_types : ['IN', 'TAKE_AWAY', 'DELIVERY'],
        target_product_ids: (program.target_products || []).map((product) => product.id),
        reward_type: program.reward_type || 'fixed_discount',
        reward_value: program.reward_type === 'fixed_discount'
          ? ((program.reward_value ?? 0) / 100)
          : (program.reward_value ?? 0),
        reward_max_discount_value: ((program.reward_max_discount_value ?? 0) / 100),
        reward_order_types: program.reward_order_types?.length ? program.reward_order_types : ['IN', 'TAKE_AWAY', 'DELIVERY'],
        reward_product_ids: (program.reward_products || []).map((product) => product.id),
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

    if (formData.target_order_types.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Selectionnez au moins un type de commande cible',
        variant: 'destructive',
      });
      return;
    }

    if (formData.reward_order_types.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Selectionnez au moins un type de commande pour la recompense',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'product_count' && formData.target_product_ids.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Selectionnez au moins un produit cible',
        variant: 'destructive',
      });
      return;
    }

    if (formData.reward_type === 'free_product' && formData.reward_product_ids.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Selectionnez au moins un produit offert',
        variant: 'destructive',
      });
      return;
    }

    if (formData.reward_type === 'percent_discount' && formData.reward_max_discount_value <= 0) {
      toast({
        title: 'Erreur',
        description: 'La valeur maximum (EUR) doit etre superieure a 0 pour une reduction en pourcentage',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const safeTargetValue = Number.isFinite(formData.target_value) ? formData.target_value : 0;
      const safeRewardValue = Number.isFinite(formData.reward_value) ? formData.reward_value : 0;
      const safeMaxDiscount = Number.isFinite(formData.reward_max_discount_value) ? formData.reward_max_discount_value : 0;

      const payload: LoyaltyProgramMutationPayload = {
        name: formData.name,
        description: formData.description,
        available: formData.available,
        target: {
          type: formData.type,
          value: formData.type === 'total_spent' ? Math.round(safeTargetValue * 100) : Math.round(safeTargetValue),
          order_types: formData.target_order_types.join(' '),
          product_ids: formData.type === 'product_count' ? formData.target_product_ids : [],
        },
        reward: {
          type: formData.reward_type,
          value: formData.reward_type === 'fixed_discount' ? Math.round(safeRewardValue * 100) : safeRewardValue,
          order_types: formData.reward_order_types.join(' '),
          min_order_value: 0,
          max_rewards_per_order: 1,
          ...(formData.reward_type === 'percent_discount' ? { max_discount_value: Math.round(safeMaxDiscount * 100) } : {}),
          product_ids: formData.reward_type === 'free_product' ? formData.reward_product_ids : [],
        },
      };

      if (editingId) {
        await updateLoyaltyProgram(editingId, payload);
        toast({
          title: 'Succes',
          description: 'Programme de fidelite mis a jour',
        });
      } else {
        await createLoyaltyProgram(payload);
        toast({
          title: 'Succes',
          description: 'Programme de fidelite cree',
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
    if (!programToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteLoyaltyProgram(programToDelete);
      toast({
        title: 'Succes',
        description: 'Programme de fidelite supprime',
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
      total_spent: 'Montant depense',
      product_count: 'Nombre de produits',
      products_count: 'Nombre de produits',
    };

    return labels[type] || type;
  };

  const getTargetFieldLabel = (type: ProgramFormData['type']) => {
    if (type === 'orders_count') {
      return 'Nombre de commandes a atteindre';
    }

    if (type === 'total_spent') {
      return 'Montant a depenser (EUR)';
    }

    return 'Nombre de produits a acheter';
  };

  const getRewardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fixed_discount: 'Reduction fixe',
      percent_discount: 'Reduction en %',
      free_product: 'Produit gratuit',
    };

    return labels[type] || type;
  };

  const formatTargetSummary = (program: LoyaltyProgram) => {
    if (program.type === 'orders_count') {
      return `${program.target_value} commandes`;
    }

    if (program.type === 'total_spent') {
      return `${(program.target_value / 100).toFixed(2)} EUR depenses`;
    }

    return `${program.target_value} produits`;
  };

  const formatRewardSummary = (program: LoyaltyProgram) => {
    if (program.reward_type === 'fixed_discount') {
      return `${((program.reward_value ?? 0) / 100).toFixed(2)} EUR de reduction`;
    }

    if (program.reward_type === 'percent_discount') {
      return `${program.reward_value ?? 0}% de reduction`;
    }

    if (program.reward_type === 'free_product') {
      const rewardProducts = program.reward_products ?? [];

      if (rewardProducts.length === 0) {
        return 'Produit offert';
      }

      if (rewardProducts.length === 1) {
        return rewardProducts[0].name;
      }

      return `${rewardProducts.length} produits eligibles`;
    }

    return '-';
  };

  const formatOrderTypes = (orderTypes?: string[]) => {
    if (!orderTypes || orderTypes.length === 0) {
      return 'Tous les types de commande';
    }

    const labels: Record<string, string> = {
      IN: 'Sur place',
      TAKE_AWAY: 'Emporter',
      DELIVERY: 'Livraison',
    };

    return orderTypes.map((type) => labels[type] || type).join(', ');
  };

  const renderProductsSummary = (title: string, products?: Array<{ id: string; name: string }>) => {
    if (!products || products.length === 0) {
      return null;
    }

    const preview = products.slice(0, 3).map((product) => product.name).join(', ');
    const remaining = products.length - 3;

    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-sm text-foreground">
          {preview}
          {remaining > 0 ? ` + ${remaining} autre${remaining > 1 ? 's' : ''}` : ''}
        </p>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Programmes de fidelite</h1>
            <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau programme
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Gift className="mb-4 h-12 w-12" />
                <p>Aucun programme de fidelite</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {programs.map((program) => (
                <Card key={program.id} className="flex h-full flex-col border border-border">
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base leading-snug">{program.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{program.description}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          program.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {program.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                    <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Objectif</p>
                        <p className="text-sm font-medium text-foreground">{formatTargetSummary(program)}</p>
                        <p className="text-xs text-muted-foreground">{getTypeLabel(program.type)}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Recompense</p>
                        <p className="text-sm font-medium text-foreground">{formatRewardSummary(program)}</p>
                        <p className="text-xs text-muted-foreground">{getRewardTypeLabel(program.reward_type || '')}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Commandes concernees</p>
                        <p className="text-sm text-foreground">{formatOrderTypes(program.target_order_types)}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Recompense utilisable sur</p>
                        <p className="text-sm text-foreground">{formatOrderTypes(program.reward_order_types)}</p>
                      </div>

                      {renderProductsSummary('Produits cibles', program.target_products)}
                      {renderProductsSummary('Produits offerts', program.reward_products)}
                    </div>

                    <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(program)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteProgram(program.id)}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le programme' : 'Creer un nouveau programme'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifiez les parametres du programme de fidelite'
                : 'Creez un nouveau programme de fidelite pour vos clients'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="target">Cible</TabsTrigger>
              <TabsTrigger value="reward">Recompense</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Nom du programme</Label>
                <Input
                  id="name"
                  placeholder="Points de fidelite"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Description du programme..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled-switch">Actif</Label>
                  <p className="text-xs text-muted-foreground">Desactive pour mettre ce programme en pause.</p>
                </div>
                <Switch
                  id="enabled-switch"
                  checked={formData.available}
                  onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                />
              </div>
            </TabsContent>

            <TabsContent value="target" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="type">Type de programme</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ProgramFormData['type']) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders_count">Nombre de commandes</SelectItem>
                    <SelectItem value="total_spent">Montant depense</SelectItem>
                    <SelectItem value="product_count">Nombre de produits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target">{getTargetFieldLabel(formData.type)}</Label>
                <Input
                  id="target"
                  type="number"
                  min="1"
                  value={formData.target_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_value: Number.parseFloat(e.target.value),
                    })
                  }
                  className="mt-2"
                />
              </div>

              {formData.type === 'product_count' && (
                <div className="space-y-2">
                  <Label>Produits cibles</Label>
                  <Input
                    placeholder="Rechercher un produit cible..."
                    value={targetProductSearch}
                    onChange={(e) => setTargetProductSearch(e.target.value)}
                  />
                  <div className="max-h-56 overflow-y-auto pr-1">
                    {renderProductSelectionList(
                      formData.target_product_ids,
                      (productId) =>
                        setFormData({
                          ...formData,
                          target_product_ids: toggleStringValue(formData.target_product_ids, productId),
                        }),
                      targetProductSearch
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Types de commande cibles</Label>
                <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
                  {ORDER_TYPES.map((orderType) => (
                    <label key={`target-order-type-${orderType.value}`} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.target_order_types.includes(orderType.value)}
                        onCheckedChange={() =>
                          setFormData({
                            ...formData,
                            target_order_types: toggleStringValue(formData.target_order_types, orderType.value),
                          })
                        }
                      />
                      <span>{orderType.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reward" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="reward-type">Type de recompense</Label>
                <Select
                  value={formData.reward_type}
                  onValueChange={(value: ProgramFormData['reward_type']) => setFormData({ ...formData, reward_type: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_product">Produit gratuit</SelectItem>
                    <SelectItem value="fixed_discount">Reduction fixe</SelectItem>
                    <SelectItem value="percent_discount">Reduction en pourcentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.reward_type === 'free_product' && (
                <div className="space-y-2">
                  <Label>Produits eligibles</Label>
                  <Input
                    placeholder="Rechercher un produit eligible..."
                    value={rewardProductSearch}
                    onChange={(e) => setRewardProductSearch(e.target.value)}
                  />
                  <div className="max-h-56 overflow-y-auto pr-1">
                    {renderProductSelectionList(
                      formData.reward_product_ids,
                      (productId) =>
                        setFormData({
                          ...formData,
                          reward_product_ids: toggleStringValue(formData.reward_product_ids, productId),
                        }),
                      rewardProductSearch
                    )}
                  </div>
                </div>
              )}

              {formData.reward_type === 'fixed_discount' && (
                <div>
                  <Label htmlFor="reward-value-eur">Valeur de la recompense (EUR)</Label>
                  <Input
                    id="reward-value-eur"
                    type="number"
                    min="0"
                    value={formData.reward_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reward_value: Number.parseFloat(e.target.value),
                      })
                    }
                    className="mt-2"
                    placeholder="10"
                  />
                </div>
              )}

              {formData.reward_type === 'percent_discount' && (
                <>
                  <div>
                    <Label htmlFor="reward-value-percent">Valeur de la recompense (%)</Label>
                    <Input
                      id="reward-value-percent"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.reward_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reward_value: Number.parseFloat(e.target.value),
                        })
                      }
                      className="mt-2"
                      placeholder="15"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reward-max-value">Valeur maximum (EUR)</Label>
                    <Input
                      id="reward-max-value"
                      type="number"
                      min="0"
                      value={formData.reward_max_discount_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reward_max_discount_value: Number.parseFloat(e.target.value),
                        })
                      }
                      className="mt-2"
                      placeholder="7"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Types de commande eligibles pour la recompense</Label>
                <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
                  {ORDER_TYPES.map((orderType) => (
                    <label key={`reward-order-type-${orderType.value}`} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.reward_order_types.includes(orderType.value)}
                        onCheckedChange={() =>
                          setFormData({
                            ...formData,
                            reward_order_types: toggleStringValue(formData.reward_order_types, orderType.value),
                          })
                        }
                      />
                      <span>{orderType.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveProgram} disabled={isSaving} className="bg-gradient-primary">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Mettre a jour' : 'Creer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le programme"
        description="Etes-vous sur de vouloir supprimer ce programme de fidelite ? Cette action est irreversible."
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmText="Supprimer"
        isDangerous={true}
      />
    </DashboardLayout>
  );
};

export default LoyaltyPrograms;
