import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { Category, UnitOfMeasure, ComponentCategory, ComponentCreatePayload } from '@/types/menu';
import { decimalToDisplayValue, parseDecimalInput } from '@/utils/priceInputUtils';
import { getCompatibleUnits } from '@/utils/unitConversions';

const componentFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category_id: z.string().min(1, "La catégorie est requise"),
  unit_id: z.string().min(1, "L'unité est requise"),
  price: z.coerce.number().min(0, "Le prix doit être positif ou nul"),
  purchase_cost: z.coerce.number().min(0, "Le prix d'achat doit être positif ou nul").optional(),
  purchase_unit_id: z.string().optional(),
  purchase_cost_qty: z.number().positive("La quantité doit être supérieure à 0").optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[] | ComponentCategory[];
  units: UnitOfMeasure[];
  onCreateComponent: (data: ComponentCreatePayload) => Promise<void>;
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
}

export function ComponentCreateSheet({
  open,
  onOpenChange,
  categories,
  units,
  onCreateComponent,
  onCreateCategory,
}: ComponentCreateSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseCostQtyDisplayValue, setPurchaseCostQtyDisplayValue] = useState('');

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: '',
      category_id: '',
      unit_id: undefined,
      price: 0,
      purchase_cost: undefined,
      purchase_unit_id: undefined,
      purchase_cost_qty: undefined,
    },
  });

  const selectedUnitId = form.watch('unit_id');

  const compatiblePurchaseUnits = useMemo(() => {
    if (!selectedUnitId) return units;

    const compatibleUnits = getCompatibleUnits(selectedUnitId, units);
    return compatibleUnits.length > 0 ? compatibleUnits : units;
  }, [units, selectedUnitId]);

  useEffect(() => {
    const selectedPurchaseUnitId = form.getValues('purchase_unit_id');
    if (!selectedPurchaseUnitId || selectedPurchaseUnitId === 'none') return;

    const isCompatible = compatiblePurchaseUnits.some(
      (unit) => unit.id.toString() === selectedPurchaseUnitId.toString()
    );

    if (!isCompatible) {
      form.setValue('purchase_unit_id', 'none', {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [compatiblePurchaseUnits, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setPurchaseCostQtyDisplayValue('');
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: ComponentFormValues) => {
    setIsSubmitting(true);
    try {
      await onCreateComponent({
        name: data.name,
        category_id: data.category_id,
        unit_id: data.unit_id.toString(),
        price: Math.round(data.price * 100), // Convert to cents
        purchase_cost: data.purchase_cost ? Math.round(data.purchase_cost * 100) : undefined,
        purchase_unit_id: data.purchase_unit_id && data.purchase_unit_id !== 'none' ? data.purchase_unit_id : undefined,
        purchase_cost_qty: data.purchase_cost_qty || undefined,
      });
      form.reset();
      setPurchaseCostQtyDisplayValue('');
      handleOpenChange(false);
    } catch (error) {
      console.error('Failed to create component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Ajouter un ingrédient</SheetTitle>
          <SheetDescription>
            Créer un nouvel ingrédient avec une fiche plus claire et structurée.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-900">Identité</CardTitle>
                <CardDescription>Définissez le nom, la catégorie et l’unité de stockage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Nom de l'ingrédient</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Farine, Tomate, Mozzarella..."
                          className="border-slate-200 bg-slate-50 focus:bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Catégorie</FormLabel>
                      <FormControl>
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-0.5">
                          <CategorySelector
                            categories={categories}
                            value={field.value}
                            onValueChange={field.onChange}
                            onCreateCategory={onCreateCategory}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Unité de mesure</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="border-slate-200 bg-slate-50 focus:bg-white">
                            <SelectValue placeholder="Sélectionner une unité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id.toString()}>
                              {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-900">Tarification client</CardTitle>
                <CardDescription>Prix appliqué si l’ingrédient est facturé comme supplément.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Prix supplément (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.50"
                          className="border-slate-200 bg-slate-50 focus:bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-900">Approvisionnement</CardTitle>
                <CardDescription>Informations d’achat optionnelles pour suivre le coût et l’unité de référence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="purchase_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Prix d'achat (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.30"
                          className="border-slate-200 bg-slate-50 focus:bg-white"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_cost_qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Quantité pour le coût d'achat</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="1 ou 0,5"
                          className="border-slate-200 bg-slate-50 focus:bg-white"
                          name={field.name}
                          ref={field.ref}
                          value={purchaseCostQtyDisplayValue}
                          onChange={(e) => {
                            const displayValue = e.target.value;
                            setPurchaseCostQtyDisplayValue(displayValue);
                            field.onChange(parseDecimalInput(displayValue));
                          }}
                          onBlur={(e) => {
                            field.onBlur();
                            setPurchaseCostQtyDisplayValue(decimalToDisplayValue(parseDecimalInput(e.target.value)));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Unité d'achat</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || 'none'}>
                        <FormControl>
                          <SelectTrigger className="border-slate-200 bg-slate-50 focus:bg-white">
                            <SelectValue placeholder="Sélectionner une unité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {compatiblePurchaseUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id.toString()}>
                              {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="flex gap-2 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="flex-1 border-slate-200 bg-white hover:bg-slate-50"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Création..." : "Créer l'ingrédient"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
