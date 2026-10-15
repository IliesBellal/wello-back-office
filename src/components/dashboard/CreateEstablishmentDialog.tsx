import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { isApiHttpError } from "@/services/apiClient";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import {
  EMPTY_PLACE,
  MAX_PHONE_LENGTH,
  buildCreateMerchantPayload,
  hasSwitchableMerchant,
  isValidSiret,
  normalizePhone,
  placeAfterManualEdit,
  placeFromParsed,
  type PlaceFields,
} from "@/lib/establishmentForm";

/** IDs de la table `packages` — voir docs/audit-parcours-onboarding.md. */
const PACKAGES = [
  { id: "1", name: "Essentiel", description: "L'offre de base pour démarrer." },
  { id: "3", name: "Standard", description: "Les fonctionnalités les plus utilisées." },
  { id: "4", name: "Premium", description: "Toutes les fonctionnalités, sans limite." },
] as const;

const formSchema = z.object({
  full_name: z.string().min(1, "Le nom est requis"),
  siret: z
    .string()
    .min(1, "Le SIRET est requis")
    .refine(isValidSiret, "Le SIRET doit comporter 14 chiffres"),
  tel: z
    .string()
    .min(1, "Le téléphone est requis")
    .refine((v) => normalizePhone(v).length <= MAX_PHONE_LENGTH, "Numéro trop long (15 caractères maximum)"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  zip_code: z.string().optional(),
  city: z.string().optional(),
  web_site: z.string().optional(),
  package_id: z.enum(["1", "3", "4"], { required_error: "Choisissez une offre" }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEstablishmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateEstablishmentDialog = ({ open, onOpenChange }: CreateEstablishmentDialogProps) => {
  const { authData, setAuthData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // What Google resolved for the address (coordinates, place id, street parts).
  // Not form fields: never shown, but always kept consistent with the address
  // text — see placeFromParsed / placeAfterManualEdit.
  const placeRef = useRef<PlaceFields>(EMPTY_PLACE);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      siret: "",
      tel: "",
      email: "",
      address: "",
      zip_code: "",
      city: "",
      web_site: "",
      package_id: "1",
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      placeRef.current = EMPTY_PLACE;
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: FormValues) => {
    if (!authData) return;

    setLoading(true);
    try {
      const merchantId = await authService.createMerchant(
        buildCreateMerchantPayload(values, placeRef.current, authData.user.id),
      );

      toast({
        title: "Établissement créé",
        description: `${values.full_name} a été ajouté à vos établissements.`,
      });

      // Rafraîchit session.merchants pour que le nouvel établissement apparaisse
      // tout de suite dans le sélecteur. La création a déjà réussi : un échec ici
      // ne l'annule pas, mais on le dit plutôt que de laisser un établissement
      // créé qu'on ne peut pas sélectionner sans explication.
      try {
        const refreshed = await authService.loginWithToken(authData.session.token);
        setAuthData(refreshed.data);
        if (!hasSwitchableMerchant(refreshed.data.session.merchants, merchantId)) {
          toast({
            title: "Établissement créé",
            description: "Il n'apparaît pas encore dans la liste. Reconnectez-vous pour y accéder.",
            variant: "destructive",
          });
        }
      } catch (refreshError) {
        console.error("Failed to refresh merchants after creation:", refreshError);
        toast({
          title: "Liste non actualisée",
          description: "L'établissement est créé, mais la liste n'a pas pu être rechargée. Rechargez la page.",
          variant: "destructive",
        });
      }

      handleOpenChange(false);
    } catch (error) {
      // apiClient affiche déjà un toast générique sur les erreurs HTTP ;
      // toute autre erreur (réponse inattendue, réseau...) serait sinon muette.
      if (!isApiHttpError(error)) {
        toast({
          title: "Erreur",
          description: "Impossible de créer l'établissement.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel établissement</DialogTitle>
          <DialogDescription>
            Il sera ajouté à votre liste d'établissements, avec un accès administrateur.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'établissement</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Brasserie du midi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="siret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIRET</FormLabel>
                    <FormControl>
                      <Input placeholder="123 456 789 00012" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 6 00 00 00 00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@etablissement.fr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value ?? ""}
                      placeholder="117 Route de lorraine"
                      onSelect={(parsed) => {
                        const place = placeFromParsed(parsed);
                        placeRef.current = place;
                        form.setValue("address", place.address, { shouldValidate: true });
                        // Remplace aussi quand Google ne renvoie rien : ne pas
                        // garder le code postal / la ville de l'adresse précédente.
                        form.setValue("zip_code", place.zip_code);
                        form.setValue("city", place.city);
                      }}
                      onInputChange={(text) => {
                        placeRef.current = placeAfterManualEdit(placeRef.current, text);
                        form.setValue("address", text);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input placeholder="57000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Metz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="web_site"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site web</FormLabel>
                  <FormControl>
                    <Input placeholder="www.etablissement.fr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="package_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offre</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    >
                      {PACKAGES.map((pkg) => (
                        <Label
                          key={pkg.id}
                          htmlFor={`package-${pkg.id}`}
                          className={cn(
                            "flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors",
                            field.value === pkg.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={pkg.id} id={`package-${pkg.id}`} />
                            <span className="font-medium">{pkg.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{pkg.description}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer l'établissement"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
