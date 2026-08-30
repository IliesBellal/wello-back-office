import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { productionProfileService } from '@/services/productionProfileService';
import type { CreateProductionProfileRequest, ProductionProfileEntry } from '@/types/productionProfiles';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  split_by_source: z.boolean(),
  display_only_paid_orders: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductionProfileFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: ProductionProfileEntry;
}

export function ProductionProfileFormSheet({ open, onOpenChange, profile }: ProductionProfileFormSheetProps) {
  const isEditMode = Boolean(profile);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      split_by_source: true,
      display_only_paid_orders: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: profile?.name ?? '',
        split_by_source: profile?.split_by_source ?? true,
        display_only_paid_orders: profile?.display_only_paid_orders ?? false,
      });
    }
  }, [open, profile, form]);

  const mutation = useMutation({
    mutationFn: (payload: CreateProductionProfileRequest) =>
      isEditMode
        ? productionProfileService.updateProfile(profile!.id, payload)
        : productionProfileService.createProfile(payload),
    onSuccess: () => {
      toast({
        title: isEditMode ? 'Profil de production mis à jour' : 'Profil de production ajouté',
      });
      queryClient.invalidateQueries({ queryKey: qk.productionProfiles.all });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: isEditMode
          ? 'Impossible de mettre à jour le profil de production.'
          : "Impossible d'ajouter le profil de production.",
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      name: values.name.trim(),
      split_by_source: values.split_by_source,
      display_only_paid_orders: values.display_only_paid_orders,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Modifier le profil de production' : 'Nouveau profil de production'}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Renommez ce profil de production.'
              : 'Ajoutez un profil de production à votre établissement.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Cuisine chaude" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="split_by_source"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Scinder par source</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Sépare les commandes par source (Uber Eats, Deliveroo, établissement).
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_only_paid_orders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Commandes payées uniquement</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        N'affiche que les commandes payées en production.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
