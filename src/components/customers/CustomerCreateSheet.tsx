import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, X } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createCustomer, describeCreateCustomerError } from '@/services/customersService';
import type { CustomerManualImportInput } from '@/types/customerImport';

/**
 * Mêmes règles que la saisie manuelle en masse
 * (src/lib/manualCustomerImport.ts, miroir de BuildManualCustomerImport côté
 * API) : nom requis, email ou téléphone requis, format email simple. Rejouées
 * ici côté client pour un retour immédiat avant même l'appel réseau.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const customerFormSchema = z
  .object({
    name: z.string().min(1, 'Le nom est requis'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    businessName: z.string().optional(),
    birthdate: z.string().optional(),
    additionalInfo: z.string().optional(),
    deliveryNotes: z.string().optional(),
    advertisingConsent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const email = (data.email ?? '').trim();
    const phone = (data.phone ?? '').trim();

    if (!email && !phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email ou téléphone requis' });
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Email ou téléphone requis' });
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email invalide' });
    }
  });

type CustomerFormValues = z.infer<typeof customerFormSchema>;

const defaultValues: CustomerFormValues = {
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  businessName: '',
  birthdate: '',
  additionalInfo: '',
  deliveryNotes: '',
  advertisingConsent: false,
};

const buildPayload = (values: CustomerFormValues): CustomerManualImportInput => ({
  name: values.name.trim(),
  first_name: (values.firstName ?? '').trim(),
  last_name: (values.lastName ?? '').trim(),
  email: (values.email ?? '').trim(),
  phone: (values.phone ?? '').trim(),
  address: (values.address ?? '').trim(),
  floor_number: '',
  door_number: '',
  additional_address: '',
  business_name: (values.businessName ?? '').trim(),
  birthdate: (values.birthdate ?? '').trim(),
  additional_info: (values.additionalInfo ?? '').trim(),
  delivery_notes: (values.deliveryNotes ?? '').trim(),
  advertising_consent: values.advertisingConsent,
});

interface CustomerCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rappelé après une création ou une mise à jour réussie, pour recharger la liste. */
  onCreated: () => void;
}

/**
 * Sheet "Créer un client" — porte principale de la page Clients depuis
 * l'inversion du bouton scindé (l'import de fichier / la saisie multiple
 * sont passés dans le menu du chevron).
 *
 * Si l'email ou le téléphone saisi correspond à un client déjà présent chez
 * ce marchand, l'API met à jour ce client plutôt que d'échouer — le résultat
 * (`created`) sert à distinguer le message affiché.
 */
export function CustomerCreateSheet({ open, onOpenChange, onCreated }: CustomerCreateSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(defaultValues);
    onOpenChange(next);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createCustomer(buildPayload(values));
      form.reset(defaultValues);
      onOpenChange(false);
      onCreated();
      toast({
        title: result.created ? 'Client créé' : 'Client mis à jour',
        description: result.created
          ? 'Le client a été ajouté à votre fichier clients.'
          : 'Un client correspondant existait déjà — ses informations ont été mises à jour.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: describeCreateCustomerError(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Nom *</FormLabel>
                <FormControl>
                  <Input placeholder="Jean Dupont" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input placeholder="Jean" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de famille</FormLabel>
                <FormControl>
                  <Input placeholder="Dupont" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jean.dupont@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input placeholder="06 12 34 56 78" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="-mt-4 text-xs text-muted-foreground">
          Email ou téléphone requis (l'un des deux suffit).
        </p>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Input placeholder="12 rue de la Paix, 75002 Paris" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom d'entreprise</FormLabel>
                <FormControl>
                  <Input placeholder="Société XYZ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birthdate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de naissance</FormLabel>
                <FormControl>
                  <Input placeholder="JJ/MM/AAAA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="additionalInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Informations complémentaires</FormLabel>
              <FormControl>
                <Textarea placeholder="Allergies, préférences..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deliveryNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes de livraison</FormLabel>
              <FormControl>
                <Textarea placeholder="Code portail, étage..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="advertisingConsent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Consentement à recevoir des communications publicitaires</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" className="flex-1 bg-gradient-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              'Créer le client'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="!h-screen !max-h-screen !w-screen !p-0 !gap-0 !rounded-none flex flex-col [&_button[aria-label='Close']]:hidden">
          <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => handleOpenChange(false)} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-sm font-semibold flex-1 text-center">Créer un client</h2>
            <div className="w-8" />
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">{formBody}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Créer un client</SheetTitle>
          <SheetDescription>Ajoutez un client à votre fichier clients.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">{formBody}</div>
      </SheetContent>
    </Sheet>
  );
}
