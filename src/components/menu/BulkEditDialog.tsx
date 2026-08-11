import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CategorySelector, ConfirmDialog } from '@/components/shared';
import { ProductOptionsTab } from '@/components/menu/ProductOptionsTab';
import { Attribute, Category, Product, ProductAttribute, ProductStatus } from '@/types/menu';
import { menuService } from '@/services/menuService';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  EyeOff,
  ListChecks,
  FolderInput,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';

type BulkAction =
  | 'delete'
  | 'set_available'
  | 'set_not_available'
  | 'remove_from_menu'
  | 'set_attributes'
  | 'assign_category'
  | 'assign_marketing_category';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Produits cochés dans le tableau (racines uniquement). */
  selectedProducts: Product[];
  attributes: Attribute[];
  categories: Category[];
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
  onDeleteProducts: (productIds: string[]) => Promise<void>;
  onSetStatus: (productIds: string[], status: ProductStatus) => Promise<void>;
  onSetAttributes: (productIds: string[], attributeIds: string[]) => Promise<void>;
  onAssignCategory: (productIds: string[], categoryId: string) => Promise<void>;
  onAssignMarketingCategory: (productIds: string[], categoryId: string) => Promise<void>;
  /** Appelé après une action réussie, pour vider la sélection du tableau. */
  onApplied: () => void;
}

const ACTIONS: {
  value: BulkAction;
  label: string;
  hint: string;
  icon: typeof Trash2;
  dangerous?: boolean;
}[] = [
  {
    value: 'delete',
    label: 'Supprimer les produits',
    hint: 'Les produits sont désactivés et disparaissent du back-office comme du menu.',
    icon: Trash2,
    dangerous: true,
  },
  {
    value: 'set_available',
    label: 'Définir comme Disponible',
    hint: 'Les produits redeviennent commandables.',
    icon: CheckCircle2,
  },
  {
    value: 'set_not_available',
    label: 'Définir comme Indisponibles',
    hint: 'Les produits restent au menu, affichés comme indisponibles.',
    icon: XCircle,
  },
  {
    value: 'remove_from_menu',
    label: 'Retirer du menu',
    hint: 'Les produits sortent du menu de vente mais restent listés ici.',
    icon: EyeOff,
  },
  {
    value: 'set_attributes',
    label: 'Définir les options',
    hint: 'Remplace toutes les options et suppléments des produits par la sélection ci-dessous.',
    icon: ListChecks,
  },
  {
    value: 'assign_category',
    label: 'Ajouter à la catégorie caisse',
    hint: 'Un produit n’appartient qu’à une seule catégorie caisse : il quitte la précédente.',
    icon: FolderInput,
  },
  {
    value: 'assign_marketing_category',
    label: 'Ajouter à la catégorie marketing',
    hint: 'Rattachement additif : la catégorie caisse des produits n’est pas modifiée.',
    icon: Megaphone,
  },
];

const STATUS_BY_ACTION: Partial<Record<BulkAction, ProductStatus>> = {
  set_available: 'available',
  set_not_available: 'not_available',
  remove_from_menu: 'removed_from_menu',
};

/** Actions qui réclament un paramètre : elles gagnent un second écran plutôt qu'un tiroir sous la ligne. */
const DETAIL_ACTIONS: BulkAction[] = ['set_attributes', 'assign_category', 'assign_marketing_category'];
const needsDetailStep = (action: BulkAction | null): boolean =>
  action !== null && DETAIL_ACTIONS.includes(action);

type BulkEditStep = 'choose' | 'detail';

export const BulkEditDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  attributes,
  categories,
  onCreateCategory,
  onDeleteProducts,
  onSetStatus,
  onSetAttributes,
  onAssignCategory,
  onAssignMarketingCategory,
  onApplied,
}: BulkEditDialogProps) => {
  const [step, setStep] = useState<BulkEditStep>('choose');
  const [action, setAction] = useState<BulkAction | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttribute[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [marketingCategoryId, setMarketingCategoryId] = useState('');
  const [marketingCategories, setMarketingCategories] = useState<Category[] | null>(null);
  const [loadingMarketing, setLoadingMarketing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const productIds = useMemo(
    () => selectedProducts.map((p) => p.product_id),
    [selectedProducts]
  );

  // Réinitialise à chaque ouverture : une sélection d'options laissée d'une
  // session précédente serait appliquée par erreur à d'autres produits.
  useEffect(() => {
    if (!open) return;
    setStep('choose');
    setAction(null);
    setSelectedAttributes([]);
    setCategoryId('');
    setMarketingCategoryId('');
    setApplying(false);
  }, [open]);

  // Les catégories marketing ne sont pas chargées avec le menu : on ne les
  // récupère que si l'utilisateur choisit cette action.
  useEffect(() => {
    if (action !== 'assign_marketing_category' || marketingCategories !== null) return;

    setLoadingMarketing(true);
    menuService
      .getMarketingCategories()
      .then(setMarketingCategories)
      .catch(() => setMarketingCategories([]))
      .finally(() => setLoadingMarketing(false));
  }, [action, marketingCategories]);

  const handleCreateMarketingCategory = async (name: string) => {
    const created = await menuService.createMarketingCategory(name);
    const category: Category = {
      category_id: created.id,
      category: name,
      category_name: name,
      id: created.id,
      name,
      order: created.order,
      products: [],
    };
    setMarketingCategories((prev) => [...(prev ?? []), category]);
    return { category_id: created.id };
  };

  // Sur l'écran de choix, il suffit d'avoir sélectionné une action — le
  // paramètre, lui, n'est réclamé qu'au moment d'appliquer.
  const canProceed = (() => {
    if (!action || productIds.length === 0) return false;
    if (step === 'choose') return true;
    if (action === 'assign_category') return !!categoryId;
    if (action === 'assign_marketing_category') return !!marketingCategoryId;
    return true;
  })();

  const runAction = async () => {
    if (!action) return;

    const count = productIds.length;
    const plural = count > 1 ? 's' : '';

    setApplying(true);
    try {
      const status = STATUS_BY_ACTION[action];
      if (status) {
        await onSetStatus(productIds, status);
        toast.success(`${count} produit${plural} mis à jour`);
      } else if (action === 'delete') {
        await onDeleteProducts(productIds);
        toast.success(`${count} produit${plural} supprimé${plural}`);
      } else if (action === 'set_attributes') {
        await onSetAttributes(
          productIds,
          selectedAttributes.map((a) => a.attribute_id)
        );
        toast.success(`Options appliquées à ${count} produit${plural}`);
      } else if (action === 'assign_category') {
        await onAssignCategory(productIds, categoryId);
        toast.success(`${count} produit${plural} déplacé${plural}`);
      } else if (action === 'assign_marketing_category') {
        await onAssignMarketingCategory(productIds, marketingCategoryId);
        toast.success(`${count} produit${plural} rattaché${plural}`);
      }

      onApplied();
      onOpenChange(false);
    } catch {
      // apiClient a déjà affiché le détail de l'erreur : on garde la fiche
      // ouverte pour permettre un nouvel essai sans reconstruire la sélection.
    } finally {
      setApplying(false);
    }
  };

  const handlePrimary = () => {
    if (step === 'choose' && needsDetailStep(action)) {
      setStep('detail');
      return;
    }
    if (action === 'delete') {
      setConfirmDeleteOpen(true);
      return;
    }
    void runAction();
  };

  const handleBack = () => setStep('choose');

  const count = selectedProducts.length;
  const selectedActionMeta = ACTIONS.find((entry) => entry.value === action);
  const primaryLabel = applying
    ? 'Application…'
    : step === 'choose' && needsDetailStep(action)
      ? 'Continuer'
      : 'Appliquer';

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !applying && onOpenChange(next)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Édition de groupe</DialogTitle>
            <DialogDescription>
              {count} produit{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}. Choisissez
              l’action à appliquer.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {step === 'choose' ? (
              <RadioGroup
                key="choose"
                value={action ?? ''}
                onValueChange={(value) => setAction(value as BulkAction)}
                className="gap-1 py-1 duration-200 animate-in fade-in slide-in-from-left-2"
              >
                {ACTIONS.map(({ value, label, hint, icon: Icon, dangerous }) => {
                  const isSelected = action === value;
                  return (
                    <label
                      key={value}
                      htmlFor={`bulk-action-${value}`}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem
                        value={value}
                        id={`bulk-action-${value}`}
                        className="mt-1"
                      />
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          dangerous ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      />
                      <div className="min-w-0">
                        <Label
                          htmlFor={`bulk-action-${value}`}
                          className={`cursor-pointer ${dangerous ? 'text-destructive' : ''}`}
                        >
                          {label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            ) : (
              selectedActionMeta && (
                <div key="detail" className="space-y-3 py-1 duration-200 animate-in fade-in slide-in-from-right-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                    <selectedActionMeta.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedActionMeta.label}</span>
                  </div>

                  {action === 'set_attributes' && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <ProductOptionsTab
                        productAttributes={selectedAttributes}
                        availableAttributes={attributes}
                        onChange={setSelectedAttributes}
                        disabled={applying}
                      />
                      {selectedAttributes.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Aucun groupe sélectionné : appliquer retirera toutes les options des
                          produits.
                        </p>
                      )}
                    </div>
                  )}

                  {action === 'assign_category' && (
                    <CategorySelector
                      categories={categories}
                      value={categoryId}
                      onValueChange={setCategoryId}
                      onCreateCategory={onCreateCategory}
                      placeholder="Sélectionner une catégorie caisse…"
                    />
                  )}

                  {action === 'assign_marketing_category' && (
                    loadingMarketing ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des catégories marketing…
                      </div>
                    ) : (
                      <CategorySelector
                        categories={marketingCategories ?? []}
                        value={marketingCategoryId}
                        onValueChange={setMarketingCategoryId}
                        onCreateCategory={handleCreateMarketingCategory}
                        placeholder="Sélectionner une catégorie marketing…"
                      />
                    )
                  )}
                </div>
              )
            )}
          </ScrollArea>

          <DialogFooter>
            {step === 'detail' ? (
              <Button variant="ghost" onClick={handleBack} disabled={applying}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
                Annuler
              </Button>
            )}
            <Button
              onClick={handlePrimary}
              disabled={!canProceed || applying}
              className={action === 'delete' ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-primary'}
            >
              {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {primaryLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Êtes-vous sûr ?"
        description={`${count} produit${count > 1 ? 's seront supprimés' : ' sera supprimé'} du catalogue. Les sous-produits des groupes sélectionnés le seront également.`}
        onConfirm={runAction}
        isDangerous
        isLoading={applying}
      />
    </>
  );
};
