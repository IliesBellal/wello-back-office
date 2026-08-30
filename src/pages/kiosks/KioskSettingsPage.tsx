import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, ConfirmDialog } from '@/components/shared';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ImageIcon, Loader2, Trash2, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { qk } from '@/lib/queryKeys';
import { kioskService } from '@/services/kioskService';
import type { ForceFulfillmentType, KioskSettings, UpdateKioskSettingsRequest } from '@/types/kiosks';

const NO_FORCE_VALUE = 'none';

const INACTIVITY_TIMEOUT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 60, label: '1 min' },
  { value: 90, label: '1 min 30' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
];

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MAX_IDLE_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IDLE_VIDEO_SIZE = 50 * 1024 * 1024;

const commandFormSchema = z.object({
  fulfillment_dine_in: z.boolean(),
  fulfillment_take_away: z.boolean(),
  force_fulfillment_type: z.union([z.enum(['DINE_IN', 'TAKE_AWAY']), z.null()]),
  pager_number_required: z.boolean(),
  show_allergens: z.boolean(),
  inactivity_timeout_sec: z.number(),
  upsell_enabled: z.boolean(),
  pay_at_counter_enabled: z.boolean(),
  card_payment_enabled: z.boolean(),
});

type CommandFormValues = z.infer<typeof commandFormSchema>;

const colorFormSchema = z.object({
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide (format hex attendu, ex: #FF5500)'),
});

type ColorFormValues = z.infer<typeof colorFormSchema>;

const defaultCommandValues: CommandFormValues = {
  fulfillment_dine_in: true,
  fulfillment_take_away: true,
  force_fulfillment_type: null,
  pager_number_required: false,
  show_allergens: true,
  inactivity_timeout_sec: 90,
  upsell_enabled: true,
  pay_at_counter_enabled: true,
  card_payment_enabled: false,
};

export default function KioskSettingsPage() {
  const { canManageKiosk } = usePermissions();

  // RBAC lot 10 : gate, redirect if no permission. Kept in this thin
  // wrapper so the early return never sits between two hook calls of the
  // content component below.
  if (!canManageKiosk) {
    return <Navigate to="/" replace />;
  }

  return <KioskSettingsPageContent />;
}

function KioskSettingsPageContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [deleteVideoDialogOpen, setDeleteVideoDialogOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIdleImage, setUploadingIdleImage] = useState(false);
  const [uploadingIdleVideo, setUploadingIdleVideo] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: qk.kiosks.settings,
    queryFn: () => kioskService.getKioskSettings(),
  });

  const commandForm = useForm<CommandFormValues>({
    resolver: zodResolver(commandFormSchema),
    defaultValues: defaultCommandValues,
  });

  const colorForm = useForm<ColorFormValues>({
    resolver: zodResolver(colorFormSchema),
    defaultValues: { primary_color: '#000000' },
  });

  useEffect(() => {
    if (settings) {
      commandForm.reset({
        fulfillment_dine_in: settings.fulfillment_dine_in,
        fulfillment_take_away: settings.fulfillment_take_away,
        force_fulfillment_type: settings.force_fulfillment_type,
        pager_number_required: settings.pager_number_required,
        show_allergens: settings.show_allergens,
        inactivity_timeout_sec: settings.inactivity_timeout_sec,
        upsell_enabled: settings.upsell_enabled,
        pay_at_counter_enabled: settings.pay_at_counter_enabled,
        card_payment_enabled: settings.card_payment_enabled,
      });
      colorForm.reset({ primary_color: settings.primary_color ?? '#000000' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const dineIn = commandForm.watch('fulfillment_dine_in');
  const takeAway = commandForm.watch('fulfillment_take_away');
  const forceSelectDisabled = !(dineIn && takeAway);

  useEffect(() => {
    if (forceSelectDisabled) {
      commandForm.setValue('force_fulfillment_type', null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSelectDisabled]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: UpdateKioskSettingsRequest) => kioskService.updateKioskSettings(data),
    onSuccess: (updated: KioskSettings) => {
      toast({ title: 'Paramètres enregistrés' });
      queryClient.setQueryData(qk.kiosks.settings, updated);
      queryClient.invalidateQueries({ queryKey: qk.kiosks.settings });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer les paramètres.",
        variant: 'destructive',
      });
    },
  });

  const saveColorMutation = useMutation({
    mutationFn: (data: UpdateKioskSettingsRequest) => kioskService.updateKioskSettings(data),
    onSuccess: (updated: KioskSettings) => {
      toast({ title: 'Couleur enregistrée' });
      queryClient.setQueryData(qk.kiosks.settings, updated);
      queryClient.invalidateQueries({ queryKey: qk.kiosks.settings });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer la couleur.",
        variant: 'destructive',
      });
    },
  });

  const uploadFile = async (
    file: File,
    maxSize: number,
    sizeErrorLabel: string,
    setUploading: (value: boolean) => void,
    upload: (file: File) => Promise<unknown>,
    successTitle: string,
  ) => {
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: sizeErrorLabel,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      await upload(file);
      toast({ title: successTitle });
      queryClient.invalidateQueries({ queryKey: qk.kiosks.settings });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer le fichier.",
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    uploadFile(
      file,
      MAX_LOGO_SIZE,
      'Le logo ne doit pas dépasser 2 Mo.',
      setUploadingLogo,
      (f) => kioskService.uploadLogo(f),
      'Logo mis à jour',
    );
  };

  const handleIdleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    uploadFile(
      file,
      MAX_IDLE_IMAGE_SIZE,
      "L'image de veille ne doit pas dépasser 5 Mo.",
      setUploadingIdleImage,
      (f) => kioskService.uploadIdleImage(f),
      'Image de veille mise à jour',
    );
  };

  const handleIdleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    uploadFile(
      file,
      MAX_IDLE_VIDEO_SIZE,
      'La vidéo de veille ne doit pas dépasser 50 Mo.',
      setUploadingIdleVideo,
      (f) => kioskService.uploadIdleVideo(f),
      'Vidéo de veille mise à jour',
    );
  };

  const deleteVideoMutation = useMutation({
    mutationFn: () => kioskService.deleteIdleVideo(),
    onSuccess: (updated: KioskSettings) => {
      toast({ title: 'Vidéo de veille supprimée' });
      queryClient.setQueryData(qk.kiosks.settings, updated);
      queryClient.invalidateQueries({ queryKey: qk.kiosks.settings });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la vidéo de veille.',
        variant: 'destructive',
      });
    },
  });

  const onSubmitCommand = (values: CommandFormValues) => {
    if (!settings) return;
    updateSettingsMutation.mutate({
      fulfillment_dine_in: values.fulfillment_dine_in,
      fulfillment_take_away: values.fulfillment_take_away,
      force_fulfillment_type: values.force_fulfillment_type,
      pager_number_required: values.pager_number_required,
      show_allergens: values.show_allergens,
      inactivity_timeout_sec: values.inactivity_timeout_sec,
      upsell_enabled: values.upsell_enabled,
      pay_at_counter_enabled: values.pay_at_counter_enabled,
      card_payment_enabled: values.card_payment_enabled,
      primary_color: settings.primary_color,
    });
  };

  const onSubmitColor = (values: ColorFormValues) => {
    if (!settings) return;
    saveColorMutation.mutate({
      fulfillment_dine_in: commandForm.getValues('fulfillment_dine_in'),
      fulfillment_take_away: commandForm.getValues('fulfillment_take_away'),
      force_fulfillment_type: commandForm.getValues('force_fulfillment_type'),
      pager_number_required: commandForm.getValues('pager_number_required'),
      show_allergens: commandForm.getValues('show_allergens'),
      inactivity_timeout_sec: commandForm.getValues('inactivity_timeout_sec'),
      upsell_enabled: commandForm.getValues('upsell_enabled'),
      pay_at_counter_enabled: commandForm.getValues('pay_at_counter_enabled'),
      card_payment_enabled: commandForm.getValues('card_payment_enabled'),
      primary_color: values.primary_color,
    });
  };

  const handleConfirmDeleteVideo = async () => {
    await deleteVideoMutation.mutateAsync();
    setDeleteVideoDialogOpen(false);
  };

  if (isLoading || !settings) {
    return (
      <DashboardLayout>
        <PageContainer
          header={<h1 className="text-3xl font-bold text-foreground">Paramètres Kiosk</h1>}
          description="Configurez vos bornes de commande en libre-service"
        >
          <p className="text-muted-foreground">Chargement des paramètres...</p>
        </PageContainer>
      </DashboardLayout>
    );
  }

  const watchedColor = colorForm.watch('primary_color');

  return (
    <DashboardLayout>
      <PageContainer
        header={<h1 className="text-3xl font-bold text-foreground">Paramètres Kiosk</h1>}
        description="Configurez vos bornes de commande en libre-service"
      >
        <div className="space-y-6">
          {/* ─── Section Commande ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Commande</CardTitle>
              <CardDescription>Modes de service et options de commande disponibles sur les bornes.</CardDescription>
            </CardHeader>
            <Form {...commandForm}>
              <form onSubmit={commandForm.handleSubmit(onSubmitCommand)}>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Modes de fulfillment disponibles</h3>

                    <FormField
                      control={commandForm.control}
                      name="fulfillment_dine_in"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border p-3">
                          <FormLabel className="font-normal">Sur place</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={commandForm.control}
                      name="fulfillment_take_away"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border p-3">
                          <FormLabel className="font-normal">À emporter</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={commandForm.control}
                      name="force_fulfillment_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forcer un mode</FormLabel>
                          <Select
                            value={field.value ?? NO_FORCE_VALUE}
                            onValueChange={(value) =>
                              field.onChange(value === NO_FORCE_VALUE ? null : (value as ForceFulfillmentType))
                            }
                            disabled={forceSelectDisabled}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NO_FORCE_VALUE}>Laisser le choix</SelectItem>
                              <SelectItem value="DINE_IN">Sur place</SelectItem>
                              <SelectItem value="TAKE_AWAY">À emporter</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Options de commande</h3>

                    <FormField
                      control={commandForm.control}
                      name="pager_number_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border p-3">
                          <FormLabel className="font-normal">Demander un numéro de palet</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={commandForm.control}
                      name="show_allergens"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border p-3">
                          <FormLabel className="font-normal">Afficher les allergènes</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={commandForm.control}
                      name="upsell_enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border p-3">
                          <FormLabel className="font-normal">Activer l'upsell</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={commandForm.control}
                      name="pay_at_counter_enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border p-3">
                          <FormLabel className="font-normal">Paiement en caisse</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={commandForm.control}
                      name="card_payment_enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md border p-3">
                          <FormLabel className="font-normal text-muted-foreground">Paiement par carte</FormLabel>
                          <FormControl>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Disponible prochainement</TooltipContent>
                            </Tooltip>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Délai d'inactivité</h3>
                    <FormField
                      control={commandForm.control}
                      name="inactivity_timeout_sec"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={String(field.value)}
                            onValueChange={(value) => field.onChange(Number(value))}
                          >
                            <FormControl>
                              <SelectTrigger className="max-w-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INACTIVITY_TIMEOUT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={String(option.value)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          {/* ─── Section Apparence ────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Personnalisez la couleur, le logo et les médias de veille des bornes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Couleur principale */}
              <Form {...colorForm}>
                <form onSubmit={colorForm.handleSubmit(onSubmitColor)} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Couleur principale</h3>
                  <div className="flex flex-wrap items-end gap-4">
                    <FormField
                      control={colorForm.control}
                      name="primary_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couleur</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <input
                                type="color"
                                value={field.value}
                                onChange={field.onChange}
                                className="h-10 w-14 rounded-md border border-input cursor-pointer"
                              />
                            </FormControl>
                            <Input
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="#FF5500"
                              className="w-32"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Aperçu</Label>
                      <Button type="button" style={{ backgroundColor: watchedColor }} className="text-white">
                        Bouton borne
                      </Button>
                    </div>

                    <Button type="submit" variant="outline" disabled={saveColorMutation.isPending}>
                      {saveColorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enregistrer la couleur
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Logo */}
              <div className="space-y-3 pt-2 border-t">
                <h3 className="text-sm font-semibold text-foreground pt-4">Logo</h3>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted/40 overflow-hidden">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="kiosk-logo-upload" className="text-sm font-medium cursor-pointer">
                      <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                        {uploadingLogo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Changer le logo
                      </span>
                    </Label>
                    <input
                      id="kiosk-logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={handleLogoChange}
                    />
                    <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP, 2 Mo max.</p>
                  </div>
                </div>
              </div>

              {/* Image de veille */}
              <div className="space-y-3 pt-2 border-t">
                <h3 className="text-sm font-semibold text-foreground pt-4">Image de veille</h3>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-28 items-center justify-center rounded-md border bg-muted/40 overflow-hidden">
                    {settings.idle_image_url ? (
                      <img src={settings.idle_image_url} alt="Image de veille" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="kiosk-idle-image-upload" className="text-sm font-medium cursor-pointer">
                      <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                        {uploadingIdleImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Changer l'image de veille
                      </span>
                    </Label>
                    <input
                      id="kiosk-idle-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingIdleImage}
                      onChange={handleIdleImageChange}
                    />
                    <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP, 5 Mo max.</p>
                  </div>
                </div>
              </div>

              {/* Vidéo de veille */}
              <div className="space-y-3 pt-2 border-t">
                <h3 className="text-sm font-semibold text-foreground pt-4">Vidéo de veille</h3>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-28 items-center justify-center rounded-md border bg-muted/40 overflow-hidden">
                    {settings.idle_video_url ? (
                      <video
                        src={settings.idle_video_url}
                        preload="metadata"
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Video className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="kiosk-idle-video-upload" className="text-sm font-medium cursor-pointer">
                      <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                        {uploadingIdleVideo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Changer la vidéo de veille
                      </span>
                    </Label>
                    <input
                      id="kiosk-idle-video-upload"
                      type="file"
                      accept="video/mp4,video/webm"
                      className="hidden"
                      disabled={uploadingIdleVideo}
                      onChange={handleIdleVideoChange}
                    />
                    <p className="text-xs text-muted-foreground">MP4 ou WebM, 50 Mo max.</p>
                  </div>
                  {settings.idle_video_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteVideoDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                      Supprimer la vidéo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  La vidéo de veille est prioritaire sur l'image de veille si les deux sont configurées.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <ConfirmDialog
          open={deleteVideoDialogOpen}
          onOpenChange={setDeleteVideoDialogOpen}
          title="Supprimer la vidéo de veille"
          description="La borne affichera l'image de veille (si configurée) à la place de la vidéo."
          isDangerous
          isLoading={deleteVideoMutation.isPending}
          onConfirm={handleConfirmDeleteVideo}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
