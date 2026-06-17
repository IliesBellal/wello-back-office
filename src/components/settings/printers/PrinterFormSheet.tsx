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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { printerService } from '@/services/printerService';
import {
  printerConnectionTypeLabels,
  printerRoleLabels,
  type CreatePrinterRequest,
  type PrinterEntry,
  type PrinterRole,
} from '@/types/printers';

const LABEL_ROLES: PrinterRole[] = [
  'label_haccp',
  'label_production',
  'label_haccp_et_production',
];

const formSchema = z
  .object({
    name: z.string().min(1, 'Le nom est requis'),
    connection_type: z.enum(['wifi', 'bluetooth']),
    ip_address: z.string().optional(),
    port: z.coerce.number().optional(),
    bluetooth_address: z.string().optional(),
    role: z.enum([
      'caisse',
      'production',
      'caisse_et_production',
      'label_haccp',
      'label_production',
      'label_haccp_et_production',
    ]),
  })
  .superRefine((values, ctx) => {
    if (values.connection_type === 'wifi' && !values.ip_address?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ip_address'],
        message: "L'adresse IP est requise",
      });
    }
    if (values.connection_type === 'bluetooth' && !values.bluetooth_address?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bluetooth_address'],
        message: "L'adresse MAC est requise",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface PrinterFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printer?: PrinterEntry;
}

export function PrinterFormSheet({ open, onOpenChange, printer }: PrinterFormSheetProps) {
  const isEditMode = Boolean(printer);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      connection_type: 'wifi',
      ip_address: '',
      port: 9100,
      bluetooth_address: '',
      role: 'caisse',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: printer?.name ?? '',
        connection_type: printer?.connection_type ?? 'wifi',
        ip_address: printer?.ip_address ?? '',
        port: printer?.port ?? 9100,
        bluetooth_address: printer?.bluetooth_address ?? '',
        role: printer?.role ?? 'caisse',
      });
    }
  }, [open, printer, form]);

  const connectionType = form.watch('connection_type');
  const role = form.watch('role');
  const isLabelRole = LABEL_ROLES.includes(role);

  const mutation = useMutation({
    mutationFn: (payload: CreatePrinterRequest) =>
      isEditMode
        ? printerService.updatePrinter(printer!.id, payload)
        : printerService.createPrinter(payload),
    onSuccess: () => {
      toast({
        title: isEditMode ? 'Imprimante mise à jour' : 'Imprimante ajoutée',
      });
      queryClient.invalidateQueries({ queryKey: qk.printers.all });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: isEditMode
          ? "Impossible de mettre à jour l'imprimante."
          : "Impossible d'ajouter l'imprimante.",
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: CreatePrinterRequest = {
      name: values.name.trim(),
      connection_type: values.connection_type,
      role: values.role,
      ...(values.connection_type === 'wifi'
        ? { ip_address: values.ip_address?.trim(), port: values.port }
        : { bluetooth_address: values.bluetooth_address?.trim() }),
    };
    mutation.mutate(payload);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Modifier l'imprimante" : 'Nouvelle imprimante'}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Modifiez les informations de l'imprimante."
              : 'Ajoutez une imprimante à votre établissement.'}
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
                      <Input placeholder="Imprimante caisse 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="connection_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de connexion</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(printerConnectionTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {connectionType === 'wifi' ? (
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="ip_address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Adresse IP</FormLabel>
                        <FormControl>
                          <Input placeholder="192.168.1.50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="bluetooth_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse MAC</FormLabel>
                      <FormControl>
                        <Input placeholder="00:11:22:33:44:55" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(printerRoleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {isLabelRole
                        ? 'Cette imprimante utilisera le protocole ZPL (étiquettes)'
                        : "Cette imprimante utilisera le protocole ESC/POS (tickets thermiques)"}
                    </p>
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
