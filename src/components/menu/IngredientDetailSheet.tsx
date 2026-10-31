import { useState, useEffect, useCallback, useMemo } from 'react';
import { Component, ComponentCategory, UnitOfMeasure } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Save, X, Trash2, Loader2, Info, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decimalToDisplayValue, formatPrice, parseDecimalInput, parsePriceInput, priceToDisplayValue } from '@/utils/priceInputUtils';
import { findUnitById, getCompatibleUnits } from '@/utils/unitConversions';

interface IngredientDetailSheetProps {
  componentId?: string | null;
  component?: Component | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitOfMeasure[];
  /** Catégories disponibles pour reclasser l'ingrédient depuis la fiche. */
  categories?: ComponentCategory[];
  onSave: (componentId: string, data: Partial<Component>) => Promise<void>;
  onDelete?: (componentId: string) => Promise<void>;
}

const CONSERVATION_TYPE_OPTIONS = [
  { value: 'froid', label: 'Réfrigéré' },
  { value: 'congele', label: 'Congelé' },
  { value: 'sec', label: 'Sec' },
  { value: 'ambiant', label: 'Ambiant' },
];

const getUnitLabel = (unitId: string | number | undefined, units: UnitOfMeasure[]): string => {
  if (!unitId) return '—';
  return findUnitById(units, unitId)?.name || unitId.toString();
};

const getPurchaseUnitLabel = (component: Component, units: UnitOfMeasure[]): string => {
  if (component.purchase_unit_of_measure) return component.purchase_unit_of_measure;
  return getUnitLabel(component.purchase_unit_of_measure_id || component.purchase_unit_id, units);
};

const getPurchaseQuantityLabel = (component: Component, units: UnitOfMeasure[]): string => {
  const quantityLabel = decimalToDisplayValue(component.purchase_cost_qty);
  const purchaseUnitLabel = getPurchaseUnitLabel(component, units);
  const hasPurchaseUnit = purchaseUnitLabel !== '—';

  if (quantityLabel && hasPurchaseUnit) {
    return `${quantityLabel} ${purchaseUnitLabel}`;
  }

  if (quantityLabel) {
    return quantityLabel;
  }

  return hasPurchaseUnit ? purchaseUnitLabel : '—';
};

const getConservationTypeLabel = (value: string | undefined): string => {
  return CONSERVATION_TYPE_OPTIONS.find((option) => option.value === value)?.label || '—';
};

interface ActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  hasDelete: boolean;
  compact?: boolean;
}

/** Menu ⋮ de la fiche : mêmes entrées et même présentation que la fiche produit. */
const ActionsMenu = ({ onEdit, onDelete, hasDelete, compact = false }: ActionsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant={compact ? 'ghost' : 'outline'}
        size="icon"
        className={compact ? 'h-8 w-8' : ''}
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onEdit}>
        <Edit className="w-4 h-4 mr-2" />
        Modifier
      </DropdownMenuItem>
      {hasDelete && (
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

/**
 * Onglets de la fiche. Le conteneur <Tabs> vit dans la fiche (et non dans les
 * contenus lecture/édition) pour que l'onglet courant survive au passage
 * consultation <-> modification.
 */
const IngredientTabsList = ({ isMobile }: { isMobile: boolean }) => {
  const triggerClass = isMobile ? 'flex-shrink-0 rounded-none border-b-2 text-xs py-2' : 'text-xs';
  return (
    <ScrollArea className={isMobile ? 'w-full mb-4 border-b -mx-4 px-4' : 'w-full mb-6 border-b'}>
      <TabsList
        className={
          isMobile
            ? 'flex justify-start gap-1 p-0 border-0 h-auto bg-transparent w-max'
            : 'w-full grid grid-cols-3 sticky top-0 bg-white'
        }
      >
        <TabsTrigger value="general" className={triggerClass}>Général</TabsTrigger>
        <TabsTrigger value="pricing" className={triggerClass}>Prix & Achats</TabsTrigger>
        <TabsTrigger value="haccp" className={triggerClass}>Conservation</TabsTrigger>
      </TabsList>
    </ScrollArea>
  );
};

// View Content Component (declared outside to prevent remounting)
interface ViewContentProps {
  displayedComponent: Component;
  units: UnitOfMeasure[];
  categories: ComponentCategory[];
}

const ViewContent = ({ displayedComponent, units, categories }: ViewContentProps) => (
  <>
    <TabsContent value="general" className="mt-0 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nom</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{displayedComponent.name}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {categories.find(c => c.category_id === displayedComponent.category_id)?.category_name
              || displayedComponent.category
              || '—'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Unité de mesure de stockage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {getUnitLabel(displayedComponent.unit_of_measure_id || displayedComponent.unit_id, units)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Statut</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{displayedComponent.available ? 'Actif' : 'Inactif'}</p>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="pricing" className="mt-0 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Prix d'achat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg font-semibold">{formatPrice(displayedComponent.purchase_cost)}</p>
            <p className="text-sm text-muted-foreground">
              {getPurchaseQuantityLabel(displayedComponent, units)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Prix en supplément (client)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{formatPrice(displayedComponent.price)}</p>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="haccp" className="mt-0 space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Ces informations sont utilisées pour calculer les DLC secondaires sur les étiquettes HACCP
          imprimées depuis les tablettes.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Durée de conservation après ouverture</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {displayedComponent.conservation_days != null ? `${displayedComponent.conservation_days} jours` : '—'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Type de conservation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{getConservationTypeLabel(displayedComponent.conservation_type)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Température de stockage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {displayedComponent.storage_temp_min != null || displayedComponent.storage_temp_max != null
              ? `${displayedComponent.storage_temp_min ?? '—'}°C à ${displayedComponent.storage_temp_max ?? '—'}°C`
              : '—'}
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  </>
);

interface IngredientFormData extends Partial<Component> {
  conservation_days_display: string;
  storage_temp_min_display: string;
  storage_temp_max_display: string;
}

// Edit Content Component (declared outside to prevent remounting)
interface EditContentProps {
  formData: IngredientFormData;
  priceDisplayValues: { purchase_cost: string; price: string };
  purchaseCostQtyDisplayValue: string;
  units: UnitOfMeasure[];
  compatiblePurchaseUnits: UnitOfMeasure[];
  onNameChange: (value: string) => void;
  onPurchaseCostChange: (value: string) => void;
  onPurchaseCostBlur: (value: string) => void;
  onPurchaseUnitChange: (value: string) => void;
  onPurchaseCostQtyChange: (value: string) => void;
  onPurchaseCostQtyBlur: (value: string) => void;
  onSupplementPriceChange: (value: string) => void;
  onSupplementPriceBlur: (value: string) => void;
  onConservationDaysChange: (value: string) => void;
  onConservationTypeChange: (value: string) => void;
  onStorageTempMinChange: (value: string) => void;
  onStorageTempMaxChange: (value: string) => void;
  categories: ComponentCategory[];
  onCategoryChange: (value: string) => void;
}

const EditContent = ({
  formData,
  priceDisplayValues,
  purchaseCostQtyDisplayValue,
  compatiblePurchaseUnits,
  onNameChange,
  onPurchaseCostChange,
  onPurchaseCostBlur,
  onPurchaseUnitChange,
  onPurchaseCostQtyChange,
  onPurchaseCostQtyBlur,
  onSupplementPriceChange,
  onSupplementPriceBlur,
  onConservationDaysChange,
  onConservationTypeChange,
  onStorageTempMinChange,
  onStorageTempMaxChange,
  categories,
  onCategoryChange,
}: EditContentProps) => (
  <>
    <TabsContent value="general" className="mt-0 space-y-6">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">Identité</CardTitle>
          <CardDescription>Le nom affiché dans la liste ingrédients et les fiches produit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="ingredient-name" className="text-sm font-medium text-slate-700">
            Nom de l'ingrédient
          </Label>
          <Input
            id="ingredient-name"
            value={formData.name || ''}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="ex: Tomate"
            className="border-slate-200 bg-card"
          />

          <Label htmlFor="ingredient-category" className="text-sm font-medium text-slate-700">
            Catégorie
          </Label>
          <Select value={formData.category_id || ''} onValueChange={onCategoryChange}>
            <SelectTrigger id="ingredient-category" className="border-slate-200 bg-card">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((category) => category.category_id && category.category_id.trim() !== '')
                .map((category) => (
                  <SelectItem key={category.category_id} value={category.category_id}>
                    {category.category_name || category.category}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="pricing" className="mt-0 space-y-6">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">Approvisionnement</CardTitle>
          <CardDescription>Renseignez le coût d'achat, l'unité et la quantité de référence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purchase-cost" className="text-sm font-medium text-slate-700">
              Prix d'achat (€)
            </Label>
            <Input
              id="purchase-cost"
              type="text"
              inputMode="decimal"
              value={priceDisplayValues.purchase_cost}
              onChange={(e) => onPurchaseCostChange(e.target.value)}
              onBlur={(e) => onPurchaseCostBlur(e.target.value)}
              placeholder="0,00"
              className="border-slate-200 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase-unit" className="text-sm font-medium text-slate-700">
              Unité d'achat
            </Label>
            <Select
              value={formData.purchase_unit_id?.toString() || ''}
              onValueChange={onPurchaseUnitChange}
            >
              <SelectTrigger id="purchase-unit" className="border-slate-200 bg-card">
                <SelectValue placeholder="Sélectionner une unité" />
              </SelectTrigger>
              <SelectContent>
                {compatiblePurchaseUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase-cost-qty" className="text-sm font-medium text-slate-700">
              Quantité pour le coût d'achat
            </Label>
            <Input
              id="purchase-cost-qty"
              type="text"
              inputMode="decimal"
              placeholder="1 ou 0,5"
              value={purchaseCostQtyDisplayValue}
              onChange={(e) => onPurchaseCostQtyChange(e.target.value)}
              onBlur={(e) => onPurchaseCostQtyBlur(e.target.value)}
              className="border-slate-200 bg-card"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">Tarification client</CardTitle>
          <CardDescription>Prix appliqué lorsqu'un supplément ingrédient est facturé au client.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="supplement-price" className="text-sm font-medium text-slate-700">
            Prix en supplément (€)
          </Label>
          <Input
            id="supplement-price"
            type="text"
            inputMode="decimal"
            value={priceDisplayValues.price}
            onChange={(e) => onSupplementPriceChange(e.target.value)}
            onBlur={(e) => onSupplementPriceBlur(e.target.value)}
            placeholder="0,00"
            className="border-slate-200 bg-card"
          />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="haccp" className="mt-0 space-y-6">
      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Ces informations sont utilisées pour calculer les DLC secondaires sur les étiquettes HACCP
          imprimées depuis les tablettes.
        </p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">Conservation</CardTitle>
          <CardDescription>Durée et conditions de conservation après ouverture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conservation-days" className="text-sm font-medium text-slate-700">
              Durée de conservation après ouverture (jours)
            </Label>
            <Input
              id="conservation-days"
              type="number"
              min={0}
              placeholder="Ex: 3"
              value={formData.conservation_days_display}
              onChange={(e) => onConservationDaysChange(e.target.value)}
              className="border-slate-200 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conservation-type" className="text-sm font-medium text-slate-700">
              Type de conservation
            </Label>
            <Select
              value={formData.conservation_type || 'froid'}
              onValueChange={onConservationTypeChange}
            >
              <SelectTrigger id="conservation-type" className="border-slate-200 bg-card">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {CONSERVATION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storage-temp-min" className="text-sm font-medium text-slate-700">
                Température min (°C)
              </Label>
              <Input
                id="storage-temp-min"
                type="number"
                step="0.1"
                placeholder="0"
                value={formData.storage_temp_min_display}
                onChange={(e) => onStorageTempMinChange(e.target.value)}
                className="border-slate-200 bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage-temp-max" className="text-sm font-medium text-slate-700">
                Température max (°C)
              </Label>
              <Input
                id="storage-temp-max"
                type="number"
                step="0.1"
                placeholder="4"
                value={formData.storage_temp_max_display}
                onChange={(e) => onStorageTempMaxChange(e.target.value)}
                className="border-slate-200 bg-card"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

  </>
);

const buildFormData = (component: Component): IngredientFormData => ({
  name: component.name || '',
  category_id: component.category_id || '',
  purchase_cost: component.purchase_cost || 0,
  purchase_unit_id: (component.purchase_unit_of_measure_id ?? component.purchase_unit_id)?.toString() || '',
  price: component.price || 0,
  purchase_cost_qty: component.purchase_cost_qty ?? 1,
  conservation_days: component.conservation_days ?? null,
  conservation_type: component.conservation_type || 'froid',
  storage_temp_min: component.storage_temp_min ?? null,
  storage_temp_max: component.storage_temp_max ?? null,
  conservation_days_display: component.conservation_days != null ? component.conservation_days.toString() : '',
  storage_temp_min_display: component.storage_temp_min != null ? component.storage_temp_min.toString() : '',
  storage_temp_max_display: component.storage_temp_max != null ? component.storage_temp_max.toString() : '',
});

export const IngredientDetailSheet = ({
  componentId,
  component: initialComponent,
  open,
  onOpenChange,
  units,
  categories = [],
  onSave,
  onDelete,
}: IngredientDetailSheetProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
    category_id: '',
    purchase_cost: 0,
    purchase_unit_id: '',
    price: 0,
    purchase_cost_qty: 1,
    conservation_days: null,
    conservation_type: 'froid',
    storage_temp_min: null,
    storage_temp_max: null,
    conservation_days_display: '',
    storage_temp_min_display: '',
    storage_temp_max_display: '',
  });

  // Store display values separately to prevent focus loss on recalculation
  const [priceDisplayValues, setPriceDisplayValues] = useState<{
    purchase_cost: string;
    price: string;
  }>({
    purchase_cost: '',
    price: '',
  });
  const [purchaseCostQtyDisplayValue, setPurchaseCostQtyDisplayValue] = useState('');

  const [displayedComponent, setDisplayedComponent] = useState<Component | null>(null);

  const compatiblePurchaseUnits = useMemo(() => {
    const validUnits = units.filter((unit) => unit.id && unit.id.toString().trim() !== '');
    if (!displayedComponent) return validUnits;

    const storageUnitId = displayedComponent.unit_of_measure_id || displayedComponent.unit_id;
    const currentPurchaseUnitId = formData.purchase_unit_id?.toString();
    const filteredUnits = getCompatibleUnits(storageUnitId, validUnits);

    if (filteredUnits.length === 0) return validUnits;

    if (!currentPurchaseUnitId) return filteredUnits;

    const currentPurchaseUnit = validUnits.find(
      (unit) => unit.id.toString() === currentPurchaseUnitId
    );

    if (!currentPurchaseUnit) return filteredUnits;

    return filteredUnits.some((unit) => unit.id.toString() === currentPurchaseUnitId)
      ? filteredUnits
      : [...filteredUnits, currentPurchaseUnit];
  }, [displayedComponent, formData.purchase_unit_id, units]);

  // Initialize form when component opens or initialComponent changes
  useEffect(() => {
    if (open && initialComponent) {
      setDisplayedComponent(initialComponent);
      setFormData(buildFormData(initialComponent));
      setPriceDisplayValues({
        purchase_cost: priceToDisplayValue(initialComponent.purchase_cost),
        price: priceToDisplayValue(initialComponent.price),
      });
      setPurchaseCostQtyDisplayValue(decimalToDisplayValue(initialComponent.purchase_cost_qty ?? 1));
      // Reset to view mode when opening
      setIsEditMode(false);
      setActiveTab('general');
    }
  }, [open, initialComponent]);

  const handleSave = useCallback(async () => {
    if (!componentId || !displayedComponent) return;

    setIsSaving(true);
    try {
      const { conservation_days_display, storage_temp_min_display, storage_temp_max_display, ...dataToSave } = formData;
      await onSave(componentId, dataToSave);
      toast({
        title: 'Succès',
        description: 'Ingrédient mis à jour avec succès',
      });
      setIsEditMode(false);
      // La consultation lit le libellé de l'unité d'achat, alors que le
      // formulaire ne porte que son identifiant : sans cette conversion la
      // fiche affichait l'ancienne unité jusqu'à sa réouverture.
      const purchaseUnit = units.find((u) => u.id.toString() === dataToSave.purchase_unit_id?.toString());
      const savedCategory = categories.find((c) => c.category_id === dataToSave.category_id);
      setDisplayedComponent(prev => prev ? {
        ...prev,
        ...dataToSave,
        ...(purchaseUnit && {
          purchase_unit_of_measure: purchaseUnit.name,
          purchase_unit_of_measure_id: purchaseUnit.id.toString(),
        }),
        ...(savedCategory && { category: savedCategory.category_name || savedCategory.category }),
      } : null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de sauvegarder l\'ingrédient',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [componentId, displayedComponent, formData, onSave, toast, units, categories]);

  const handleDelete = useCallback(async () => {
    if (!componentId) return;

    setIsDeleting(true);
    try {
      await onDelete?.(componentId);
      toast({
        title: 'Succès',
        description: 'Ingrédient supprimé avec succès',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer l\'ingrédient',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [componentId, onDelete, toast, onOpenChange]);

  const handleCancel = useCallback(() => {
    setIsEditMode(false);
    // displayedComponent porte les dernières valeurs enregistrées ; le prop
    // initial, lui, n'est pas rafraîchi tant que la fiche reste ouverte.
    const source = displayedComponent ?? initialComponent;
    if (source) {
      setFormData(buildFormData(source));
      setPriceDisplayValues({
        purchase_cost: priceToDisplayValue(source.purchase_cost),
        price: priceToDisplayValue(source.price),
      });
      setPurchaseCostQtyDisplayValue(decimalToDisplayValue(source.purchase_cost_qty ?? 1));
    }
  }, [displayedComponent, initialComponent]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, category_id: value }));
  }, []);

  const handlePurchaseCostChange = useCallback((displayValue: string) => {
    setPriceDisplayValues(prev => ({ ...prev, purchase_cost: displayValue }));
    setFormData(prev => ({
      ...prev,
      purchase_cost: parsePriceInput(displayValue)
    }));
  }, []);

  const handlePurchaseCostBlur = useCallback((displayValue: string) => {
    const formatted = priceToDisplayValue(parsePriceInput(displayValue));
    setPriceDisplayValues(prev => ({ ...prev, purchase_cost: formatted }));
  }, []);

  const handlePurchaseUnitChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, purchase_unit_id: value }));
  }, []);

  const handlePurchaseCostQtyChange = useCallback((displayValue: string) => {
    setPurchaseCostQtyDisplayValue(displayValue);
    setFormData(prev => ({ ...prev, purchase_cost_qty: parseDecimalInput(displayValue) }));
  }, []);

  const handlePurchaseCostQtyBlur = useCallback((displayValue: string) => {
    setPurchaseCostQtyDisplayValue(decimalToDisplayValue(parseDecimalInput(displayValue)));
  }, []);

  const handleSupplementPriceChange = useCallback((displayValue: string) => {
    setPriceDisplayValues(prev => ({ ...prev, price: displayValue }));
    setFormData(prev => ({
      ...prev,
      price: parsePriceInput(displayValue)
    }));
  }, []);

  const handleSupplementPriceBlur = useCallback((displayValue: string) => {
    const formatted = priceToDisplayValue(parsePriceInput(displayValue));
    setPriceDisplayValues(prev => ({ ...prev, price: formatted }));
  }, []);

  const handleConservationDaysChange = useCallback((displayValue: string) => {
    setFormData(prev => ({
      ...prev,
      conservation_days_display: displayValue,
      conservation_days: displayValue === '' ? null : Number(displayValue),
    }));
  }, []);

  const handleConservationTypeChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, conservation_type: value }));
  }, []);

  const handleStorageTempMinChange = useCallback((displayValue: string) => {
    setFormData(prev => ({
      ...prev,
      storage_temp_min_display: displayValue,
      storage_temp_min: displayValue === '' ? null : Number(displayValue),
    }));
  }, []);

  const handleStorageTempMaxChange = useCallback((displayValue: string) => {
    setFormData(prev => ({
      ...prev,
      storage_temp_max_display: displayValue,
      storage_temp_max: displayValue === '' ? null : Number(displayValue),
    }));
  }, []);

  // Memoized content to prevent unnecessary re-renders
  const content = useMemo(
    () => {
      if (!displayedComponent) return null;

      return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
          <IngredientTabsList isMobile={isMobile} />
          {isEditMode ? (
            <EditContent
              formData={formData}
              priceDisplayValues={priceDisplayValues}
              purchaseCostQtyDisplayValue={purchaseCostQtyDisplayValue}
              units={units}
              compatiblePurchaseUnits={compatiblePurchaseUnits}
              onNameChange={handleNameChange}
              onPurchaseCostChange={handlePurchaseCostChange}
              onPurchaseCostBlur={handlePurchaseCostBlur}
              onPurchaseUnitChange={handlePurchaseUnitChange}
              onPurchaseCostQtyChange={handlePurchaseCostQtyChange}
              onPurchaseCostQtyBlur={handlePurchaseCostQtyBlur}
              onSupplementPriceChange={handleSupplementPriceChange}
              onSupplementPriceBlur={handleSupplementPriceBlur}
              onConservationDaysChange={handleConservationDaysChange}
              onConservationTypeChange={handleConservationTypeChange}
              onStorageTempMinChange={handleStorageTempMinChange}
              onStorageTempMaxChange={handleStorageTempMaxChange}
              categories={categories}
              onCategoryChange={handleCategoryChange}
            />
          ) : (
            <ViewContent
              displayedComponent={displayedComponent}
              units={units}
              categories={categories}
            />
          )}
        </Tabs>
      );
    },
    [
      activeTab,
      isMobile,
      isEditMode,
      displayedComponent,
      formData,
      priceDisplayValues,
      purchaseCostQtyDisplayValue,
      units,
      compatiblePurchaseUnits,
      categories,
      handleNameChange,
      handleCategoryChange,
      handlePurchaseCostChange,
      handlePurchaseCostBlur,
      handlePurchaseUnitChange,
      handlePurchaseCostQtyChange,
      handlePurchaseCostQtyBlur,
      handleSupplementPriceChange,
      handleSupplementPriceBlur,
      handleConservationDaysChange,
      handleConservationTypeChange,
      handleStorageTempMinChange,
      handleStorageTempMaxChange,
    ]
  );

  if (!displayedComponent) {
    return null;
  }

  // En édition, l'en-tête suit la saisie (comme la fiche produit).
  const headerName = isEditMode ? (formData.name || 'Ingrédient') : displayedComponent.name;
  const headerCategoryId = isEditMode ? formData.category_id : displayedComponent.category_id;
  const headerCategory =
    categories.find((c) => c.category_id === headerCategoryId)?.category_name
    || (!isEditMode ? displayedComponent.category : undefined)
    || 'Catégorie non définie';

  const iconClass = isMobile ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-2';
  const editActionBar = isEditMode && (
    <>
      <Button
        variant="outline"
        className={isMobile ? 'flex-1 h-8 text-xs' : 'flex-1'}
        onClick={handleCancel}
        disabled={isSaving}
      >
        <X className={iconClass} />
        Annuler
      </Button>
      <Button
        className={`flex-1 bg-gradient-primary ${isMobile ? 'h-8 text-xs' : ''}`}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? <Loader2 className={`animate-spin ${iconClass}`} /> : <Save className={iconClass} />}
        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </>
  );

  const deleteDialog = (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l'ingrédient</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer "{displayedComponent.name}" ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2 justify-end">
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer'
            )}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Mobile : Dialog plein écran
  if (isMobile) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="w-full h-dvh max-h-dvh max-w-full rounded-none flex flex-col gap-0 p-0 [&>button]:hidden">
            <div className="sticky top-0 z-10 bg-white border-b border-border flex-shrink-0">
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8" title="Fermer">
                  <X className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-sm font-semibold flex-1 min-w-0 text-center truncate">
                  {headerName}
                </DialogTitle>
                {!isEditMode ? (
                  <ActionsMenu
                    onEdit={() => setIsEditMode(true)}
                    onDelete={() => setShowDeleteDialog(true)}
                    hasDelete={!!onDelete}
                    compact
                  />
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
              </div>
              <DialogDescription className="sr-only">
                Fiche de l'ingrédient {displayedComponent.name}
              </DialogDescription>

              {isEditMode && (
                <div className="px-4 py-2 border-t border-border bg-muted/30 flex gap-2 flex-shrink-0">
                  {editActionBar}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
              {content}
            </div>
          </DialogContent>
        </Dialog>

        {deleteDialog}
      </>
    );
  }

  // Desktop : Side Sheet
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
          <div className="sticky top-0 z-10 bg-white border-b border-border">
            <div className="px-6 py-4">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg font-bold truncate">{headerName}</SheetTitle>
                  <SheetDescription className="mt-1">{headerCategory}</SheetDescription>
                </div>
                <Badge
                  variant={displayedComponent.available === false ? 'secondary' : 'default'}
                  className="whitespace-nowrap"
                >
                  {displayedComponent.available === false ? 'Inactif' : 'Actif'}
                </Badge>
              </div>

              {!isEditMode && (
                <div className="flex justify-end mt-3">
                  <ActionsMenu
                    onEdit={() => setIsEditMode(true)}
                    onDelete={() => setShowDeleteDialog(true)}
                    hasDelete={!!onDelete}
                  />
                </div>
              )}
            </div>

            {isEditMode && (
              <div className="px-6 py-3 border-t border-border bg-muted/30 flex gap-2">
                {editActionBar}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {content}
          </div>
        </SheetContent>
      </Sheet>

      {deleteDialog}
    </>
  );
};
