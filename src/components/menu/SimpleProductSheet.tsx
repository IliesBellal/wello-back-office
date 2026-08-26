import { useState, useEffect, useRef, useMemo } from 'react';
import { Product, TvaRate, TvaRateGroup, UnitOfMeasure, Component, Attribute, ProductAttribute, Category, Tag, Allergen, ProductCreatePayload } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/shared/PriceInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Save, X, ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { ProductCompositionTab } from './ProductCompositionTab';
import { ProductOptionsTab } from './ProductOptionsTab';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { MultiSelectDropdown } from '@/components/shared/MultiSelectDropdown';
import { menuService } from '@/services/menuService';
import { useToast } from '@/hooks/use-toast';
import { useProductEditData } from '@/hooks/useProductEditData';
import { useProductData } from '@/hooks/useProductData';
import { useObjectUrlPreview } from '@/hooks/useObjectUrlPreview';
import { parsePriceInput, priceToDisplayValue } from '@/utils/priceInputUtils';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { cn } from '@/lib/utils';
import { DuplicateNameDialog } from '@/components/shared/DuplicateNameDialog';
import { useDuplicateNameConfirm } from '@/hooks/useDuplicateNameConfirm';

interface SimpleProductSheetProps {
  /** Product ID to load - if provided, product data will be fetched automatically */
  productId?: string | null;
  /** Pre-loaded product data (optional, can be overridden by productId) */
  product?: Product | null;
  /**
   * Ouvre la fiche sur un produit qui n'existe pas encore : édition forcée,
   * enregistrement via onCreate. Une fois le produit créé la fiche bascule
   * d'elle-même sur le comportement habituel (consultation/modification).
   */
  createMode?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitOfMeasure[];
  components: Component[];
  attributes: Attribute[];
  categories: Category[];
  tags?: Tag[];
  allergens?: Allergen[];
  onSave: (productId: string, data: Partial<Product>) => Promise<void>;
  /** Requis en mode création. Doit retourner le produit créé (pour son ID). */
  onCreate?: (data: ProductCreatePayload) => Promise<Product>;
  onDelete?: (productId: string) => Promise<void>;
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
}

// Socle de lecture en création : la fiche est rendue avant qu'aucun produit
// n'existe. Le mode édition étant forcé, seules les branches d'édition (qui
// lisent formData) sont réellement affichées.
const DRAFT_PRODUCT = { product_id: '', name: '' } as Product;

/**
 * Retrouve l'ID du taux correspondant à la valeur portée par le produit.
 * L'API renvoie tantôt l'ID du taux, tantôt sa valeur (5.5, 10, 20) — on
 * accepte les deux pour présélectionner le bon taux dans la liste.
 */
const resolveTvaRateId = (rates: TvaRate[], raw: number | string | undefined | null): string => {
  if (raw === null || raw === undefined || raw === '') return '';
  const normalized = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
  if (!Number.isFinite(normalized)) return '';

  const byId = rates.find((rate) => rate.id === normalized);
  if (byId) return byId.id.toString();

  const byValue = rates.find((rate) => rate.value === normalized);
  return byValue ? byValue.id.toString() : '';
};

/**
 * Compteur de champs requis manquants sur un onglet. La saisie s'étale sur cinq
 * onglets : sans ce repère, un champ oublié reste invisible depuis l'onglet
 * courant.
 */
const TabErrorBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <span
      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
      aria-label={`${count} champ${count > 1 ? 's' : ''} requis manquant${count > 1 ? 's' : ''}`}
    >
      {count}
    </span>
  );
};

/** Message d'aide sous un champ requis resté vide. */
const RequiredFieldHint = ({ show, children }: { show: boolean; children: React.ReactNode }) => {
  if (!show) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{children}</p>;
};

const INVALID_FIELD_CLASS = 'border-destructive focus-visible:ring-destructive';

const TvaRateSelect = ({
  rates,
  value,
  onValueChange,
  invalid = false,
}: {
  rates: TvaRate[];
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
}) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className={cn('mt-1 h-9 text-sm', invalid && INVALID_FIELD_CLASS)}>
      <SelectValue placeholder="Sélectionner">
        {rates.find((rate) => rate.id.toString() === value)?.label}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {rates.map((rate) => (
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
);

export const SimpleProductSheet = ({
  productId,
  product: initialProduct = null,
  createMode = false,
  open,
  onOpenChange,
  units,
  components,
  attributes,
  categories,
  tags,
  allergens,
  onSave,
  onCreate,
  onDelete,
  onCreateCategory,
}: SimpleProductSheetProps) => {
  // Load product data if productId is provided
  const { product: loadedProduct, loading } = useProductData(productId || null, open);

  // Declare all state hooks FIRST before using them
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [displayedProduct, setDisplayedProduct] = useState<Product | null>(null);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false);
  const [tvaSelection, setTvaSelection] = useState({ in: '', takeAway: '', delivery: '' });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Price display values to prevent focus loss during input
  const [priceDisplayValues, setPriceDisplayValues] = useState<{
    price: string;
    price_take_away: string;
    price_delivery: string;
  }>({
    price: '',
    price_take_away: '',
    price_delivery: '',
  });

  // Prix/TVA par défaut : raccourcis de création qui répliquent une seule
  // saisie sur les 3 champs de l'onglet Tarif, plutôt que de forcer l'usager à
  // y remplir 6 champs quasi identiques. Purement locaux à la fiche, jamais
  // envoyés à l'API.
  const [defaultPriceDisplay, setDefaultPriceDisplay] = useState('');
  const [defaultTvaValue, setDefaultTvaValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { runWithDuplicateConfirm, duplicateDialogProps } = useDuplicateNameConfirm();
  const isMobile = useIsMobile();
  const { statuses } = useIntegrationStatus();
  const imagePreviewUrl = useObjectUrlPreview(selectedImageFile);
  
  // Use loaded product if available, otherwise use initial product prop.
  // createdProduct prend le relais dès que la création a abouti : la fiche
  // reste ouverte et se comporte alors comme une fiche produit normale.
  const baseProduct = loadedProduct || initialProduct || createdProduct;
  // La création n'est active que tant qu'aucun produit n'existe.
  const isCreateMode = createMode && !baseProduct;
  // Use displayedProduct for rendering (updated after save), fallback to baseProduct
  const product = displayedProduct || baseProduct || (isCreateMode ? DRAFT_PRODUCT : null);

  // Load sheet-specific data (TVA rates, tags, allergens, units)
  const { tvaRates, tags: loadedTags, allergens: loadedAllergens, units: loadedUnits } = useProductEditData(open);

  const findTvaRates = (deliveryType: string) =>
    tvaRates.find((group) => group.delivery_type === deliveryType)?.rates || [];
  const onSiteRates = findTvaRates('IN');
  const takeAwayRates = findTvaRates('TAKE_AWAY');
  const deliveryRates = findTvaRates('DELIVERY');
  
  // Use loaded data or props (props take priority for backward compatibility)
  const tagsData = tags || loadedTags;
  const allergensData = allergens || loadedAllergens;
  const unitsData = units.length > 0 ? units : loadedUnits;

  // Reset and update when baseProduct changes (e.g., switching to new product)
  useEffect(() => {
    if (baseProduct) {
      // Reset displayedProduct to show the fresh product data
      setDisplayedProduct(null);
      // Reset edit mode and form when switching products
      setIsEditMode(false);
      setFormData(buildFormDataFromProduct(baseProduct));
      // Initialize price display values
      setPriceDisplayValues({
        price: priceToDisplayValue(baseProduct.price),
        price_take_away: priceToDisplayValue(baseProduct.price_take_away),
        price_delivery: priceToDisplayValue(baseProduct.price_delivery),
      });
      setSelectedImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [baseProduct]);

  // Helper function to convert configuration attributes to ProductAttribute format
  const buildFormDataFromProduct = (prod: Product): Partial<Product> => {
    const configurationAttributes: ProductAttribute[] = [];
    // Check if configuration is an object with attributes property
    if (
      prod.configuration &&
      typeof prod.configuration === 'object' &&
      !Array.isArray(prod.configuration) &&
      'attributes' in prod.configuration &&
      Array.isArray(prod.configuration.attributes)
    ) {
      configurationAttributes.push(
        ...prod.configuration.attributes.map((attr: Attribute) => ({
          attribute_id: attr.id,
          options: attr.options
            ?.filter((opt) => {
              // Handle both AttributeOption and AttributeOptionDetail types
              const optWithSelected = opt as { selected?: boolean };
              return optWithSelected.selected;
            })
            .map((opt) => {
              // Get price from either extra_price (new format) or price (old format)
              const price = 'extra_price' in opt && opt.extra_price !== undefined ? opt.extra_price : ('price' in opt && opt.price !== undefined ? opt.price : 0);
              return {
                option_id: opt.id,
                price_override: price as number
              };
            }) || []
        }))
      );
    }

    return {
      ...prod,
      category_id: prod.category_id || prod.category,
      // Ensure composition is initialized (pre-fill with API data)
      components: prod.components || [],
      // Ensure attributes is initialized - use configuration attributes if available, fallback to attributes
      attributes: configurationAttributes.length > 0 
        ? configurationAttributes
        : (prod.attributes || []),
      // Normalize to string IDs in case the API returns full objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allergens: (prod.allergens || []).map((a: any) => typeof a === 'string' ? a : a?.allergen_id).filter(Boolean),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags: (prod.tags || []).map((t: any) => typeof t === 'string' ? t : t?.id).filter(Boolean),
    };
  };

  // Helper function to calculate food cost percentage and indicator color
  const getFoodCostIndicator = (product: Product) => {
    if (!product.cost_price || !product.price) {
      return { color: 'text-gray-400', percentage: null, label: 'N/A' };
    }

    // cost_price is the food cost, price is the selling price
    const foodCost = (product.cost_price / product.price) * 100;
    
    // Ideal range is 25-35%
    let color = 'text-orange-500'; // Default: outside ideal range
    if (foodCost >= 25 && foodCost <= 35) {
      color = 'text-green-600'; // Ideal range
    } else if (foodCost < 25) {
      color = 'text-blue-600'; // Too low (good margin)
    }

    return {
      color,
      percentage: foodCost.toFixed(1),
      label: `${foodCost.toFixed(1)}%`
    };
  };

  // TVA can now be provided directly as a float rate (5.5, 10, 20),
  // while keeping backward compatibility with legacy rate IDs.
  const getTvaRateValue = (tvaValueOrId: number | string | undefined): number | null => {
    if (tvaValueOrId === null || tvaValueOrId === undefined || tvaValueOrId === '') {
      return null;
    }

    const normalized = typeof tvaValueOrId === 'string'
      ? Number.parseFloat(tvaValueOrId)
      : tvaValueOrId;

    if (!Number.isFinite(normalized)) {
      return null;
    }

    for (const group of tvaRates) {
      const byId = group.rates.find((rate) => rate.id === normalized);
      if (byId) {
        return byId.value;
      }

      const byValue = group.rates.find((rate) => rate.value === normalized);
      if (byValue) {
        return byValue.value;
      }
    }

    return normalized;
  };

  useEffect(() => {
    // En création il n'y a pas de produit source : ce reset écraserait le
    // brouillon en cours de saisie et annulerait l'édition forcée.
    if (isCreateMode) return;
    if (product) {
      setFormData(buildFormDataFromProduct(product));
      setIsEditMode(false);
      setSelectedImageFile(null);
    }
  }, [product, isCreateMode]);

  // Ouverture en création : repartir d'un brouillon vierge. Sans ça la fiche
  // rouvrirait sur la saisie précédente — ou sur le produit créé juste avant,
  // puisqu'elle reste ouverte après une création réussie.
  useEffect(() => {
    if (!createMode || !open) return;
    setCreatedProduct(null);
    setDisplayedProduct(null);
    setIsEditMode(true);
    setActiveTab('general');
    setHasAttemptedCreate(false);
    setFormData({
      name: '',
      description: '',
      price: 0,
      price_take_away: 0,
      price_delivery: 0,
      category_id: '',
      status: 'available',
      available_in: true,
      available_take_away: true,
      available_delivery: true,
      is_available_on_sno: true,
      components: [],
      attributes: [],
      tags: [],
      allergens: [],
      // Explicites, pas undefined : les colonnes sync_* valent TRUE par défaut
      // en base, un produit créé sans y toucher ressortirait actif sur les
      // plateformes alors que les interrupteurs sont affichés éteints.
      integrations: {
        uber_eats: { enabled: false },
        deliveroo: { enabled: false },
      },
    });
    setPriceDisplayValues({ price: '', price_take_away: '', price_delivery: '' });
    setTvaSelection({ in: '', takeAway: '', delivery: '' });
    setDefaultPriceDisplay('');
    setDefaultTvaValue('');
    setSelectedImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [createMode, open]);

  // Les taux de TVA arrivent de façon asynchrone : on présélectionne le taux
  // du produit dès que la liste est disponible.
  useEffect(() => {
    if (isCreateMode || !baseProduct || tvaRates.length === 0) return;
    setTvaSelection({
      in: resolveTvaRateId(onSiteRates, baseProduct.tva_rate_in ?? baseProduct.tva_ids?.on_site),
      takeAway: resolveTvaRateId(takeAwayRates, baseProduct.tva_rate_take_away ?? baseProduct.tva_ids?.takeaway),
      delivery: resolveTvaRateId(deliveryRates, baseProduct.tva_rate_delivery ?? baseProduct.tva_ids?.delivery),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseProduct, tvaRates, isCreateMode]);

  const handleSave = async () => {
    if (!product) return;

    setIsUploadingImage(true);
    try {
      // Upload image first if it has changed
      if (selectedImageFile) {
        const result = await menuService.uploadProductImage(product.product_id, selectedImageFile);
        formData.image_url = result.photo_url;
      }

      // Build payload - keep all formData fields but ensure IDs-only arrays for specific fields
      const payloadData = { ...formData } as Partial<Product> & {
        tva_in_id?: string;
        tva_take_away_id?: string;
        tva_delivery_id?: string;
      };

      // La TVA est modifiable depuis la fiche : on ne l'envoie que si un taux
      // est sélectionné, l'API laissant le taux en place quand le champ est absent.
      if (tvaSelection.in) {
        payloadData.tva_in_id = tvaSelection.in;
      }
      if (tvaSelection.takeAway) {
        payloadData.tva_take_away_id = tvaSelection.takeAway;
      }
      if (tvaSelection.delivery) {
        payloadData.tva_delivery_id = tvaSelection.delivery;
      }

      // Ensure configuration only contains attribute IDs (strings)
      if (formData.attributes && formData.attributes.length > 0) {
        payloadData.configuration = formData.attributes.map(attr => attr.attribute_id);
      } else {
        payloadData.configuration = [];
      }
      
      // Ensure tags only contains IDs (strings)
      payloadData.tags = Array.isArray(formData.tags) 
        ? formData.tags.filter(tag => typeof tag === 'string')
        : [];
      
      // Ensure allergens only contains IDs (strings)
      payloadData.allergens = Array.isArray(formData.allergens)
        ? formData.allergens.filter(allergen => typeof allergen === 'string')
        : [];

      // Keep category fields aligned for backward/forward API compatibility.
      const selectedCategoryId =
        (typeof formData.category_id === 'string' && formData.category_id.trim() !== '')
          ? formData.category_id
          : (typeof formData.category === 'string' && formData.category.trim() !== '')
            ? formData.category
            : undefined;

      if (selectedCategoryId) {
        payloadData.category_id = selectedCategoryId;
        payloadData.category = selectedCategoryId;
      }

      // Save all product data
      await onSave(product.product_id, payloadData);

      // L'affichage en consultation lit les taux (tva_rate_*), alors que le
      // payload porte les identifiants : sans cette conversion la fiche
      // continuait d'afficher l'ancienne TVA jusqu'à sa réouverture.
      const savedTvaRates: Partial<Product> = {};
      const applySavedRate = (
        field: 'tva_rate_in' | 'tva_rate_take_away' | 'tva_rate_delivery',
        rates: TvaRate[],
        selectedId: string,
      ) => {
        if (!selectedId) return;
        const rate = rates.find((r) => r.id.toString() === selectedId);
        if (rate) {
          savedTvaRates[field] = rate.value;
        }
      };
      applySavedRate('tva_rate_in', onSiteRates, tvaSelection.in);
      applySavedRate('tva_rate_take_away', takeAwayRates, tvaSelection.takeAway);
      applySavedRate('tva_rate_delivery', deliveryRates, tvaSelection.delivery);

      // Update displayedProduct with saved data to show changes immediately in header
      setDisplayedProduct({
        ...product,
        ...payloadData,
        ...savedTvaRates
      } as Product);

      // Clear image state after successful save
      setSelectedImageFile(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setIsEditMode(false);

      toast({
        title: "Succès",
        description: "Le produit a été enregistré avec succès."
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer le produit.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Champs exigés par la création côté API, dans l'ordre des onglets. Le toast
  // dit ce qui manque, le badge sur l'onglet dit où — la saisie s'étalant sur
  // cinq onglets, un champ oublié serait sinon invisible depuis l'onglet courant.
  const missingCreateFields = useMemo(() => {
    const missing: { tab: string; message: string }[] = [];
    if (!formData.name?.trim()) {
      missing.push({ tab: 'general', message: 'Le nom du produit est requis.' });
    }
    if (!formData.category_id) {
      missing.push({ tab: 'general', message: 'La catégorie est requise.' });
    }
    if (!tvaSelection.in) {
      missing.push({ tab: 'price', message: 'La TVA sur place est requise.' });
    }
    if (!tvaSelection.takeAway) {
      missing.push({ tab: 'price', message: 'La TVA à emporter est requise.' });
    }
    if (!tvaSelection.delivery) {
      missing.push({ tab: 'price', message: 'La TVA livraison est requise.' });
    }
    return missing;
  }, [formData.name, formData.category_id, tvaSelection]);

  // Les badges n'apparaissent qu'après une première tentative : les afficher
  // dès l'ouverture reviendrait à signaler en rouge un formulaire encore vierge.
  const missingFieldsByTab = useMemo(() => {
    if (!isCreateMode || !hasAttemptedCreate) return {} as Record<string, number>;
    return missingCreateFields.reduce<Record<string, number>>((acc, field) => {
      acc[field.tab] = (acc[field.tab] || 0) + 1;
      return acc;
    }, {});
  }, [isCreateMode, hasAttemptedCreate, missingCreateFields]);

  // Le badge d'onglet indique où chercher, ces drapeaux marquent le champ exact.
  const showFieldErrors = isCreateMode && hasAttemptedCreate;
  const invalidName = showFieldErrors && !formData.name?.trim();
  const invalidCategory = showFieldErrors && !formData.category_id;
  const invalidTvaIn = showFieldErrors && !tvaSelection.in;
  const invalidTvaTakeAway = showFieldErrors && !tvaSelection.takeAway;
  const invalidTvaDelivery = showFieldErrors && !tvaSelection.delivery;

  const handleCreate = async () => {
    setHasAttemptedCreate(true);
    if (missingCreateFields.length > 0) {
      const [first] = missingCreateFields;
      setActiveTab(first.tab);
      toast({
        title: 'Champs manquants',
        description: missingCreateFields.length > 1
          ? `${first.message} (${missingCreateFields.length} champs requis à compléter)`
          : first.message,
        variant: 'destructive'
      });
      return;
    }
    if (!onCreate) return;

    // Requête figée : en cas de doublon de nom, la boîte de dialogue la rejoue
    // à l'identique — c'est ce que la confirmation côté API attend.
    const submitCreation = async () => {
      // Un seul appel : l'API persiste le produit et ses associations dans la
      // même transaction, donc pas de produit incomplet en cas d'échec.
      const created = await onCreate({
        name: formData.name!.trim(),
        description: formData.description || '',
        price: formData.price || 0,
        price_take_away: formData.price_take_away || 0,
        price_delivery: formData.price_delivery || 0,
        category_id: formData.category_id!,
        tva_in_id: tvaSelection.in,
        tva_take_away_id: tvaSelection.takeAway,
        tva_delivery_id: tvaSelection.delivery,
        available_in: formData.available_in ?? true,
        available_take_away: formData.available_take_away ?? true,
        available_delivery: formData.available_delivery ?? true,
        is_product_group: false,
        bg_color: formData.bg_color,
        production_color: formData.production_color || undefined,
        status: typeof formData.status === 'string' ? formData.status : undefined,
        is_available_on_sno: formData.is_available_on_sno,
        configuration: (formData.attributes || []).map((attr) => attr.attribute_id),
        components: formData.components || [],
        tags: (formData.tags || []).filter((tag): tag is string => typeof tag === 'string'),
        allergens: (formData.allergens || []).filter((allergen): allergen is string => typeof allergen === 'string'),
        // Toujours transmis : c'est l'absence du champ qui laisse les colonnes
        // sync_* à leur défaut TRUE côté API.
        integrations: {
          uber_eats: { enabled: false, ...formData.integrations?.uber_eats },
          deliveroo: { enabled: false, ...formData.integrations?.deliveroo },
        },
      });

      // La photo passe par un endpoint multipart distinct : elle ne peut être
      // envoyée qu'une fois le produit créé et son ID connu.
      let imageUrl = created.image_url;
      if (selectedImageFile) {
        const result = await menuService.uploadProductImage(created.product_id, selectedImageFile);
        imageUrl = result.photo_url;
        setSelectedImageFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      // La fiche reste ouverte et bascule sur le produit créé.
      setCreatedProduct({ ...created, image_url: imageUrl });
    };

    setIsUploadingImage(true);
    try {
      // Un doublon de nom ouvre la boîte de confirmation au lieu d'échouer ; le
      // formulaire reste tel quel, prêt à être rejoué ou corrigé.
      await runWithDuplicateConfirm(submitCreation);
    } catch (error) {
      // Autre erreur : apiClient a déjà affiché le message correspondant.
      console.error('Create failed:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Tags/allergènes : simples champs de formData au même titre que Catégorie
  // ou Statut, désormais — ils partent avec le reste du formulaire au clic sur
  // « Enregistrer »/« Créer le produit », plus de synchronisation instantanée
  // dédiée depuis qu'ils ne vivent plus dans un onglet séparé.
  const selectedTagIds = (formData.tags || []).filter((t): t is string => typeof t === 'string');
  const selectedAllergenIds = (formData.allergens || []).filter((a): a is string => typeof a === 'string');
  const handleTagsChange = (tagIds: string[]) => setFormData(prev => ({ ...prev, tags: tagIds }));
  const handleAllergensChange = (allergenIds: string[]) =>
    setFormData(prev => ({ ...prev, allergens: allergenIds }));

  // TVA par défaut (création uniquement) : les 3 groupes de taux (sur place,
  // emporter, livraison) portent des ID différents pour un même pourcentage.
  // On propose donc les pourcentages en commun aux 3 groupes, puis on résout
  // l'ID propre à chaque groupe au moment d'appliquer la sélection.
  const defaultTvaOptions = useMemo(() => {
    const byValue = new Map<number, TvaRate>();
    [...onSiteRates, ...takeAwayRates, ...deliveryRates].forEach((rate) => {
      if (!byValue.has(rate.value)) byValue.set(rate.value, rate);
    });
    return Array.from(byValue.values()).sort((a, b) => a.value - b.value);
  }, [onSiteRates, takeAwayRates, deliveryRates]);

  const handleDefaultPriceChange = (raw: string) => {
    setDefaultPriceDisplay(raw);
    const cents = parsePriceInput(raw);
    setFormData(prev => ({ ...prev, price: cents, price_take_away: cents, price_delivery: cents }));
    setPriceDisplayValues({ price: raw, price_take_away: raw, price_delivery: raw });
  };

  const handleDefaultPriceBlur = (raw: string) => {
    const formatted = priceToDisplayValue(parsePriceInput(raw));
    setDefaultPriceDisplay(formatted);
    setPriceDisplayValues({ price: formatted, price_take_away: formatted, price_delivery: formatted });
  };

  const handleDefaultTvaChange = (value: string) => {
    setDefaultTvaValue(value);
    const numericValue = Number.parseFloat(value);
    const matchIn = onSiteRates.find(r => r.value === numericValue);
    const matchTakeAway = takeAwayRates.find(r => r.value === numericValue);
    const matchDelivery = deliveryRates.find(r => r.value === numericValue);
    setTvaSelection({
      in: matchIn ? matchIn.id.toString() : '',
      takeAway: matchTakeAway ? matchTakeAway.id.toString() : '',
      delivery: matchDelivery ? matchDelivery.id.toString() : '',
    });
  };

  const handleCancel = () => {
    // En création rien n'est encore enregistré : annuler revient à fermer la
    // fiche (il n'y a aucun état antérieur sur lequel revenir).
    if (isCreateMode) {
      onOpenChange(false);
      return;
    }
    if (product) {
      setFormData(buildFormDataFromProduct(product));
      setIsEditMode(false);
      setSelectedImageFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  const handleDeleteProduct = async () => {
    if (!product) return;
    
    try {
      const response = await menuService.deleteProduct(product.product_id);
      
      // Vérifier que le statut est "success"
      if (response.status === 'success') {
        // Appeler le callback onDelete si fourni
        if (onDelete) {
          await onDelete(product.product_id);
        }
        
        onOpenChange(false);
        
        toast({
          title: "Succès",
          description: "Produit supprimé définitivement."
        });
      } else {
        throw new Error('La suppression a échoué: statut ' + response.status);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le produit.",
        variant: "destructive"
      });
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier JPG, PNG ou WebP.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5 MB max)
    const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: `La taille maximale autorisée est de 5 Mo. Votre fichier fait ${(file.size / 1024 / 1024).toFixed(2)} Mo.`,
        variant: "destructive"
      });
      return;
    }

    setSelectedImageFile(file);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  if (!product && !loading) return null;

  const onSiteTva = getTvaRateValue(product?.tva_rate_in ?? product?.tva_ids?.on_site);
  const takeawayTva = getTvaRateValue(product?.tva_rate_take_away ?? product?.tva_ids?.takeaway);
  const deliveryTva = getTvaRateValue(product?.tva_rate_delivery ?? product?.tva_ids?.delivery);

  const onSiteTvaLabel = onSiteTva !== null ? `${onSiteTva}%` : '—';
  const takeawayTvaLabel = takeawayTva !== null ? `${takeawayTva}%` : '—';
  const deliveryTvaLabel = deliveryTva !== null ? `${deliveryTva}%` : '—';

  // Mobile version with full-screen Dialog
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!h-screen !max-h-screen !w-screen !p-0 !gap-0 !rounded-none flex flex-col [&_button[aria-label='Close']]:hidden">
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-border flex-shrink-0">
            <div className="px-4 py-3 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-sm font-semibold flex-1 min-w-0 text-center truncate">
                {loading ? <Skeleton className="h-4 w-32" /> : (isCreateMode ? (formData.name || 'Nouveau produit') : (isEditMode ? (formData.name || 'Produit') : (product?.name || 'Produit')))}
              </h2>
              {!loading && !isEditMode && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsEditMode(true)}
                    title="Modifier le produit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                    title="Supprimer le produit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Edit Mode Action Buttons */}
            {!loading && isEditMode && (
              <div className="px-4 py-2 border-t border-border bg-muted/30 flex gap-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1 h-8 text-xs"
                  onClick={handleCancel}
                >
                  <X className="w-3 h-3 mr-1" />
                  Annuler
                </Button>
                <Button
                  className="flex-1 h-8 text-xs bg-gradient-primary"
                  onClick={isCreateMode ? handleCreate : handleSave}
                  disabled={isUploadingImage}
                >
                  <Save className="w-3 h-3 mr-1" />
                  {isCreateMode ? 'Créer le produit' : 'Enregistrer'}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">

            {loading ? (
              // Loading skeleton state
              <div className="space-y-6">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : product ? (
              // Loaded content
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
                {/* Onglets scrollables horizontalement sur mobile */}
                <ScrollArea className="w-full mb-4 border-b -mx-4 px-4">
                  <TabsList className="flex justify-start gap-1 p-0 border-0 h-auto bg-transparent w-max">
                    <TabsTrigger value="general" className="flex-shrink-0 rounded-none border-b-2 text-xs py-2">
                      Général
                      <TabErrorBadge count={missingFieldsByTab.general || 0} />
                    </TabsTrigger>
                    <TabsTrigger value="price" className="flex-shrink-0 rounded-none border-b-2 text-xs py-2">
                      Tarifs
                      <TabErrorBadge count={missingFieldsByTab.price || 0} />
                    </TabsTrigger>
                    <TabsTrigger value="composition" className="flex-shrink-0 rounded-none border-b-2 text-xs py-2">Composition</TabsTrigger>
                    <TabsTrigger value="options" className="flex-shrink-0 rounded-none border-b-2 text-xs py-2">Options</TabsTrigger>
                  </TabsList>
                </ScrollArea>

                <TabsContent value="general" className="space-y-3 mt-0">
                  {!isEditMode ? (
                    <>
                      {/* Mobile Product Image - Thumbnail size */}
                      <div className="w-full h-40 rounded-lg bg-white border border-border overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : product.bg_color ? (
                          <div 
                            className="w-full h-full" 
                            style={{ backgroundColor: product.bg_color }}
                          />
                        ) : (
                          <div className="text-muted-foreground">
                            <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Description</Label>
                        <p className="text-sm text-foreground leading-relaxed">
                          {product.description || '—'}
                        </p>
                      </div>

                      {/* Colors stacked vertically */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase">Couleur fond</Label>
                          <div className="mt-2 flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border border-border"
                              style={{ backgroundColor: product.bg_color || '#ffffff' }}
                            />
                            <span className="text-xs text-foreground font-mono">{product.bg_color || '—'}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase">Couleur production</Label>
                          <div className="mt-2 flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border border-border"
                              style={{ backgroundColor: product.production_color || '#ffffff' }}
                            />
                            <span className="text-xs text-foreground font-mono">{product.production_color || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Edit Mode - Mobile optimized */}
                      {/* Image Upload */}
                      <div 
                        className="cursor-pointer"
                        onClick={handleImageClick}
                      >
                        <div className="w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted/30 relative">
                          {isUploadingImage && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                            </div>
                          )}
                          {imagePreviewUrl ? (
                            <img 
                              src={imagePreviewUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          ) : formData.image_url ? (
                            <img 
                              src={formData.image_url} 
                              alt={formData.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center">
                              <ImageIcon className="w-8 h-8 mx-auto mb-1 text-muted-foreground/50" />
                              <p className="text-xs text-muted-foreground/70">Cliquer</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleImageSelect}
                        disabled={isUploadingImage}
                        className="hidden"
                      />

                      {/* Name */}
                      <div>
                        <Label className="text-xs">Nom du produit</Label>
                        <Input
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="ex. Pizza Margherita"
                          className={cn('mt-1 text-sm', invalidName && INVALID_FIELD_CLASS)}
                        />
                        <RequiredFieldHint show={invalidName}>Le nom du produit est requis.</RequiredFieldHint>
                      </div>

                      {/* Description */}
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Détails du produit..."
                          className="mt-1 resize-none text-sm"
                          rows={2}
                        />
                      </div>

                      {/* Catégorie */}
                      <div>
                        <Label className="text-xs">Catégorie</Label>
                        <CategorySelector
                          categories={categories}
                          value={formData.category_id || ''}
                          onValueChange={(categoryId) => setFormData({ ...formData, category_id: categoryId, category: categoryId })}
                          onCreateCategory={onCreateCategory}
                          className={cn('mt-1', invalidCategory && INVALID_FIELD_CLASS)}
                        />
                        <RequiredFieldHint show={invalidCategory}>La catégorie est requise.</RequiredFieldHint>
                      </div>

                      {/* Status */}
                      <div>
                        <Label className="text-xs">Statut</Label>
                        <Select 
                          value={String(formData.status || 'available')}
                          onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger className="mt-1 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Disponible</SelectItem>
                            <SelectItem value="out_of_stock">Hors stock</SelectItem>
                            <SelectItem value="not_available">Indisponible</SelectItem>
                            <SelectItem value="removed_from_menu">Retiré</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tags */}
                      <MultiSelectDropdown
                        label="Tags"
                        options={(tagsData ?? []).map((tag) => ({ id: tag.id, label: tag.name }))}
                        selectedIds={selectedTagIds}
                        onChange={handleTagsChange}
                        placeholder="Aucun tag"
                        triggerClassName="text-sm"
                      />

                      {/* Allergènes */}
                      <MultiSelectDropdown
                        label="Allergènes"
                        options={(allergensData ?? []).map((allergen) => ({ id: allergen.allergen_id, label: allergen.name }))}
                        selectedIds={selectedAllergenIds}
                        onChange={handleAllergensChange}
                        placeholder="Aucun allergène"
                        triggerClassName="text-sm"
                      />

                      {isCreateMode && (
                        <>
                          {/* Prix par défaut */}
                          <div>
                            <Label className="text-xs">Prix par défaut</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={defaultPriceDisplay}
                              onChange={(e) => handleDefaultPriceChange(e.target.value)}
                              onBlur={(e) => handleDefaultPriceBlur(e.target.value)}
                              placeholder="0,00"
                              className="mt-1 text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Applique le même prix sur place, à emporter et en livraison (modifiable ensuite dans l’onglet Tarifs).
                            </p>
                          </div>

                          {/* TVA par défaut */}
                          <div>
                            <Label className="text-xs">TVA par défaut</Label>
                            <Select value={defaultTvaValue} onValueChange={handleDefaultTvaChange}>
                              <SelectTrigger className="mt-1 text-sm">
                                <SelectValue placeholder="Sélectionner un taux" />
                              </SelectTrigger>
                              <SelectContent>
                                {defaultTvaOptions.map((rate) => (
                                  <SelectItem key={rate.value} value={rate.value.toString()}>
                                    {rate.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              Applique le même taux sur place, à emporter et en livraison (modifiable ensuite dans l’onglet Tarifs).
                            </p>
                          </div>
                        </>
                      )}

                      {/* Colors */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Couleur fond</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={formData.bg_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                              className="w-10 h-9 rounded cursor-pointer border border-input"
                            />
                            <Input
                              value={formData.bg_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Couleur production</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={formData.production_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, production_color: e.target.value })}
                              className="w-10 h-9 rounded cursor-pointer border border-input"
                            />
                            <Input
                              value={formData.production_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, production_color: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="price" className="space-y-3 mt-0">
                  {/* Mobile: Stack prices vertically */}
                  <div className="space-y-3">
                    {/* Sur Place */}
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          Sur Place
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {!isEditMode ? (
                          <>
                            <p className="text-muted-foreground">Prix: <span className="font-semibold text-foreground">{((product.price || 0) / 100).toFixed(2)} €</span></p>
                            <p className="text-muted-foreground">TVA: <span className="font-semibold text-foreground">{onSiteTvaLabel}</span></p>
                            <p className="text-muted-foreground">Disponible: <Badge variant={product.available_in ? "default" : "secondary"} className="ml-1 text-xs">{product.available_in ? '✓' : '✗'}</Badge></p>
                          </>
                        ) : (
                          <>
                            <div><Label>Prix (€)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={priceDisplayValues.price}
                              onChange={(e) => {
                                setPriceDisplayValues(prev => ({ ...prev, price: e.target.value }));
                                setFormData({ ...formData, price: parsePriceInput(e.target.value) });
                              }}
                              onBlur={(e) => {
                                const formatted = priceToDisplayValue(parsePriceInput(e.target.value));
                                setPriceDisplayValues(prev => ({ ...prev, price: formatted }));
                              }}
                              placeholder="0,00"
                              className="mt-1 h-8 text-xs"
                            /></div>
                            <div>
                              <Label>TVA</Label>
                              <TvaRateSelect
                                rates={onSiteRates}
                                value={tvaSelection.in}
                                onValueChange={(value) => setTvaSelection((prev) => ({ ...prev, in: value }))}
                                invalid={invalidTvaIn}
                              />
                              <RequiredFieldHint show={invalidTvaIn}>La TVA sur place est requise.</RequiredFieldHint>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Disponible</Label>
                              <Switch checked={formData.available_in || false} onCheckedChange={(checked) => setFormData({ ...formData, available_in: checked })} />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* À Emporter */}
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          Emporter
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {!isEditMode ? (
                          <>
                            <p className="text-muted-foreground">Prix: <span className="font-semibold text-foreground">{((product.price_take_away || 0) / 100).toFixed(2)} €</span></p>
                            <p className="text-muted-foreground">TVA: <span className="font-semibold text-foreground">{takeawayTvaLabel}</span></p>
                            <p className="text-muted-foreground">Disponible: <Badge variant={product.available_take_away ? "default" : "secondary"} className="ml-1 text-xs">{product.available_take_away ? '✓' : '✗'}</Badge></p>
                          </>
                        ) : (
                          <>
                            <div><Label>Prix (€)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={priceDisplayValues.price_take_away}
                              onChange={(e) => {
                                setPriceDisplayValues(prev => ({ ...prev, price_take_away: e.target.value }));
                                setFormData({ ...formData, price_take_away: parsePriceInput(e.target.value) });
                              }}
                              onBlur={(e) => {
                                const formatted = priceToDisplayValue(parsePriceInput(e.target.value));
                                setPriceDisplayValues(prev => ({ ...prev, price_take_away: formatted }));
                              }}
                              placeholder="0,00"
                              className="mt-1 h-8 text-xs"
                            /></div>
                            <div>
                              <Label>TVA</Label>
                              <TvaRateSelect
                                rates={takeAwayRates}
                                value={tvaSelection.takeAway}
                                onValueChange={(value) => setTvaSelection((prev) => ({ ...prev, takeAway: value }))}
                                invalid={invalidTvaTakeAway}
                              />
                              <RequiredFieldHint show={invalidTvaTakeAway}>La TVA à emporter est requise.</RequiredFieldHint>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Disponible</Label>
                              <Switch checked={formData.available_take_away || false} onCheckedChange={(checked) => setFormData({ ...formData, available_take_away: checked })} />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Livraison */}
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          Livraison
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {!isEditMode ? (
                          <>
                            <p className="text-muted-foreground">Prix: <span className="font-semibold text-foreground">{((product.price_delivery || 0) / 100).toFixed(2)} €</span></p>
                            <p className="text-muted-foreground">TVA: <span className="font-semibold text-foreground">{deliveryTvaLabel}</span></p>
                            <p className="text-muted-foreground">Disponible: <Badge variant={product.available_delivery ? "default" : "secondary"} className="ml-1 text-xs">{product.available_delivery ? '✓' : '✗'}</Badge></p>
                          </>
                        ) : (
                          <>
                            <div><Label>Prix (€)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={priceDisplayValues.price_delivery}
                              onChange={(e) => {
                                setPriceDisplayValues(prev => ({ ...prev, price_delivery: e.target.value }));
                                setFormData({ ...formData, price_delivery: parsePriceInput(e.target.value) });
                              }}
                              onBlur={(e) => {
                                const formatted = priceToDisplayValue(parsePriceInput(e.target.value));
                                setPriceDisplayValues(prev => ({ ...prev, price_delivery: formatted }));
                              }}
                              placeholder="0,00"
                              className="mt-1 h-8 text-xs"
                            /></div>
                            <div>
                              <Label>TVA</Label>
                              <TvaRateSelect
                                rates={deliveryRates}
                                value={tvaSelection.delivery}
                                onValueChange={(value) => setTvaSelection((prev) => ({ ...prev, delivery: value }))}
                                invalid={invalidTvaDelivery}
                              />
                              <RequiredFieldHint show={invalidTvaDelivery}>La TVA livraison est requise.</RequiredFieldHint>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Disponible</Label>
                              <Switch checked={formData.available_delivery || false} onCheckedChange={(checked) => setFormData({ ...formData, available_delivery: checked })} />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Integrations Section - Mobile optimized */}
                  <div className="space-y-3 pt-3">
                    <h3 className="font-semibold text-sm">Plateformes Externes</h3>
                    <div className="space-y-3">
                      {/* Uber Eats */}
                      {statuses.uberEats.active && (
                      <Card className="border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <img src="/uber_eats_logo.png" alt="Uber Eats" className="w-4 h-4 object-contain rounded" />
                            Uber Eats
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <Label>Actif</Label>
                            {isEditMode ? (
                              <Switch 
                                checked={formData.integrations?.uber_eats?.enabled || false} 
                                onCheckedChange={(checked) => setFormData({ ...formData, integrations: { ...formData.integrations, uber_eats: { ...(formData.integrations?.uber_eats || {}), enabled: checked } } })} 
                              />
                            ) : (
                              <Badge variant={product.integrations?.uber_eats?.enabled ? "default" : "secondary"} className="text-xs">
                                {product.integrations?.uber_eats?.enabled ? '✓' : '✗'}
                              </Badge>
                            )}
                          </div>
                          {(product.integrations?.uber_eats?.enabled || formData.integrations?.uber_eats?.enabled) && (
                            <div>
                              <Label>Prix (€)</Label>
                              {isEditMode ? (
                                <PriceInput 
                                  value={formData.integrations?.uber_eats?.price_override || 0}
                                  valueInCents
                                  onChange={(e) => setFormData({ ...formData, integrations: { ...formData.integrations, uber_eats: { ...(formData.integrations?.uber_eats || {}), price_override: parsePriceInput(e.target.value) } } })} 
                                  placeholder="0,00" 
                                  className="mt-1 h-8 text-xs" 
                                />
                              ) : (
                                <p className="mt-1 font-semibold">{((product.integrations?.uber_eats?.price_override || 0) / 100).toFixed(2)} €</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      )}

                      {/* Deliveroo */}
                      {statuses.deliveroo.active && (
                      <Card className="border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <img src="/deliveroo_logo.png" alt="Deliveroo" className="w-4 h-4 object-contain rounded" />
                            Deliveroo
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <Label>Actif</Label>
                            {isEditMode ? (
                              <Switch 
                                checked={formData.integrations?.deliveroo?.enabled || false} 
                                onCheckedChange={(checked) => setFormData({ ...formData, integrations: { ...formData.integrations, deliveroo: { ...(formData.integrations?.deliveroo || {}), enabled: checked } } })} 
                              />
                            ) : (
                              <Badge variant={product.integrations?.deliveroo?.enabled ? "default" : "secondary"} className="text-xs">
                                {product.integrations?.deliveroo?.enabled ? '✓' : '✗'}
                              </Badge>
                            )}
                          </div>
                          {(product.integrations?.deliveroo?.enabled || formData.integrations?.deliveroo?.enabled) && (
                            <div>
                              <Label>Prix (€)</Label>
                              {isEditMode ? (
                                <PriceInput 
                                  value={formData.integrations?.deliveroo?.price_override || 0}
                                  valueInCents
                                  onChange={(e) => setFormData({ ...formData, integrations: { ...formData.integrations, deliveroo: { ...(formData.integrations?.deliveroo || {}), price_override: parsePriceInput(e.target.value) } } })} 
                                  placeholder="0,00" 
                                  className="mt-1 h-8 text-xs" 
                                />
                              ) : (
                                <p className="mt-1 font-semibold">{((product.integrations?.deliveroo?.price_override || 0) / 100).toFixed(2)} €</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      )}

                      {/* ScanNOrder */}
                      <Card className="border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <img src="/scannorder_logo.png" alt="ScanNOrder" className="w-4 h-4 object-contain rounded" />
                            ScanNOrder
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <Label>Actif</Label>
                            {isEditMode ? (
                              <Switch 
                                checked={formData.is_available_on_sno || false} 
                                onCheckedChange={(checked) => setFormData({ ...formData, is_available_on_sno: checked })} 
                              />
                            ) : (
                              <Badge variant={product.is_available_on_sno ? "default" : "secondary"} className="text-xs">
                                {product.is_available_on_sno ? '✓' : '✗'}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="composition">
                  <ProductCompositionTab
                    composition={formData.components || []}
                    components={components}
                    units={units}
                    onChange={(composition) => setFormData({ ...formData, components: composition })}
                    disabled={!isEditMode}
                  />
                </TabsContent>

                <TabsContent value="options">
                  <ProductOptionsTab
                    productAttributes={formData.attributes || []}
                    availableAttributes={attributes}
                    onChange={(attributes) => setFormData({ ...formData, attributes })}
                    disabled={!isEditMode}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">Impossible de charger le produit</p>
              </div>
            )}

          </div>

          <DuplicateNameDialog {...duplicateDialogProps} />

          {/* Delete Product Dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous absolument sûr ? La suppression est définitive et irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive">Supprimer</AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

        </DialogContent>
      </Dialog>
    );
  }

  // Desktop version with Sheet (original layout)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
        {/* Professional Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border">
          <div className="px-6 py-4">
            {loading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {isCreateMode ? (formData.name || 'Nouveau produit') : (isEditMode ? (formData.name || 'Produit') : (product?.name || 'Produit'))}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {categories.find(
                        c => 
                        c.category_id === (isEditMode ? (formData.category_id || formData.category) : (product?.category_id || product?.category)))?.category_name || 'Catégorie non définie'}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      (isEditMode ? formData.status : product?.status) === 'available' ? 'default' : 
                      (isEditMode ? formData.status : product?.status) === 'removed_from_menu' ? 'destructive' : 
                      'secondary'
                    }
                    className="whitespace-nowrap"
                  >
                    {(isEditMode ? formData.status : product?.status) === 'available' ? 'Disponible' : ((isEditMode ? formData.status : product?.status) === 'out_of_stock' ? 'Hors stock' : ((isEditMode ? formData.status : product?.status) === 'removed_from_menu' ? 'Retiré' : 'Indisponible'))}
                  </Badge>
                </div>

                {/* Integration Badges and Action Buttons */}
                <div className="flex items-center justify-between gap-3 mt-3">
                  <div className="flex gap-2 flex-wrap">
                    {statuses.uberEats.active && product?.integrations?.uber_eats?.enabled && (
                      <Badge variant="default" className="text-xs">
                        <img src="/uber_eats_logo.png" alt="Uber Eats" className="w-3 h-3 mr-1 object-contain rounded" />
                        Uber Eats
                      </Badge>
                    )}
                    {statuses.deliveroo.active && product?.integrations?.deliveroo?.enabled && (
                      <Badge variant="default" className="text-xs">
                        <img src="/deliveroo_logo.png" alt="Deliveroo" className="w-3 h-3 mr-1 object-contain rounded" />
                        Deliveroo
                      </Badge>
                    )}
                    {product?.is_available_on_sno && (
                      <Badge variant="default" className="text-xs">
                        <img src="/scannorder_logo.png" alt="ScanNOrder" className="w-3 h-3 mr-1 object-contain rounded" />
                        ScanNOrder
                      </Badge>
                    )}
                  </div>
                  {!loading && !isEditMode && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditMode(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteDialog(true)}
                        title="Supprimer le produit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Cost Info */}
                {!isCreateMode && product?.cost_price && (
                  <div className="mt-3 p-2 bg-muted/50 rounded-md border border-muted-foreground/10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Prix reviens:</span>
                        <span className="ml-2 font-semibold text-foreground">{(product.cost_price / 100).toFixed(2)} €</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Marge FC:</span>
                        <span className={`ml-2 font-semibold ${getFoodCostIndicator(product).color}`}>
                          {getFoodCostIndicator(product).label}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Edit Mode Action Buttons */}
          {!loading && isEditMode && (
            <div className="px-6 py-3 border-t border-border bg-muted/30 flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button
                className="flex-1 bg-gradient-primary"
                onClick={isCreateMode ? handleCreate : handleSave}
                disabled={isUploadingImage}
              >
                <Save className="w-4 h-4 mr-2" />
                {isCreateMode ? 'Créer le produit' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

        {loading ? (
          // Loading skeleton state
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : product ? (
          // Loaded content
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
            {/* Onglets scrollables horizontalement sur mobile */}
            <ScrollArea className="w-full mb-6 border-b">
              <TabsList className={`w-full md:grid md:grid-cols-5 sticky top-0 bg-white ${isMobile ? 'flex justify-start gap-1 p-0 border-0 h-auto' : 'grid-cols-5'}`}>
                <TabsTrigger value="general" className={`${isMobile ? 'flex-shrink-0 rounded-none border-b-2 text-xs' : 'text-xs'}`}>
                  Général
                  <TabErrorBadge count={missingFieldsByTab.general || 0} />
                </TabsTrigger>
                <TabsTrigger value="price" className={`${isMobile ? 'flex-shrink-0 rounded-none border-b-2 text-xs' : 'text-xs'}`}>
                  Tarifs
                  <TabErrorBadge count={missingFieldsByTab.price || 0} />
                </TabsTrigger>
                <TabsTrigger value="composition" className={`${isMobile ? 'flex-shrink-0 rounded-none border-b-2 text-xs' : 'text-xs'}`}>Composition</TabsTrigger>
                <TabsTrigger value="options" className={`${isMobile ? 'flex-shrink-0 rounded-none border-b-2 text-xs' : 'text-xs'}`}>Options</TabsTrigger>
              </TabsList>
            </ScrollArea>

            <TabsContent value="general" className="space-y-5 mt-0">
              {!isEditMode ? (
                <>
                  {/* Product Image & Basic Info */}
                  <Card className="border-none bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex gap-5">
                        {/* Image */}
                        <div className="flex-shrink-0">
                          <div className="w-40 h-40 rounded-lg bg-white border border-border overflow-hidden flex items-center justify-center">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : product.bg_color ? (
                              <div 
                                className="w-full h-full" 
                                style={{ backgroundColor: product.bg_color }}
                              />
                            ) : (
                              <div className="text-muted-foreground">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Description</Label>
                            <p className="mt-1 text-sm text-foreground leading-relaxed">
                              {product.description || '—'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground uppercase">Couleur fond</Label>
                              <div className="mt-2 flex items-center gap-2">
                                <div 
                                  className="w-6 h-6 rounded border border-border"
                                  style={{ backgroundColor: product.bg_color || '#ffffff' }}
                                />
                                <span className="text-xs text-foreground font-mono">{product.bg_color || '—'}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground uppercase">Couleur production</Label>
                              <div className="mt-2 flex items-center gap-2">
                                <div 
                                  className="w-6 h-6 rounded border border-border"
                                  style={{ backgroundColor: product.production_color || '#ffffff' }}
                                />
                                <span className="text-xs text-foreground font-mono">{product.production_color || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* Edit Mode - General Tab */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex gap-5">
                        {/* Image Upload */}
                        <div 
                          className="flex-shrink-0 cursor-pointer"
                          onClick={handleImageClick}
                        >
                          <div className="w-40 h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted/30 relative">
                            {isUploadingImage && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                              </div>
                            )}
                            {imagePreviewUrl ? (
                              <img 
                                src={imagePreviewUrl} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : formData.image_url ? (
                              <img 
                                src={formData.image_url} 
                                alt={formData.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center">
                                <ImageIcon className="w-8 h-8 mx-auto mb-1 text-muted-foreground/50" />
                                <p className="text-xs text-muted-foreground/70">Cliquer</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Form Fields */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <Label>Nom du produit</Label>
                            <Input
                              value={formData.name || ''}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="ex. Pizza Margherita"
                              className={cn('mt-1', invalidName && INVALID_FIELD_CLASS)}
                            />
                            <RequiredFieldHint show={invalidName}>Le nom du produit est requis.</RequiredFieldHint>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={formData.description || ''}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Détails du produit..."
                              className="mt-1 resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleImageSelect}
                    disabled={isUploadingImage}
                    className="hidden"
                  />

                  {/* Metadata */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <Label>Catégorie</Label>
                          <CategorySelector
                            categories={categories}
                            value={formData.category_id || formData.category || ''}
                            onValueChange={(categoryId) => setFormData({ ...formData, category_id: categoryId, category: categoryId })}
                            onCreateCategory={onCreateCategory}
                            className={cn('mt-1', invalidCategory && INVALID_FIELD_CLASS)}
                          />
                          <RequiredFieldHint show={invalidCategory}>La catégorie est requise.</RequiredFieldHint>
                        </div>
                        <div>
                          <Label>Statut</Label>
                          <Select 
                            value={String(formData.status || 'available')}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Disponible</SelectItem>
                              <SelectItem value="out_of_stock">Hors stock</SelectItem>
                              <SelectItem value="not_available">Indisponible</SelectItem>
                              <SelectItem value="removed_from_menu">Retiré</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Tags</Label>
                          <MultiSelectDropdown
                            options={(tagsData ?? []).map((tag) => ({ id: tag.id, label: tag.name }))}
                            selectedIds={selectedTagIds}
                            onChange={handleTagsChange}
                            placeholder="Aucun tag"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Allergènes</Label>
                          <MultiSelectDropdown
                            options={(allergensData ?? []).map((allergen) => ({ id: allergen.allergen_id, label: allergen.name }))}
                            selectedIds={selectedAllergenIds}
                            onChange={handleAllergensChange}
                            placeholder="Aucun allergène"
                            className="mt-1"
                          />
                        </div>
                        {isCreateMode && (
                          <>
                            <div>
                              <Label>Prix par défaut</Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={defaultPriceDisplay}
                                onChange={(e) => handleDefaultPriceChange(e.target.value)}
                                onBlur={(e) => handleDefaultPriceBlur(e.target.value)}
                                placeholder="0,00"
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Applique le même prix sur place, à emporter et en livraison.
                              </p>
                            </div>
                            <div>
                              <Label>TVA par défaut</Label>
                              <Select value={defaultTvaValue} onValueChange={handleDefaultTvaChange}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Sélectionner un taux" />
                                </SelectTrigger>
                                <SelectContent>
                                  {defaultTvaOptions.map((rate) => (
                                    <SelectItem key={rate.value} value={rate.value.toString()}>
                                      {rate.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">
                                Applique le même taux sur place, à emporter et en livraison.
                              </p>
                            </div>
                          </>
                        )}
                        <div>
                          <Label>Couleur fond</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={formData.bg_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                              className="w-12 h-10 rounded cursor-pointer border border-input"
                            />
                            <Input
                              value={formData.bg_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                              className="font-mono text-sm flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Couleur production</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={formData.production_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, production_color: e.target.value })}
                              className="w-12 h-10 rounded cursor-pointer border border-input"
                            />
                            <Input
                              value={formData.production_color || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, production_color: e.target.value })}
                              className="font-mono text-sm flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

<TabsContent value="price" className="space-y-5 mt-0">
              {/* Base Pricing Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-foreground">Services de Livraison</h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* On-Site */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        Sur Place
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!isEditMode ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Prix</p>
                            <p className="text-lg font-semibold text-foreground">{((product.price || 0) / 100).toFixed(2)} €</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">TVA</p>
                            <p className="text-sm text-foreground">{onSiteTvaLabel}</p>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Disponible</p>
                            <Badge variant={product.available_in ? "default" : "secondary"} className="text-xs">
                              {product.available_in ? '✓ Oui' : '✗ Non'}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-xs">Prix (€)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={priceDisplayValues.price}
                              onChange={(e) => {
                                setPriceDisplayValues(prev => ({ ...prev, price: e.target.value }));
                                setFormData({ ...formData, price: parsePriceInput(e.target.value) });
                              }}
                              onBlur={(e) => {
                                const formatted = priceToDisplayValue(parsePriceInput(e.target.value));
                                setPriceDisplayValues(prev => ({ ...prev, price: formatted }));
                              }}
                              placeholder="0,00"
                              className="mt-1 text-sm font-semibold h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Taux TVA</Label>
                            <TvaRateSelect
                              rates={onSiteRates}
                              value={tvaSelection.in}
                              onValueChange={(value) => setTvaSelection((prev) => ({ ...prev, in: value }))}
                              invalid={invalidTvaIn}
                            />
                            <RequiredFieldHint show={invalidTvaIn}>Requise.</RequiredFieldHint>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <Label className="text-xs">Disponible</Label>
                            <Switch
                              checked={formData.available_in || false}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                available_in: checked
                              })}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Takeaway */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        Emporter
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!isEditMode ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Prix</p>
                            <p className="text-lg font-semibold text-foreground">{((product.price_take_away || 0) / 100).toFixed(2)} €</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">TVA</p>
                            <p className="text-sm text-foreground">{takeawayTvaLabel}</p>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Disponible</p>
                            <Badge variant={product.available_take_away ? "default" : "secondary"} className="text-xs">
                              {product.available_take_away ? '✓ Oui' : '✗ Non'}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-xs">Prix (€)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={priceDisplayValues.price_take_away}
                              onChange={(e) => {
                                setPriceDisplayValues(prev => ({ ...prev, price_take_away: e.target.value }));
                                setFormData({ ...formData, price_take_away: parsePriceInput(e.target.value) });
                              }}
                              onBlur={(e) => {
                                const formatted = priceToDisplayValue(parsePriceInput(e.target.value));
                                setPriceDisplayValues(prev => ({ ...prev, price_take_away: formatted }));
                              }}
                              placeholder="0,00"
                              className="mt-1 text-sm font-semibold h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Taux TVA</Label>
                            <TvaRateSelect
                              rates={takeAwayRates}
                              value={tvaSelection.takeAway}
                              onValueChange={(value) => setTvaSelection((prev) => ({ ...prev, takeAway: value }))}
                              invalid={invalidTvaTakeAway}
                            />
                            <RequiredFieldHint show={invalidTvaTakeAway}>Requise.</RequiredFieldHint>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <Label className="text-xs">Disponible</Label>
                            <Switch
                              checked={formData.available_take_away || false}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                available_take_away: checked
                              })}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delivery */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        Livraison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!isEditMode ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Prix</p>
                            <p className="text-lg font-semibold text-foreground">{((product.price_delivery || 0) / 100).toFixed(2)} €</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">TVA</p>
                            <p className="text-sm text-foreground">{deliveryTvaLabel}</p>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Disponible</p>
                            <Badge variant={product.available_delivery ? "default" : "secondary"} className="text-xs">
                              {product.available_delivery ? '✓ Oui' : '✗ Non'}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-xs">Prix (€)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={priceDisplayValues.price_delivery}
                              onChange={(e) => {
                                setPriceDisplayValues(prev => ({ ...prev, price_delivery: e.target.value }));
                                setFormData({ ...formData, price_delivery: parsePriceInput(e.target.value) });
                              }}
                              onBlur={(e) => {
                                const formatted = priceToDisplayValue(parsePriceInput(e.target.value));
                                setPriceDisplayValues(prev => ({ ...prev, price_delivery: formatted }));
                              }}
                              placeholder="0,00"
                              className="mt-1 text-sm font-semibold h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Taux TVA</Label>
                            <TvaRateSelect
                              rates={deliveryRates}
                              value={tvaSelection.delivery}
                              onValueChange={(value) => setTvaSelection((prev) => ({ ...prev, delivery: value }))}
                              invalid={invalidTvaDelivery}
                            />
                            <RequiredFieldHint show={invalidTvaDelivery}>Requise.</RequiredFieldHint>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <Label className="text-xs">Disponible</Label>
                            <Switch
                              checked={formData.available_delivery || false}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                available_delivery: checked
                              })}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Integrations Section */}
              <div className="space-y-3 pt-3">
                <h3 className="font-semibold text-sm text-foreground">Plateformes Externes</h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* Uber Eats */}
                  {statuses.uberEats.active && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <img src="/uber_eats_logo.png" alt="Uber Eats" className="w-5 h-5 object-contain rounded" />
                        Uber Eats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Actif</Label>
                        {isEditMode ? (
                          <Switch
                            checked={formData.integrations?.uber_eats?.enabled || false}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              integrations: {
                                ...formData.integrations,
                                uber_eats: {
                                  ...formData.integrations?.uber_eats,
                                  enabled: checked,
                                  id: formData.integrations?.uber_eats?.id || ''
                                }
                              }
                            })}
                          />
                        ) : (
                          <Badge variant={product.integrations?.uber_eats?.enabled ? "default" : "secondary"} className="text-xs">
                            {product.integrations?.uber_eats?.enabled ? '✓' : '✗'}
                          </Badge>
                        )}
                      </div>
                      {(product.integrations?.uber_eats?.enabled || formData.integrations?.uber_eats?.enabled) && (
                        <div>
                          <Label className="text-xs">Prix (€)</Label>
                          {isEditMode ? (
                            <PriceInput
                              value={formData.integrations?.uber_eats?.price_override || 0}
                              valueInCents
                              onChange={(e) => setFormData({
                                ...formData,
                                integrations: {
                                  ...formData.integrations,
                                  uber_eats: {
                                    ...(formData.integrations?.uber_eats || {}),
                                    price_override: parsePriceInput(e.target.value)
                                  }
                                }
                              })}
                              placeholder="0,00"
                              className="mt-1 text-sm font-semibold h-9"
                            />
                          ) : (
                            <p className="mt-1 text-sm font-semibold">{((product.integrations?.uber_eats?.price_override || 0) / 100).toFixed(2)} €</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  )}

                  {/* Deliveroo */}
                  {statuses.deliveroo.active && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <img src="/deliveroo_logo.png" alt="Deliveroo" className="w-5 h-5 object-contain rounded" />
                        Deliveroo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Actif</Label>
                        {isEditMode ? (
                          <Switch
                            checked={formData.integrations?.deliveroo?.enabled || false}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              integrations: {
                                ...formData.integrations,
                                deliveroo: {
                                  ...formData.integrations?.deliveroo,
                                  enabled: checked,
                                  id: formData.integrations?.deliveroo?.id || ''
                                }
                              }
                            })}
                          />
                        ) : (
                          <Badge variant={product.integrations?.deliveroo?.enabled ? "default" : "secondary"} className="text-xs">
                            {product.integrations?.deliveroo?.enabled ? '✓' : '✗'}
                          </Badge>
                        )}
                      </div>
                      {(product.integrations?.deliveroo?.enabled || formData.integrations?.deliveroo?.enabled) && (
                        <div>
                          <Label className="text-xs">Prix (€)</Label>
                          {isEditMode ? (
                            <PriceInput
                              value={formData.integrations?.deliveroo?.price_override || 0}
                              valueInCents
                              onChange={(e) => setFormData({
                                ...formData,
                                integrations: {
                                  ...formData.integrations,
                                  deliveroo: {
                                    ...(formData.integrations?.deliveroo || {}),
                                    price_override: parsePriceInput(e.target.value)
                                  }
                                }
                              })}
                              placeholder="0,00"
                              className="mt-1 text-sm font-semibold h-9"
                            />
                          ) : (
                            <p className="mt-1 text-sm font-semibold">{((product.integrations?.deliveroo?.price_override || 0) / 100).toFixed(2)} €</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  )}

                  {/* ScanNOrder */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <img src="/scannorder_logo.png" alt="ScanNOrder" className="w-5 h-5 object-contain rounded" />
                        ScanNOrder
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Actif</Label>
                        {isEditMode ? (
                          <Switch
                            checked={formData.is_available_on_sno || false}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              is_available_on_sno: checked
                            })}
                          />
                        ) : (
                          <Badge variant={product.is_available_on_sno ? "default" : "secondary"} className="text-xs">
                            {product.is_available_on_sno ? '✓' : '✗'}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
          </TabsContent>

          <TabsContent value="composition">
            <ProductCompositionTab
              composition={formData.components || []}
              components={components}
              units={units}
              onChange={(composition) => setFormData({ ...formData, components: composition })}
              disabled={!isEditMode}
            />
          </TabsContent>

          <TabsContent value="options">
            <ProductOptionsTab
              productAttributes={formData.attributes || []}
              availableAttributes={attributes}
              onChange={(attributes) => setFormData({ ...formData, attributes })}
              disabled={!isEditMode}
            />
          </TabsContent>
        </Tabs>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Impossible de charger le produit</p>
          </div>
        )}
        </div>

        <DuplicateNameDialog {...duplicateDialogProps} />

        {/* Delete Product Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous absolument sûr ? La suppression est définitive et irréversible. Le produit sera complètement supprimé du système.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProduct}
                className="bg-destructive"
              >
                Supprimer
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

      </SheetContent>
    </Sheet>
  );
};
