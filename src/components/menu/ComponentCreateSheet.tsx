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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { DuplicateNameDialog } from '@/components/shared/DuplicateNameDialog';
import { useDuplicateNameConfirm } from '@/hooks/useDuplicateNameConfirm';
import { Category, UnitOfMeasure, ComponentCategory, ComponentCreatePayload } from '@/types/menu';

const componentFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category_id: z.string().min(1, "La catégorie est requise"),
  unit_id: z.string().min(1, "L'unité est requise"),
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
  const { runWithDuplicateConfirm, duplicateDialogProps } = useDuplicateNameConfirm();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: '',
      category_id: '',
      unit_id: undefined,
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: ComponentFormValues) => {
    // Requête figée : en cas de doublon de nom, la boîte de confirmation la
    // rejoue à l'identique — c'est ce qu'attend la confirmation côté API.
    const submitCreation = async () => {
      await onCreateComponent({
        name: data.name,
        category_id: data.category_id,
        unit_id: data.unit_id.toString(),
        price: 0,
      });
      form.reset();
      handleOpenChange(false);
    };

    setIsSubmitting(true);
    try {
      await runWithDuplicateConfirm(submitCreation);
    } catch (error) {
      console.error('Failed to create component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <DuplicateNameDialog {...duplicateDialogProps} />
      <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Ajouter un ingrédient</SheetTitle>
          <SheetDescription>
            Créez rapidement l’ingrédient. Vous pourrez renseigner les prix et les informations de conservation depuis sa fiche détaillée.
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
