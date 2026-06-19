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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { kioskService } from '@/services/kioskService';
import type { KioskEntry, UpdateKioskRequest } from '@/types/kiosks';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom est trop long (100 caractères max)'),
});

type FormValues = z.infer<typeof formSchema>;

interface KioskFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kiosk?: KioskEntry;
}

export function KioskFormSheet({ open, onOpenChange, kiosk }: KioskFormSheetProps) {
  const isEditMode = Boolean(kiosk);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: kiosk?.name ?? '' });
    }
  }, [open, kiosk, form]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateKioskRequest) => kioskService.updateKiosk(kiosk!.id, payload),
    onSuccess: () => {
      toast({ title: 'Borne renommée' });
      queryClient.invalidateQueries({ queryKey: qk.kiosks.all });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de renommer la borne.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({ name: values.name.trim() });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Renommer la borne</SheetTitle>
          <SheetDescription>Modifiez le nom affiché pour cette borne.</SheetDescription>
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
                      <Input placeholder="Borne entrée" {...field} />
                    </FormControl>
                    <FormMessage />
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
                <Button type="submit" className="flex-1" disabled={!isEditMode || mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
