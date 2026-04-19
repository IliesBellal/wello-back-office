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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { X } from 'lucide-react';
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
import { useProductCreateData } from '@/hooks/useProductCreateData';
import { ProductCreatePayload } from '@/types/menu';
import { PriceInput } from '@/components/shared/PriceInput';

const productFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Le prix sur place doit être positif"),
  price_take_away: z.coerce.number().min(0, "Le prix à emporter doit être positif"),
  price_delivery: z.coerce.number().min(0, "Le prix livraison doit être positif"),
  category_id: z.string().min(1, "La catégorie est requise"),
  tva_on_site: z.string().min(1, "TVA sur place requise"),
  tva_takeaway: z.string().min(1, "TVA à emporter requise"),
  tva_delivery: z.string().min(1, "TVA livraison requise"),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProduct: (data: ProductCreatePayload) => Promise<void>;
  onCreateCategory: (name: string) => Promise<{ category_id: string }>;
}

export function ProductCreateSheet({
  open,
  onOpenChange,
  onCreateProduct,
  onCreateCategory,
}: ProductCreateSheetProps) {
  // Load TVA rates and categories autonomously when sheet opens
  const { tvaRates, categories, loading } = useProductCreateData(open);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      price_take_away: 0,
      price_delivery: 0,
      category_id: '',
      tva_on_site: '',
      tva_takeaway: '',
      tva_delivery: '',
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      await onCreateProduct({
        name: data.name,
        description: data.description,
        price: Math.round(data.price * 100), // Convert to cents
        price_take_away: Math.round(data.price_take_away * 100),
        price_delivery: Math.round(data.price_delivery * 100),
        category_id: data.category_id,
        tva_in_id: data.tva_on_site,
        tva_take_away_id: data.tva_takeaway,
        tva_delivery_id: data.tva_delivery,
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
  const surPlace = tvaRates.find(g => g.delivery_type === "IN")?.rates || [];
  const emporter = tvaRates.find(g => g.delivery_type === "TAKE_AWAY")?.rates || [];
  const livraison = tvaRates.find(g => g.delivery_type === "DELIVERY")?.rates || [];

  const isMobile = useIsMobile();

  // Mobile: Full-screen Dialog
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!h-screen !max-h-screen !w-screen !p-0 !gap-0 !rounded-none flex flex-col [&_button[aria-label='Close']]:hidden">
          {/* Mobile Header */}
          <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-sm font-semibold flex-1 text-center">Ajouter un produit</h2>
            <div className="w-8" />
          </div>

          {/* Mobile Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            {/* Loading Skeleton */}
            {loading && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {!loading && (
                  <>
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

                    <div className="space-y-6">
                      <h3 className="text-sm font-medium">Prix par type de service</h3>
                      
                      {/* Sur Place */}
                      <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
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
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prix Sur Place (€)</FormLabel>
                              <FormControl>
                                <PriceInput 
                                  placeholder="12,00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* À Emporter */}
                      <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
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
                          name="price_take_away"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prix À Emporter (€)</FormLabel>
                              <FormControl>
                                <PriceInput 
                                  placeholder="12,00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Livraison */}
                      <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
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

                        <FormField
                          control={form.control}
                          name="price_delivery"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prix Livraison (€)</FormLabel>
                              <FormControl>
                                <PriceInput
                                  placeholder="12,00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}
              </form>
            </Form>
          </div>

          {/* Mobile Footer - Sticky at bottom */}
          {!loading && (
            <div className="bg-white border-t border-border px-4 py-3 flex gap-2 flex-shrink-0">
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
                disabled={isSubmitting || loading}
                onClick={form.handleSubmit(onSubmit)}
              >
                {isSubmitting ? "Création..." : "Créer"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop: Original Sheet layout
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Ajouter un produit</SheetTitle>
          <SheetDescription>
            Créer un nouveau produit pour votre menu
          </SheetDescription>
        </SheetHeader>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {!loading && (
              <>
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

            <div className="space-y-6">
              <h3 className="text-sm font-medium">Prix par type de service</h3>
              
              {/* Sur Place */}
              <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
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
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix Sur Place (€)</FormLabel>
                      <FormControl>
                        <PriceInput 
                          placeholder="12,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* À Emporter */}
              <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
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
                  name="price_take_away"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix À Emporter (€)</FormLabel>
                      <FormControl>
                        <PriceInput 
                          placeholder="12,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Livraison */}
              <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
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

                <FormField
                  control={form.control}
                  name="price_delivery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix Livraison (€)</FormLabel>
                      <FormControl>
                        <PriceInput 
                          placeholder="12,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
              </>
            )}

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
                disabled={isSubmitting || loading}
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
