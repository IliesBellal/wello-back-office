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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CategorySelector, ConfirmDialog } from '@/components/shared';
import { ProductOptionsTab } from '@/components/menu/ProductOptionsTab';
import { Attribute, BulkAvailabilityFields, Category, Product, ProductAttribute, ProductStatus, Tag, TvaRate, TvaRateGroup } from '@/types/menu';
import { menuService } from '@/services/menuService';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  EyeOff,
  ListChecks,
  ListPlus,
  FolderInput,
  Megaphone,
  Tags as TagsIcon,
  TagIcon,
  Store,
  ShoppingBag,
  Truck,
  Percent,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

type BulkAction =
  | 'delete'
  | 'set_available'
  | 'set_not_available'
  | 'remove_from_menu'
  | 'set_attributes'
  | 'add_attribute'
  | 'set_tags'
  | 'add_tags'
  | 'assign_category'
  | 'assign_marketing_category'
  | 'set_tva_on_site'
  | 'set_tva_take_away'
  | 'set_tva_delivery'
  | 'set_tva_all'
  | 'set_availability';

/** Valeur d'un canal dans l'écran « Définir les disponibilités ». */
type AvailabilityValue = 'unchanged' | 'enable' | 'disable';

/** Canal de disponibilité piloté par l'écran « Définir les disponibilités ». */
type AvailabilityChannel = 'on_site' | 'take_away' | 'delivery' | 'scannorder' | 'uber_eats' | 'deliveroo';

const AVAILABILITY_CHANNELS: {
  key: AvailabilityChannel;
  label: string;
  icon?: typeof Store;
  imageSrc?: string;
}[] = [
  { key: 'on_site', label: 'Sur place', icon: Store },
  { key: 'take_away', label: 'Emporter', icon: ShoppingBag },
  { key: 'delivery', label: 'Livraison', icon: Truck },
  { key: 'scannorder', label: 'ScanNOrder', imageSrc: '/scannorder_logo.png' },
  { key: 'uber_eats', label: 'Uber Eats', imageSrc: '/uber_eats_logo.png' },
  { key: 'deliveroo', label: 'Deliveroo', imageSrc: '/deliveroo_logo.png' },
];

const DEFAULT_AVAILABILITY_FIELDS: Record<AvailabilityChannel, AvailabilityValue> = {
  on_site: 'unchanged',
  take_away: 'unchanged',
  delivery: 'unchanged',
  scannorder: 'unchanged',
  uber_eats: 'unchanged',
  deliveroo: 'unchanged',
};

/** Mappe chaque canal vers le champ attendu par l'API. undefined = inchangé. */
const toBulkAvailabilityFields = (
  values: Record<AvailabilityChannel, AvailabilityValue>
): BulkAvailabilityFields => {
  const toBool = (v: AvailabilityValue) => (v === 'unchanged' ? undefined : v === 'enable');
  return {
    available_in: toBool(values.on_site),
    available_take_away: toBool(values.take_away),
    available_delivery: toBool(values.delivery),
    is_available_on_sno: toBool(values.scannorder),
    sync_uber_eats: toBool(values.uber_eats),
    sync_deliveroo: toBool(values.deliveroo),
  };
};

/** Scope attendu par l'API pour chaque action de TVA de groupe. */
const TVA_SCOPE_BY_ACTION: Partial<Record<BulkAction, 'on_site' | 'take_away' | 'delivery'>> = {
  set_tva_on_site: 'on_site',
  set_tva_take_away: 'take_away',
  set_tva_delivery: 'delivery',
};

const TVA_DELIVERY_TYPE_BY_SCOPE: Record<'on_site' | 'take_away' | 'delivery', string> = {
  on_site: 'IN',
  take_away: 'TAKE_AWAY',
  delivery: 'DELIVERY',
};

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Produits cochés dans le tableau (racines uniquement). */
  selectedProducts: Product[];
  attributes: Attribute[];
  categories: Category[];
  tags: Tag[];
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
  onDeleteProducts: (productIds: string[]) => Promise<void>;
  onSetStatus: (productIds: string[], status: ProductStatus) => Promise<void>;
  onSetAttributes: (productIds: string[], attributeIds: string[]) => Promise<void>;
  onAddAttribute: (productIds: string[], attributeId: string) => Promise<void>;
  onSetTags: (productIds: string[], tagIds: string[]) => Promise<void>;
  onAddTags: (productIds: string[], tagIds: string[]) => Promise<void>;
  onAssignCategory: (productIds: string[], categoryId: string) => Promise<void>;
  onAssignMarketingCategory: (productIds: string[], categoryId: string) => Promise<void>;
  onSetTva: (productIds: string[], scope: 'on_site' | 'take_away' | 'delivery', tvaId: string) => Promise<void>;
  onSetAvailability: (productIds: string[], fields: BulkAvailabilityFields) => Promise<void>;
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
    value: 'add_attribute',
    label: 'Ajouter une option',
    hint: 'Ajoute un groupe d’options aux produits sans toucher à ceux déjà attachés.',
    icon: ListPlus,
  },
  {
    value: 'set_tags',
    label: 'Définir les Tags',
    hint: 'Remplace tous les tags des produits par la sélection ci-dessous.',
    icon: TagsIcon,
  },
  {
    value: 'add_tags',
    label: 'Ajouter les tags',
    hint: 'Ajoute les tags sélectionnés aux produits sans retirer ceux déjà présents.',
    icon: TagIcon,
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
  {
    value: 'set_tva_on_site',
    label: 'Définir TVA Sur place',
    hint: 'Applique le taux de TVA choisi aux produits pour la vente sur place.',
    icon: Store,
  },
  {
    value: 'set_tva_take_away',
    label: 'Définir TVA Emporter',
    hint: 'Applique le taux de TVA choisi aux produits pour la vente à emporter.',
    icon: ShoppingBag,
  },
  {
    value: 'set_tva_delivery',
    label: 'Définir TVA Livraison',
    hint: 'Applique le taux de TVA choisi aux produits pour la livraison.',
    icon: Truck,
  },
  {
    value: 'set_tva_all',
    label: 'Définir toutes les TVA',
    hint: 'Applique en une seule fois un taux de TVA pour chacun des trois types de vente.',
    icon: Percent,
  },
  {
    value: 'set_availability',
    label: 'Définir les disponibilités',
    hint: 'Active ou désactive sur place, emporter, livraison, ScanNOrder et les plateformes de livraison, canal par canal.',
    icon: SlidersHorizontal,
  },
];

const STATUS_BY_ACTION: Partial<Record<BulkAction, ProductStatus>> = {
  set_available: 'available',
  set_not_available: 'not_available',
  remove_from_menu: 'removed_from_menu',
};

/** Actions qui réclament un paramètre : elles gagnent un second écran plutôt qu'un tiroir sous la ligne. */
const DETAIL_ACTIONS: BulkAction[] = [
  'set_attributes',
  'add_attribute',
  'set_tags',
  'add_tags',
  'assign_category',
  'assign_marketing_category',
  'set_tva_on_site',
  'set_tva_take_away',
  'set_tva_delivery',
  'set_tva_all',
  'set_availability',
];
const needsDetailStep = (action: BulkAction | null): boolean =>
  action !== null && DETAIL_ACTIONS.includes(action);

type BulkEditStep = 'choose' | 'detail';

export const BulkEditDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  attributes,
  categories,
  tags,
  onCreateCategory,
  onDeleteProducts,
  onSetStatus,
  onSetAttributes,
  onAddAttribute,
  onSetTags,
  onAddTags,
  onAssignCategory,
  onAssignMarketingCategory,
  onSetTva,
  onSetAvailability,
  onApplied,
}: BulkEditDialogProps) => {
  const { statuses } = useIntegrationStatus();
  const [step, setStep] = useState<BulkEditStep>('choose');
  const [action, setAction] = useState<BulkAction | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttribute[]>([]);
  const [attributeToAdd, setAttributeToAdd] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [marketingCategoryId, setMarketingCategoryId] = useState('');
  const [marketingCategories, setMarketingCategories] = useState<Category[] | null>(null);
  const [loadingMarketing, setLoadingMarketing] = useState(false);
  const [tvaRateId, setTvaRateId] = useState('');
  const [tvaAllRateIds, setTvaAllRateIds] = useState({ on_site: '', take_away: '', delivery: '' });
  const [tvaRateGroups, setTvaRateGroups] = useState<TvaRateGroup[] | null>(null);
  const [loadingTva, setLoadingTva] = useState(false);
  const [availabilityFields, setAvailabilityFields] =
    useState<Record<AvailabilityChannel, AvailabilityValue>>(DEFAULT_AVAILABILITY_FIELDS);
  const [applying, setApplying] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionSearch, setActionSearch] = useState('');

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
    setActionSearch('');
    setSelectedAttributes([]);
    setAttributeToAdd('');
    setSelectedTagIds([]);
    setCategoryId('');
    setMarketingCategoryId('');
    setTvaRateId('');
    setTvaAllRateIds({ on_site: '', take_away: '', delivery: '' });
    setAvailabilityFields(DEFAULT_AVAILABILITY_FIELDS);
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

  // Les taux de TVA ne sont pas chargés avec le menu non plus : on ne les
  // récupère qu'au premier choix d'une action de TVA de groupe (les trois
  // actions par scope, ou l'action groupée « Définir toutes les TVA »).
  useEffect(() => {
    const needsTva = !!action && (!!TVA_SCOPE_BY_ACTION[action] || action === 'set_tva_all');
    if (!needsTva || tvaRateGroups !== null) return;

    setLoadingTva(true);
    menuService
      .getTvaRates()
      .then(setTvaRateGroups)
      .catch(() => setTvaRateGroups([]))
      .finally(() => setLoadingTva(false));
  }, [action, tvaRateGroups]);

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

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const getRatesForScope = (scope: 'on_site' | 'take_away' | 'delivery'): TvaRate[] => {
    if (!tvaRateGroups) return [];
    const deliveryType = TVA_DELIVERY_TYPE_BY_SCOPE[scope];
    return tvaRateGroups.find((group) => group.delivery_type === deliveryType)?.rates || [];
  };

  const tvaScope = action ? TVA_SCOPE_BY_ACTION[action] : undefined;
  const tvaRates: TvaRate[] = useMemo(
    () => (tvaScope ? getRatesForScope(tvaScope) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tvaScope, tvaRateGroups]
  );

  // Liste filtrée par la recherche : le libellé et l'indice suffisent, pas
  // besoin de chercher dans la description qui n'apparaît qu'au survol.
  const filteredActions = useMemo(() => {
    const query = actionSearch.trim().toLowerCase();
    if (!query) return ACTIONS;
    return ACTIONS.filter(
      ({ label, hint }) => label.toLowerCase().includes(query) || hint.toLowerCase().includes(query)
    );
  }, [actionSearch]);

  // Sur l'écran de choix, il suffit d'avoir sélectionné une action — le
  // paramètre, lui, n'est réclamé qu'au moment d'appliquer.
  const canProceed = (() => {
    if (!action || productIds.length === 0) return false;
    if (step === 'choose') return true;
    if (action === 'add_attribute') return !!attributeToAdd;
    if (action === 'add_tags') return selectedTagIds.length > 0;
    if (action === 'assign_category') return !!categoryId;
    if (action === 'assign_marketing_category') return !!marketingCategoryId;
    if (action === 'set_tva_all') {
      return !!tvaAllRateIds.on_site && !!tvaAllRateIds.take_away && !!tvaAllRateIds.delivery;
    }
    if (action === 'set_availability') {
      return Object.values(availabilityFields).some((v) => v !== 'unchanged');
    }
    if (tvaScope) return !!tvaRateId;
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
      } else if (action === 'add_attribute') {
        await onAddAttribute(productIds, attributeToAdd);
        toast.success(`Option ajoutée à ${count} produit${plural}`);
      } else if (action === 'set_tags') {
        await onSetTags(productIds, selectedTagIds);
        toast.success(`Tags appliqués à ${count} produit${plural}`);
      } else if (action === 'add_tags') {
        await onAddTags(productIds, selectedTagIds);
        toast.success(`Tags ajoutés à ${count} produit${plural}`);
      } else if (action === 'assign_category') {
        await onAssignCategory(productIds, categoryId);
        toast.success(`${count} produit${plural} déplacé${plural}`);
      } else if (action === 'assign_marketing_category') {
        await onAssignMarketingCategory(productIds, marketingCategoryId);
        toast.success(`${count} produit${plural} rattaché${plural}`);
      } else if (action === 'set_tva_all') {
        await Promise.all([
          onSetTva(productIds, 'on_site', tvaAllRateIds.on_site),
          onSetTva(productIds, 'take_away', tvaAllRateIds.take_away),
          onSetTva(productIds, 'delivery', tvaAllRateIds.delivery),
        ]);
        toast.success(`TVA mise à jour pour ${count} produit${plural}`);
      } else if (action === 'set_availability') {
        await onSetAvailability(productIds, toBulkAvailabilityFields(availabilityFields));
        toast.success(`Disponibilités mises à jour pour ${count} produit${plural}`);
      } else if (tvaScope) {
        await onSetTva(productIds, tvaScope, tvaRateId);
        toast.success(`TVA mise à jour pour ${count} produit${plural}`);
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Édition de groupe</DialogTitle>
            <DialogDescription>
              {count} produit{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}. Choisissez
              l’action à appliquer.
            </DialogDescription>
          </DialogHeader>

          {step === 'choose' && (
            <div className="relative shrink-0 mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une action…"
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <ScrollArea className="flex-1 -mx-6 px-6">
            {step === 'choose' ? (
              <RadioGroup
                key="choose"
                value={action ?? ''}
                onValueChange={(value) => setAction(value as BulkAction)}
                className="gap-1 py-1 max-h-[340px] overflow-y-auto pr-1 duration-200 animate-in fade-in slide-in-from-left-2"
              >
                {filteredActions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune action ne correspond à « {actionSearch} ».
                  </p>
                )}
                {filteredActions.map(({ value, label, hint, icon: Icon, dangerous }) => {
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

                  {action === 'add_attribute' && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <Select value={attributeToAdd} onValueChange={setAttributeToAdd} disabled={applying}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un groupe d’options" />
                        </SelectTrigger>
                        <SelectContent>
                          {attributes.map((attr) => (
                            <SelectItem key={attr.id} value={attr.id}>
                              {attr.title || attr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(action === 'set_tags' || action === 'add_tags') && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      {tags.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun tag disponible</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <SelectableChip
                              key={tag.id}
                              color={tag.color}
                              selected={selectedTagIds.includes(tag.id)}
                              onToggle={() => toggleTag(tag.id)}
                              disabled={applying}
                            >
                              {tag.name}
                            </SelectableChip>
                          ))}
                        </div>
                      )}
                      {action === 'set_tags' && selectedTagIds.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Aucun tag sélectionné : appliquer retirera tous les tags des produits.
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

                  {action === 'set_tva_all' && (
                    loadingTva ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des taux de TVA…
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(['on_site', 'take_away', 'delivery'] as const).map((scope) => (
                          <div key={scope}>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              {scope === 'on_site' ? 'Sur place' : scope === 'take_away' ? 'À emporter' : 'Livraison'}
                            </Label>
                            <Select
                              value={tvaAllRateIds[scope]}
                              onValueChange={(value) =>
                                setTvaAllRateIds((prev) => ({ ...prev, [scope]: value }))
                              }
                              disabled={applying}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un taux de TVA…" />
                              </SelectTrigger>
                              <SelectContent>
                                {getRatesForScope(scope).map((rate) => (
                                  <SelectItem key={rate.id} value={rate.id.toString()}>
                                    <div className="flex flex-col">
                                      <span>{rate.label}</span>
                                      {rate.description && (
                                        <span className="text-xs text-muted-foreground">{rate.description}</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {tvaScope && (
                    loadingTva ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des taux de TVA…
                      </div>
                    ) : (
                      <Select value={tvaRateId} onValueChange={setTvaRateId} disabled={applying}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un taux de TVA…" />
                        </SelectTrigger>
                        <SelectContent>
                          {tvaRates.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id.toString()}>
                              <div className="flex flex-col">
                                <span>{rate.label}</span>
                                {rate.description && (
                                  <span className="text-xs text-muted-foreground">{rate.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  )}

                  {action === 'set_availability' && (
                    <div className="space-y-2">
                      {AVAILABILITY_CHANNELS.filter(
                        ({ key }) =>
                          (key !== 'uber_eats' || statuses.uberEats.active) &&
                          (key !== 'deliveroo' || statuses.deliveroo.active)
                      ).map(({ key, label, icon: Icon, imageSrc }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {Icon && <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />}
                            {imageSrc && (
                              <img src={imageSrc} alt={label} className="w-4 h-4 object-contain rounded shrink-0" />
                            )}
                            <span className="text-sm truncate">{label}</span>
                          </div>
                          <ToggleGroup
                            type="single"
                            size="sm"
                            value={availabilityFields[key]}
                            onValueChange={(value) =>
                              value &&
                              setAvailabilityFields((prev) => ({ ...prev, [key]: value as AvailabilityValue }))
                            }
                            disabled={applying}
                            className="shrink-0"
                          >
                            <ToggleGroupItem value="unchanged" className="text-xs">
                              Ne pas modifier
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="enable"
                              className="text-xs data-[state=on]:bg-green-600 data-[state=on]:text-white"
                            >
                              Activer
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="disable"
                              className="text-xs data-[state=on]:bg-destructive data-[state=on]:text-white"
                            >
                              Désactiver
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                      ))}
                    </div>
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
