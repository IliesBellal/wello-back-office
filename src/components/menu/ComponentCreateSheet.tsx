import { useState } from 'react';
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
import { Category, UnitOfMeasure } from '@/types/menu';

const componentFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category_id: z.string().min(1, "La catégorie est requise"),
  unit_id: z.coerce.number().min(1, "L'unité est requise"),
  price: z.coerce.number().min(0, "Le prix doit être positif ou nul"),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  units: UnitOfMeasure[];
  onCreateComponent: (data: any) => Promise<void>;
  onCreateCategory: (name: string) => Promise<Category | undefined>;
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
    },
  });

  const onSubmit = async (data: ComponentFormValues) => {
    setIsSubmitting(true);
    try {
      await onCreateComponent({
        name: data.name,
        category_id: data.category_id,
        unit_id: data.unit_id,
        price: Math.round(data.price * 100), // Convert to cents
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
          <SheetTitle>Ajouter un composant</SheetTitle>
          <SheetDescription>
            Créer un nouveau composant/ingrédient
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du composant</FormLabel>
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
                {isSubmitting ? "Création..." : "Créer le composant"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
