import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, TriangleAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { cdsService, CdsApiException } from "@/services/cdsService";
import type { CdsEnrollmentCodeCreated } from "@/types/cds";

// 100 caractères : même borne que cds_displays.name, validée côté serveur.
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom de l'écran est requis")
    .max(100, "Le nom est trop long (100 caractères max)"),
});

type FormValues = z.infer<typeof formSchema>;

interface CdsEnrollmentCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatExpiresIn = (expiresAt: string): string => {
  const minutes = Math.max(
    0,
    Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000),
  );
  return minutes <= 1
    ? "Expire dans 1 minute"
    : `Expire dans ${minutes} minutes`;
};

export function CdsEnrollmentCodeDialog({
  open,
  onOpenChange,
}: CdsEnrollmentCodeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<CdsEnrollmentCodeCreated | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const mutation = useMutation({
    mutationFn: (name: string) => cdsService.generateEnrollmentCode(name),
    onSuccess: (data) => {
      setErrorMessage(null);
      setCreated(data);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof CdsApiException
          ? error.message
          : "Impossible de générer le code d'enrôlement.",
      );
    },
  });

  // La boîte s'ouvre sur le formulaire, plus sur un code déjà généré : le
  // nom doit être choisi AVANT la création, puisqu'il est porté par le code.
  // Générer à l'ouverture, comme avant, consommait une place de code pour un
  // écran dont on ne connaissait pas encore le nom.
  useEffect(() => {
    if (open) {
      setCreated(null);
      setErrorMessage(null);
      form.reset({ name: "" });
    }
  }, [open, form]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      queryClient.invalidateQueries({ queryKey: qk.cds.enrollmentCodes });
      queryClient.invalidateQueries({ queryKey: qk.cds.displays });
    }
    onOpenChange(next);
  };

  const onSubmit = (values: FormValues) => {
    setErrorMessage(null);
    mutation.mutate(values.name);
  };

  const handleCopy = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.code);
    toast({
      title: "Copié !",
      description: "Le code a été copié dans le presse-papiers.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un écran</DialogTitle>
          <DialogDescription>
            {created
              ? "Saisissez ce code sur l'écran, avec la télécommande, pour l'associer à votre établissement."
              : "Donnez un nom à l'écran, puis générez son code d'enrôlement."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            {created.name && (
              <p className="text-center text-sm font-medium text-foreground">
                {created.name}
              </p>
            )}

            {/*
              Chiffres très espacés et en très grande taille : le code se lit
              sur cet écran et se saisit sur un autre, au pavé numérique d'une
              télécommande, souvent à deux personnes et à distance.
            */}
            <div className="rounded-md border bg-muted/40 py-8 text-center">
              <p className="font-mono text-5xl font-bold tracking-[0.3em] pl-[0.3em]">
                {created.code}
              </p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {formatExpiresIn(created.expires_at)}
            </p>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopy}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier le code
            </Button>

            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <TriangleAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Ce code ne sera affiché qu'une seule fois.
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'écran</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Écran comptoir"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Sert à le repérer dans votre liste ; il n'est jamais
                      affiché aux clients.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <TriangleAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Générer le code
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
