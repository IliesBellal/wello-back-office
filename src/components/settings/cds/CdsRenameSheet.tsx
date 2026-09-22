import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { cdsService } from "@/services/cdsService";
import type { CdsDisplay } from "@/types/cds";

// 100 caractères : même borne que la colonne cds_displays.name, validée côté
// serveur par validateDisplayName.
const formSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom est trop long (100 caractères max)"),
});

type FormValues = z.infer<typeof formSchema>;

interface CdsRenameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  display?: CdsDisplay;
}

export function CdsRenameSheet({
  open,
  onOpenChange,
  display,
}: CdsRenameSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: display?.name ?? "" });
    }
  }, [open, display, form]);

  const mutation = useMutation({
    mutationFn: (name: string) =>
      cdsService.updateDisplay(display!.display_id, { name }),
    onSuccess: () => {
      toast({ title: "Écran renommé" });
      queryClient.invalidateQueries({ queryKey: qk.cds.displays });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de renommer l'écran.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values.name.trim());
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Renommer l'écran</SheetTitle>
          <SheetDescription>
            Le nom sert uniquement à vous repérer dans cette liste ; il n'est
            jamais affiché aux clients.
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
                      <Input placeholder="Écran comptoir" {...field} />
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
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!display || mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
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
