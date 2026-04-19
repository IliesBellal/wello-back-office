import { useState, useEffect, useCallback, useMemo } from 'react';
import { Component, UnitOfMeasure } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Save, X, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, parsePriceInput, priceToDisplayValue } from '@/utils/priceInputUtils';

interface IngredientDetailSheetProps {
  componentId?: string | null;
  component?: Component | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitOfMeasure[];
  onSave: (componentId: string, data: Partial<Component>) => Promise<void>;
  onDelete?: (componentId: string) => Promise<void>;
}

const getUnitLabel = (unitId: string | number | undefined, units: UnitOfMeasure[]): string => {
  if (!unitId) return '—';
  return units.find(u => u.id === unitId || u.id.toString() === unitId.toString())?.name || unitId.toString();
};

// View Content Component (declared outside to prevent remounting)
interface ViewContentProps {
  displayedComponent: Component;
  units: UnitOfMeasure[];
  onEdit: () => void;
  onDelete: () => void;
  hasDelete: boolean;
}

const ViewContent = ({ displayedComponent, units, onEdit, onDelete, hasDelete }: ViewContentProps) => (
  <div className="space-y-6">
    {/* Header with Title */}
    <div className="border-b pb-4">
      <h2 className="text-2xl font-bold text-foreground">{displayedComponent.name}</h2>
    </div>

    {/* Main Info Cards */}
    <div className="grid grid-cols-1 gap-4">
      {/* Storage Unit */}
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

      {/* Purchase Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Prix d'achat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg font-semibold">{formatPrice(displayedComponent.purchase_cost)}</p>
            <p className="text-sm text-muted-foreground">
              Unité : {getUnitLabel(displayedComponent.purchase_unit_id, units)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Supplement Price */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Prix en supplément (client)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{formatPrice(displayedComponent.price)}</p>
        </CardContent>
      </Card>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 pt-4">
      <Button
        onClick={onEdit}
        className="flex-1"
        variant="default"
      >
        <Edit className="w-4 h-4 mr-2" />
        Modifier
      </Button>
      {hasDelete && (
        <Button
          onClick={onDelete}
          variant="outline"
          size="icon"
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  </div>
);

// Edit Content Component (declared outside to prevent remounting)
interface EditContentProps {
  formData: Partial<Component>;
  priceDisplayValues: { purchase_cost: string; price: string };
  units: UnitOfMeasure[];
  onNameChange: (value: string) => void;
  onPurchaseCostChange: (value: string) => void;
  onPurchaseCostBlur: (value: string) => void;
  onPurchaseUnitChange: (value: string) => void;
  onPurchaseCostQtyChange: (value: number) => void;
  onSupplementPriceChange: (value: string) => void;
  onSupplementPriceBlur: (value: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const EditContent = ({
  formData,
  priceDisplayValues,
  units,
  onNameChange,
  onPurchaseCostChange,
  onPurchaseCostBlur,
  onPurchaseUnitChange,
  onPurchaseCostQtyChange,
  onSupplementPriceChange,
  onSupplementPriceBlur,
  onSave,
  onCancel,
  isSaving,
}: EditContentProps) => (
  <div className="space-y-6">
    {/* Name */}
    <div>
      <Label htmlFor="ingredient-name">Nom de l'ingrédient</Label>
      <Input
        id="ingredient-name"
        value={formData.name || ''}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="ex: Tomate"
        className="mt-2"
      />
    </div>

    {/* Purchase Cost */}
    <div>
      <Label htmlFor="purchase-cost">Prix d'achat (€)</Label>
      <Input
        id="purchase-cost"
        type="text"
        inputMode="decimal"
        value={priceDisplayValues.purchase_cost}
        onChange={(e) => onPurchaseCostChange(e.target.value)}
        onBlur={(e) => onPurchaseCostBlur(e.target.value)}
        placeholder="0,00"
        className="mt-2"
      />
    </div>

    {/* Purchase Unit */}
    <div>
      <Label htmlFor="purchase-unit">Unité d'achat</Label>
      <Select
        value={formData.purchase_unit_id?.toString() || ''}
        onValueChange={onPurchaseUnitChange}
      >
        <SelectTrigger id="purchase-unit" className="mt-2">
          <SelectValue placeholder="Sélectionner une unité" />
        </SelectTrigger>
        <SelectContent>
          {units
            .filter(u => u.id && u.id.toString().trim() !== '')
            .map((unit) => (
            <SelectItem key={unit.id} value={unit.id.toString()}>
              {unit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Purchase Cost Quantity */}
    <div>
      <Label htmlFor="purchase-cost-qty">Quantité pour le coût d'achat</Label>
      <Input
        id="purchase-cost-qty"
        type="number"
        inputMode="numeric"
        min="1"
        step="1"
        value={formData.purchase_cost_qty || 1}
        onChange={(e) => onPurchaseCostQtyChange(parseInt(e.target.value) || 1)}
        className="mt-2"
      />
    </div>

    {/* Supplement Price */}
    <div>
      <Label htmlFor="supplement-price">Prix en supplément (€)</Label>
      <Input
        id="supplement-price"
        type="text"
        inputMode="decimal"
        value={priceDisplayValues.price}
        onChange={(e) => onSupplementPriceChange(e.target.value)}
        onBlur={(e) => onSupplementPriceBlur(e.target.value)}
        placeholder="0,00"
        className="mt-2"
      />
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 pt-4">
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
        className="flex-1"
      >
        Annuler
      </Button>
    </div>
  </div>
);

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
  
  const [formData, setFormData] = useState<Partial<Component>>({
    name: '',
    purchase_cost: 0,
    purchase_unit_id: '',
    price: 0,
    purchase_cost_qty: 1,
  });

  // Store display values separately to prevent focus loss on recalculation
  const [priceDisplayValues, setPriceDisplayValues] = useState<{
    purchase_cost: string;
    price: string;
  }>({
    purchase_cost: '',
    price: '',
  });

  const [displayedComponent, setDisplayedComponent] = useState<Component | null>(null);

  // Initialize form when component opens or initialComponent changes
  useEffect(() => {
    if (open && initialComponent) {
      setDisplayedComponent(initialComponent);
      setFormData({
        name: initialComponent.name || '',
        purchase_cost: initialComponent.purchase_cost || 0,
        purchase_unit_id: initialComponent.purchase_unit_id?.toString() || '',
        price: initialComponent.price || 0,
      });
      setPriceDisplayValues({
        purchase_cost: priceToDisplayValue(initialComponent.purchase_cost),
        price: priceToDisplayValue(initialComponent.price),
      });
      // Reset to view mode when opening
      setIsEditMode(false);
    }
  }, [open, initialComponent]);

  const handleSave = useCallback(async () => {
    if (!componentId || !displayedComponent) return;

    setIsSaving(true);
    try {
      await onSave(componentId, formData);
      toast({
        title: 'Succès',
        description: 'Ingrédient mis à jour avec succès',
      });
      setIsEditMode(false);
      setDisplayedComponent(prev => prev ? { ...prev, ...formData } : null);
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
      setFormData({
        name: initialComponent.name || '',
        purchase_cost: initialComponent.purchase_cost || 0,
        purchase_unit_id: initialComponent.purchase_unit_id?.toString() || '',
        price: initialComponent.price || 0,
        purchase_cost_qty: initialComponent.purchase_cost_qty || 1,
      });
      setPriceDisplayValues({
        purchase_cost: priceToDisplayValue(initialComponent.purchase_cost),
        price: priceToDisplayValue(initialComponent.price),
      });
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

  const handlePurchaseCostQtyChange = useCallback((value: number) => {
    setFormData(prev => ({ ...prev, purchase_cost_qty: value }));
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

  // Memoized content to prevent unnecessary re-renders
  const content = useMemo(
    () => {
      if (!displayedComponent) return null;
      
      return isEditMode ? (
        <EditContent
          formData={formData}
          priceDisplayValues={priceDisplayValues}
          units={units}
          onNameChange={handleNameChange}
          onPurchaseCostChange={handlePurchaseCostChange}
          onPurchaseCostBlur={handlePurchaseCostBlur}
          onPurchaseUnitChange={handlePurchaseUnitChange}
          onPurchaseCostQtyChange={handlePurchaseCostQtyChange}
          onSupplementPriceChange={handleSupplementPriceChange}
          onSupplementPriceBlur={handleSupplementPriceBlur}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      ) : (
        <ViewContent
          displayedComponent={displayedComponent}
          units={units}
          onEdit={() => setIsEditMode(true)}
          onDelete={() => setShowDeleteDialog(true)}
          hasDelete={!!onDelete}
        />
      );
    },
    [
      isEditMode,
      displayedComponent,
      formData,
      priceDisplayValues,
      units,
      isSaving,
      handleNameChange,
      handlePurchaseCostChange,
      handlePurchaseCostBlur,
      handlePurchaseUnitChange,
      handlePurchaseCostQtyChange,
      handleSupplementPriceChange,
      handleSupplementPriceBlur,
      handleSave,
      handleCancel,
      onDelete,
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
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Détail Ingrédient</SheetTitle>
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
        <DialogContent className="w-full h-screen max-w-full rounded-none flex flex-col gap-0 p-0">
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
              <DialogTitle className="text-center flex-1">{displayedComponent.name}</DialogTitle>
              <div className="w-8" /> {/* Spacer for alignment */}
            </div>
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
