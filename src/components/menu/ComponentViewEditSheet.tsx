import { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from 'lucide-react';
import { Component, UnitOfMeasure } from '@/types/menu';

const componentEditFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  purchase_cost: z.coerce.number().min(0, "Le prix d'achat doit être positif ou nul").optional(),
  purchase_unit_id: z.string().optional(),
});

type ComponentEditFormValues = z.infer<typeof componentEditFormSchema>;

interface ComponentViewEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: Component | null;
  units: UnitOfMeasure[];
  onUpdate: (componentId: string, data: { name?: string; purchase_cost?: number; purchase_unit_id?: string | number }) => Promise<void>;
  onDeleteConfirm?: (component: Component) => Promise<void>;
}

export function ComponentViewEditSheet({
  open,
  onOpenChange,
  component,
  units,
  onUpdate,
  onDeleteConfirm,
}: ComponentViewEditSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ComponentEditFormValues>({
    resolver: zodResolver(componentEditFormSchema),
    defaultValues: {
      name: '',
      purchase_cost: undefined,
      purchase_unit_id: undefined,
    },
  });

  // Update form values when component changes
  useEffect(() => {
    if (component && open) {
      form.reset({
        name: component.name,
        purchase_cost: component.purchase_cost ? component.purchase_cost / 100 : undefined,
        purchase_unit_id: component.purchase_unit_id ? component.purchase_unit_id?.toString() : undefined,
      });
    }
  }, [component, open, form]);

  const onSubmit = async (data: ComponentEditFormValues) => {
    if (!component) return;

    setIsSubmitting(true);
    try {
      await onUpdate(component.component_id, {
        name: data.name,
        purchase_cost: data.purchase_cost ? Math.round(data.purchase_cost * 100) : undefined,
        purchase_unit_id: data.purchase_unit_id && data.purchase_unit_id !== 'none' ? data.purchase_unit_id : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (component && onDeleteConfirm) {
      setIsDeleting(true);
      try {
        await onDeleteConfirm(component);
        setDeleteConfirmOpen(false);
        onOpenChange(false);
      } catch (error) {
        console.error('Failed to delete component:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (!component) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>Détails de l'ingrédient</SheetTitle>
            <SheetDescription>
              {component.name}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              {/* Read-only basic info */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Catégorie</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  {component.category || '—'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unité de mesure</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  {component.unit_of_measure || '—'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Prix supplément</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  {component.price ? `${(component.price / 100).toFixed(2)}€` : '—'}
                </div>
              </div>

              {/* Editable fields */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-4">Informations d'achat</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom de l'ingrédient" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          placeholder="0.50"
                          {...field}
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
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une unité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
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
              </div>

              <div className="flex gap-2 pt-4 flex-col sm:flex-row">
                {onDeleteConfirm && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteClick}
                    className="sm:flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <div className={`flex gap-2 ${onDeleteConfirm ? 'sm:flex-1' : 'flex-1'}`}>
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
                    {isSubmitting ? "Mise à jour..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet ingrédient ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{component.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
