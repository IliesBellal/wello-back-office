import { useState, useEffect, useCallback, useMemo } from 'react';
import { Component, UnitOfMeasure } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Edit, Save, X, Trash2, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { decimalToDisplayValue, formatPrice, parseDecimalInput, parsePriceInput, priceToDisplayValue } from '@/utils/priceInputUtils';
import { findUnitById, getCompatibleUnits } from '@/utils/unitConversions';

interface IngredientDetailSheetProps {
  componentId?: string | null;
  component?: Component | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitOfMeasure[];
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

interface DetailViewActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  hasDelete: boolean;
  compact?: boolean;
}

const DetailViewActions = ({ onEdit, onDelete, hasDelete, compact = false }: DetailViewActionsProps) => (
  <div className="flex items-center gap-1">
    <Button
      onClick={onEdit}
      variant={compact ? 'ghost' : 'outline'}
      size={compact ? 'icon' : 'sm'}
      className={compact ? 'h-8 w-8' : ''}
      title="Modifier l'ingrédient"
    >
      <Edit className={`w-4 h-4 ${compact ? '' : 'mr-2'}`} />
      {!compact && 'Modifier'}
    </Button>
    {hasDelete && (
      <Button
        onClick={onDelete}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
        title="Supprimer l'ingrédient"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    )}
  </div>
);

// View Content Component (declared outside to prevent remounting)
interface ViewContentProps {
  displayedComponent: Component;
  units: UnitOfMeasure[];
}

const ViewContent = ({ displayedComponent, units }: ViewContentProps) => (
  <Tabs defaultValue="general" className="w-full">
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="general">Général</TabsTrigger>
      <TabsTrigger value="pricing">Prix & Achats</TabsTrigger>
      <TabsTrigger value="haccp">Conservation</TabsTrigger>
    </TabsList>

    <TabsContent value="general" className="mt-4 space-y-4">
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
          <p className="text-lg font-semibold">{displayedComponent.category || '—'}</p>
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

    <TabsContent value="pricing" className="mt-4 space-y-4">
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

    <TabsContent value="haccp" className="mt-4 space-y-4">
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
  </Tabs>
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
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
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
  onSave,
  onCancel,
  isSaving,
}: EditContentProps) => (
  <Tabs defaultValue="general" className="w-full">
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="general">Général</TabsTrigger>
      <TabsTrigger value="pricing">Prix & Achats</TabsTrigger>
      <TabsTrigger value="haccp">Conservation</TabsTrigger>
    </TabsList>

    <TabsContent value="general" className="mt-4 space-y-6">
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
            className="border-slate-200 bg-slate-50 focus:bg-white"
          />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="pricing" className="mt-4 space-y-6">
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
              className="border-slate-200 bg-slate-50 focus:bg-white"
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
              <SelectTrigger id="purchase-unit" className="border-slate-200 bg-slate-50 focus:bg-white">
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
              className="border-slate-200 bg-slate-50 focus:bg-white"
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
            className="border-slate-200 bg-slate-50 focus:bg-white"
          />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="haccp" className="mt-4 space-y-6">
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
              className="border-slate-200 bg-slate-50 focus:bg-white"
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
              <SelectTrigger id="conservation-type" className="border-slate-200 bg-slate-50 focus:bg-white">
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
                className="border-slate-200 bg-slate-50 focus:bg-white"
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
                className="border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex gap-2 pt-6">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isSaving}
          variant="outline"
          className="flex-1 border-slate-200 bg-white hover:bg-slate-50"
        >
          Annuler
        </Button>
      </CardContent>
    </Card>
  </Tabs>
);

const buildFormData = (component: Component): IngredientFormData => ({
  name: component.name || '',
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
  onSave,
  onDelete,
}: IngredientDetailSheetProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
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
      setDisplayedComponent(prev => prev ? { ...prev, ...dataToSave } : null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de sauvegarder l\'ingrédient',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [componentId, displayedComponent, formData, onSave, toast]);

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
    if (initialComponent) {
      setFormData(buildFormData(initialComponent));
      setPriceDisplayValues({
        purchase_cost: priceToDisplayValue(initialComponent.purchase_cost),
        price: priceToDisplayValue(initialComponent.price),
      });
      setPurchaseCostQtyDisplayValue(decimalToDisplayValue(initialComponent.purchase_cost_qty ?? 1));
    }
  }, [initialComponent]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
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

      return isEditMode ? (
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
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      ) : (
        <ViewContent
          displayedComponent={displayedComponent}
          units={units}
        />
      );
    },
    [
      isEditMode,
      displayedComponent,
      formData,
      priceDisplayValues,
      purchaseCostQtyDisplayValue,
      units,
      compatiblePurchaseUnits,
      isSaving,
      handleNameChange,
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
      handleSave,
      handleCancel,
    ]
  );

  if (!displayedComponent) {
    return null;
  }

  // Desktop: Side Sheet
  if (!isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="sm:max-w-md [&>button]:hidden">
            <SheetHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <SheetTitle className="min-w-0 flex-1 truncate">
                  {isEditMode ? "Modifier l'ingrédient" : displayedComponent.name}
                </SheetTitle>
                {!isEditMode && (
                  <DetailViewActions
                    onEdit={() => setIsEditMode(true)}
                    onDelete={() => setShowDeleteDialog(true)}
                    hasDelete={!!onDelete}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 flex-shrink-0"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {isEditMode && (
                <SheetDescription className="pr-10">
                  Ajustez les informations principales avec la même structure que la vue détail.
                </SheetDescription>
              )}
            </SheetHeader>
            <div className="mt-6 overflow-y-auto max-h-[calc(100vh-120px)]">
              {content}
            </div>
          </SheetContent>
        </Sheet>

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
      </>
    );
  }

  // Mobile: Full-Screen Dialog
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full rounded-none flex flex-col gap-0 p-0 [&>button]:hidden">
          {/* Fixed Header */}
          <DialogHeader className="border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
              <DialogTitle className="text-center flex-1">
                {isEditMode ? "Modifier l'ingrédient" : displayedComponent.name}
              </DialogTitle>
              {!isEditMode ? (
                <DetailViewActions
                  onEdit={() => setIsEditMode(true)}
                  onDelete={() => setShowDeleteDialog(true)}
                  hasDelete={!!onDelete}
                  compact
                />
              ) : (
                <div className="w-8 flex-shrink-0" />
              )}
            </div>
            {isEditMode && (
              <DialogDescription className="px-10 text-center">
                Ajustez les informations principales avec la même structure que la vue détail.
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {content}
          </div>

          {/* Fixed Footer with Save Button */}
          {isEditMode && (
            <div className="border-t px-6 py-4 flex-shrink-0 bg-background">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </>
  );
};
