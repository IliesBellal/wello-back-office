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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { Category, UnitOfMeasure, ComponentCategory, ComponentCreatePayload } from '@/types/menu';

const componentFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category_id: z.string().min(1, "La catégorie est requise"),
  unit_id: z.string().min(1, "L'unité est requise"),
  price: z.coerce.number().min(0, "Le prix doit être positif ou nul"),
  purchase_cost: z.coerce.number().min(0, "Le prix d'achat doit être positif ou nul").optional(),
  purchase_unit_id: z.string().optional(),
  purchase_cost_qty: z.coerce.number().min(1, "La quantité doit être au minimum 1").optional(),
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
    const baseUnit = units.find(
      (unit) => unit.id.toString() === selectedUnitId?.toString()
    );

    if (!baseUnit) return units;

    const compatibleIds = (baseUnit.compatible_with || []).map((id) => id.toString());
    if (compatibleIds.length === 0) return [baseUnit];

    return units.filter((unit) => compatibleIds.includes(unit.id.toString()));
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
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Ajouter un ingrédient</SheetTitle>
          <SheetDescription>
            Créer un nouvel ingrédient
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'ingrédient</FormLabel>
                  <FormControl>
                    <Input placeholder="Farine, Tomate, Mozzarella..." {...field} />
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
                  <FormLabel>Catégorie</FormLabel>
                  <FormControl>
                    <CategorySelector
                      categories={categories}
                      value={field.value}
                      onValueChange={field.onChange}
                      onCreateCategory={onCreateCategory}
                    />
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
                  <FormLabel>Unité de mesure</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix supplément (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-4">Informations d'achat (optionnel)</h3>

              <FormField
                control={form.control}
                name="purchase_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix d'achat (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.30"
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
                    <FormLabel>Quantité pour le coût d'achat</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1"
                        min="1"
                        placeholder="1"
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
                name="purchase_unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité d'achat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || 'none'}>
                      <FormControl>
                        <SelectTrigger>
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
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Création..." : "Créer l'ingrédient"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
