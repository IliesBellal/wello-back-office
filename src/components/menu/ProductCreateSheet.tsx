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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategorySelector } from '@/components/shared/CategorySelector';
import { Category, TvaRateGroup } from '@/types/menu';

const productFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Le prix doit être positif"),
  category_id: z.string().min(1, "La catégorie est requise"),
  tva_on_site: z.coerce.number().min(1, "TVA sur place requise"),
  tva_takeaway: z.coerce.number().min(1, "TVA à emporter requise"),
  tva_delivery: z.coerce.number().min(1, "TVA livraison requise"),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  tvaRates: TvaRateGroup[];
  onCreateProduct: (data: any) => Promise<void>;
  onCreateCategory: (name: string) => Promise<Category | undefined>;
}

export function ProductCreateSheet({
  open,
  onOpenChange,
  categories,
  tvaRates,
  onCreateProduct,
  onCreateCategory,
}: ProductCreateSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category_id: '',
      tva_on_site: undefined,
      tva_takeaway: undefined,
      tva_delivery: undefined,
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      await onCreateProduct({
        name: data.name,
        description: data.description,
        price: Math.round(data.price * 100), // Convert to cents
        price_take_away: Math.round(data.price * 100),
        price_delivery: Math.round(data.price * 100),
        category_id: data.category_id,
        tva_rate_in: parseInt(data.tva_on_site),
        tva_rate_take_away: parseInt(data.tva_takeaway),
        tva_rate_delivery: parseInt(data.tva_delivery),
        available_in: true,
        available_take_away: true,
        available_delivery: true,
        is_product_group: false,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get TVA groups
  const surPlace = tvaRates.find(g => g.name === "Sur Place")?.rates || [];
  const emporter = tvaRates.find(g => g.name === "Emporter")?.rates || [];
  const livraison = tvaRates.find(g => g.name === "Livraison")?.rates || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Ajouter un produit</SheetTitle>
          <SheetDescription>
            Créer un nouveau produit pour votre menu
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du produit</FormLabel>
                  <FormControl>
                    <Input placeholder="Pizza Margherita" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tomate, mozzarella, basilic..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="12.00"
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

            <div className="space-y-4">
              <h3 className="text-sm font-medium">TVA par type de service</h3>
              
              <FormField
                control={form.control}
                name="tva_on_site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TVA Sur Place</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {surPlace.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id.toString()}>
                            {rate.label}
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
                name="tva_takeaway"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TVA À Emporter</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {emporter.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id.toString()}>
                            {rate.label}
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
                name="tva_delivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TVA Livraison</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {livraison.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id.toString()}>
                            {rate.label}
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
                {isSubmitting ? "Création..." : "Créer le produit"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
