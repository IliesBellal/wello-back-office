import { useState, useEffect, useRef } from 'react';
import { ImageSourceMenu } from '@/components/shared/ImageSourceMenu';
import type { ImageInput, PickedImageUrl } from '@/lib/imageInput';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TabSystem, PageContainer, ConfirmDialog } from '@/components/shared';
import { StripeStatusCard } from '@/components/integrations/StripeStatusCard';
import { BankAccountsTab } from '@/components/integrations/BankAccountsTab';
import { ScanNOrderSeoPanel } from '@/components/integrations/ScanNOrderSeoPanel';
import {
  getOnlineOrdersConfig,
  updateOnlineOrdersConfig,
  uploadLogo,
  uploadBanner,
  OnlineOrdersConfig,
} from '@/services/onlineOrdersService';
import { AlertCircle, Upload, Copy, ExternalLink, Wallet, Loader2, Store, User, Phone, FileText, MapPin, Globe, Mail, Calendar } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { integrationsService, type IntegrationStatus } from '@/services/integrationsService';
import { settingsService } from '@/services/settingsService';
import { type UserProfile, type EstablishmentSettings } from '@/types/settings';
import { ColorPresetPicker, TEXT_COLOR_PRESETS } from '@/components/shared/ColorPresetPicker';
import { useToast } from '@/hooks/use-toast';
import { EstablishmentOperationsModal } from '@/components/integrations/EstablishmentOperationsModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getMerchantCurrency } from '@/lib/money';
import { CopyLinkSourceDialog } from '@/components/integrations/CopyLinkSourceDialog';

// ════════════════════════════════════════════════════════════════════════════
// ImageUploadField Component
// ════════════════════════════════════════════════════════════════════════════
interface ImageUploadFieldProps {
  label: string;
  preview: string;
  isLogo?: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Si fourni, le clic propose aussi la banque d'images (bannière). */
  onPick?: (picked: PickedImageUrl) => void;
}

function ImageUploadField({
  label,
  preview,
  isLogo = false,
  onUpload,
  onPick,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Sans banque d'images, la zone ouvre directement le sélecteur de fichier ;
  // avec, c'est le menu déroulant qui s'en charge.
  const zoneHandlers = onPick
    ? {}
    : {
        onClick: handleClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        },
      };
  const zone = (
    <div
      className="relative flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary hover:bg-muted/50"
      role="button"
      tabIndex={0}
      {...zoneHandlers}
    >
      {preview ? (
        <img
          src={preview}
          alt={label}
          // Bannière : recadrage 4:1 identique à l'affichage desktop du ScanNOrder.
          className={
            isLogo
              ? 'h-20 w-20 max-h-full max-w-full rounded-lg object-contain'
              : 'aspect-[4/1] w-full rounded-lg object-cover'
          }
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Cliquez pour télécharger
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG ou GIF (max 5 MB)
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {onPick ? (
        <ImageSourceMenu format="banner" onDevice={handleClick} onPick={onPick}>
          {zone}
        </ImageSourceMenu>
      ) : (
        zone
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onUpload}
        className="hidden"
      />
    </div>
  );
}

// Compte Stripe Connect enregistré. API antérieure (champ absent) : `active`
// en tenait lieu.
function hasStripeAccount(status: IntegrationStatus | null): boolean {
  if (!status) return false;
  if (status.stripe_account_status !== undefined) return !!status.stripe_account_status;
  return status.active;
}

export default function ScanNOrder() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [config, setConfig] = useState<OnlineOrdersConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState('appearance');
  const [stripeBalance, setStripeBalance] = useState<{ available: number; pending: number } | null>(null);
  const [kpis, setKpis] = useState<{ revenue: number; orders: number; avg_basket: number } | null>(null);
  const [scanStatus, setScanStatus] = useState<IntegrationStatus | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [establishment, setEstablishment] = useState<EstablishmentSettings | null>(null);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showHideStorefrontDialog, setShowHideStorefrontDialog] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [switching, setSwitching] = useState<'ordering' | 'storefront' | null>(null);
  const [activating, setActivating] = useState(false);


  useEffect(() => {
    fetchConfig();

    settingsService.getUserProfile()
      .then(setProfile)
      .catch(() => {/* profile stays null */});

    settingsService.getEstablishmentSettings()
      .then(setEstablishment)
      .catch(() => {/* establishment stays null */});

    integrationsService.getScanNOrderStatus()
      .then(status => {
        setScanStatus(status);
        setKpis(status.kpis);
        if (hasStripeAccount(status)) {
          integrationsService.getStripeBalance()
            .then(setStripeBalance)
            .catch(() => {/* balance stays null */});
        }
      })
      .catch(() => {/* kpis stay null */});
  }, []);

  useEffect(() => {
    if (searchParams.get('stripe') !== 'success') {
      return;
    }

    toast({
      title: 'Parametrage en cours de validation...',
      description: 'Vous allez etre redirige vers WelloResto automatiquement une fois la verification Stripe terminee.',
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('stripe');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  // Lien public de la boutique, fourni par GET /integrations/scannorder.
  // `null` tant que le marchand n'a pas de QR code principal.
  const accessUrl = scanStatus?.access_url || '';
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const stripeReady = hasStripeAccount(scanStatus);
  const orderingSwitchOn = !!scanStatus?.active;
  const storefrontOn = scanStatus?.storefront_enabled !== false;
  // API antérieure (champ absent) : le commutateur faisait foi.
  const canOrder = scanStatus?.online_ordering_enabled ?? orderingSwitchOn;

  const closureDate = (() => {
    const closedUntil = scanStatus?.closed_until;
    if (!closedUntil) return null;
    const parsed = new Date(closedUntil);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.getTime() > Date.now() ? parsed : null;
  })();

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await getOnlineOrdersConfig();
      setConfig(data);
      if (data.logo_url) setLogoPreview(data.logo_url);
      if (data.banner_url) setBannerPreview(data.banner_url);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof OnlineOrdersConfig, value: any) => {
    if (config) {
      setConfig({
        ...config,
        [key]: value,
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const url = await uploadLogo(file);
      handleConfigChange('logo_url', url);
    } catch (error) {
      console.error('Error uploading logo:', error);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setBannerPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    await saveBanner(file);
  };

  // Image de la banque / « Mes images » : l'aperçu est l'URL choisie.
  const handleBannerPick = async (picked: PickedImageUrl) => {
    setBannerPreview(picked.imageUrl);
    await saveBanner(picked);
  };

  const saveBanner = async (image: ImageInput) => {
    try {
      const url = await uploadBanner(image);
      handleConfigChange('banner_url', url);
    } catch (error) {
      console.error('Error uploading banner:', error);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      await updateOnlineOrdersConfig(config);
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copié !',
      description: 'L\'URL d\'accès a été copiée dans le presse-papiers.',
    });
  };

  const openInNewTab = () => {
    if (!accessUrl) return;
    window.open(accessUrl, '_blank');
  };

  // Commutateurs commande en ligne (`active`) et affichage de la carte
  // (`storefront_enabled`) : appel dédié, la réponse remplace le statut.
  const updateSwitch = async (
    which: 'ordering' | 'storefront',
    data: { active?: boolean; storefront_enabled?: boolean },
    successMessage: string,
  ) => {
    setSwitching(which);
    try {
      const status = await integrationsService.updateScanNOrderSwitches(data);
      setScanStatus(status);
      toast({ title: successMessage });
    } catch {
      toast({
        title: 'Erreur',
        description: 'La modification n\'a pas pu être enregistrée. Réessayez.',
        variant: 'destructive',
      });
    } finally {
      setSwitching(null);
      setShowDisableDialog(false);
      setShowHideStorefrontDialog(false);
    }
  };

  const handleOrderingToggle = (checked: boolean) => {
    if (!checked) {
      setShowDisableDialog(true);
      return;
    }
    updateSwitch('ordering', { active: true }, 'Commande en ligne réactivée');
  };

  const handleStorefrontToggle = (checked: boolean) => {
    if (!checked) {
      setShowHideStorefrontDialog(true);
      return;
    }
    updateSwitch('storefront', { storefront_enabled: true }, 'Carte de nouveau visible');
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const { url } = await integrationsService.startScanNOrderOnboarding();
      toast({
        title: 'Redirection vers Stripe',
        description: 'Vous quittez temporairement WelloResto pour finaliser l\'activation de ScanNOrder.',
      });
      window.location.href = url;
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de lancer l\'onboarding ScanNOrder pour le moment.',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const establishmentInfo = establishment?.info;
  const fullAddress =
    establishmentInfo?.address ||
    [establishmentInfo?.street, establishmentInfo?.postal_code, establishmentInfo?.city, establishmentInfo?.country]
      .filter(Boolean)
      .join(', ');

  const formattedBirthDate = (() => {
    const value = profile?.birth_date;
    if (!value) return 'Non renseignée';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('fr-FR');
  })();

  const renderAppearanceTab = () => (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10">
      {/* Grille de sections: 2 colonnes sur desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Logo Card */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Téléchargez le logo de votre plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploadField
              label="Sélectionner un logo"
              preview={logoPreview}
              isLogo={true}
              onUpload={handleLogoUpload}
            />
          </CardContent>
        </Card>

        {/* Bannière Card */}
        <Card>
          <CardHeader>
            <CardTitle>Bannière</CardTitle>
            <CardDescription>
              Format paysage, 1600 × 450 px minimum. Sujet centré.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploadField
              label="Sélectionner une bannière"
              preview={bannerPreview}
              isLogo={false}
              onUpload={handleBannerUpload}
              onPick={handleBannerPick}
            />
          </CardContent>
        </Card>

        {/* Couleurs Card */}
        <Card>
          <CardHeader>
            <CardTitle>Couleurs</CardTitle>
            <CardDescription>Configurez les couleurs principales</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Grille interne: 2 colonnes pour les champs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="primary-color" className="block text-sm font-medium mb-2">
                  Couleur principale
                </Label>
                <div className="flex items-center gap-3">
                  <ColorPresetPicker
                    id="primary-color"
                    value={config?.primary_color}
                    fallbackColor="#3b82f6"
                    onChange={(hex) => handleConfigChange('primary_color', hex)}
                    label="la couleur principale"
                    compact
                  />
                  <span className="text-sm font-mono text-muted-foreground">
                    {config?.primary_color}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="text-color" className="block text-sm font-medium mb-2">
                  Couleur de texte
                </Label>
                <div className="flex items-center gap-3">
                  <ColorPresetPicker
                    id="text-color"
                    value={config?.text_color}
                    fallbackColor="#ffffff"
                    presets={TEXT_COLOR_PRESETS}
                    onChange={(hex) => handleConfigChange('text_color', hex)}
                    label="le texte"
                    compact
                  />
                  <span className="text-sm font-mono text-muted-foreground">
                    {config?.text_color}
                  </span>
                </div>
              </div>
            </div>

            {/* Aperçu */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Preview
              </p>
              <button
                style={{
                  backgroundColor: config?.primary_color || '#3b82f6',
                  color: config?.text_color || '#ffffff',
                }}
                className="px-6 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              >
                Exemple de bouton
              </button>
            </div>
          </CardContent>
        </Card>

        {/* En-tête Card */}
        <Card>
          <CardHeader>
            <CardTitle>En-tête</CardTitle>
            <CardDescription>Configurez le titre et le texte</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Grille interne: 2 colonnes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="header-title" className="block text-sm font-medium mb-2">
                  Titre
                </Label>
                <Input
                  id="header-title"
                  value={config?.header_title || ''}
                  onChange={(e) =>
                    handleConfigChange('header_title', e.target.value)
                  }
                  placeholder="Titre de l'en-tête"
                />
              </div>
              <div>
                <Label htmlFor="header-text" className="block text-sm font-medium mb-2">
                  Texte
                </Label>
                <Input
                  id="header-text"
                  value={config?.header_text || ''}
                  onChange={(e) =>
                    handleConfigChange('header_text', e.target.value)
                  }
                  placeholder="Texte descriptif"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liens Card - Pleine largeur */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Liens importants</CardTitle>
            <CardDescription>Configurez les liens de votre plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Grille interne: 3 colonnes pour les liens */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="cgv-link" className="block text-sm font-medium mb-2">
                  Lien CGV
                </Label>
                <Input
                  id="cgv-link"
                  type="url"
                  value={config?.cgv_link || ''}
                  onChange={(e) =>
                    handleConfigChange('cgv_link', e.target.value)
                  }
                  placeholder="https://example.com/cgv"
                />
              </div>
              <div>
                <Label htmlFor="return-policy" className="block text-sm font-medium mb-2">
                  Politique de retour
                </Label>
                <Input
                  id="return-policy"
                  type="url"
                  value={config?.return_policy_link || ''}
                  onChange={(e) =>
                    handleConfigChange('return_policy_link', e.target.value)
                  }
                  placeholder="https://example.com/return-policy"
                />
              </div>
              <div>
                <Label htmlFor="legal-notices" className="block text-sm font-medium mb-2">
                  Mentions légales
                </Label>
                <Input
                  id="legal-notices"
                  type="url"
                  value={config?.legal_notices_link || ''}
                  onChange={(e) =>
                    handleConfigChange('legal_notices_link', e.target.value)
                  }
                  placeholder="https://example.com/legal"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderModesTab = () => (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10">
      {/* Grille de sections: 3 colonnes sur desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* À emporter Card */}
        <Card>
          <CardHeader>
            <CardTitle>Mode à emporter</CardTitle>
            <CardDescription>Activez et configurez ce mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="takeaway-enabled">Activer</Label>
              <Switch
                id="takeaway-enabled"
                checked={config?.takeaway_enabled || false}
                onCheckedChange={(checked) =>
                  handleConfigChange('takeaway_enabled', checked)
                }
              />
            </div>
            {config?.takeaway_enabled && (
              <div className="flex items-center justify-between border-t pt-4">
                <Label htmlFor="takeaway-auto-accept">Acceptation auto</Label>
                <Switch
                  id="takeaway-auto-accept"
                  checked={config?.takeaway_auto_accept || false}
                  onCheckedChange={(checked) =>
                    handleConfigChange('takeaway_auto_accept', checked)
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Livraison Card */}
        <Card>
          <CardHeader>
            <CardTitle>Mode livraison</CardTitle>
            <CardDescription>Activez et configurez ce mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="delivery-enabled">Activer</Label>
              <Switch
                id="delivery-enabled"
                checked={config?.delivery_enabled || false}
                onCheckedChange={(checked) =>
                  handleConfigChange('delivery_enabled', checked)
                }
              />
            </div>
            {config?.delivery_enabled && (
              <>
                <div className="flex items-center justify-between border-t pt-4">
                  <Label htmlFor="delivery-auto-accept">Acceptation auto</Label>
                  <Switch
                    id="delivery-auto-accept"
                    checked={config?.delivery_auto_accept || false}
                    onCheckedChange={(checked) =>
                      handleConfigChange('delivery_auto_accept', checked)
                    }
                  />
                </div>
                <div className="border-t pt-4">
                  <Label htmlFor="delivery-distance" className="block text-sm font-medium mb-2">
                    Distance max (km)
                  </Label>
                  <Input
                    id="delivery-distance"
                    type="number"
                    min="0"
                    step="0.5"
                    value={config?.delivery_distance_limit || 0}
                    onChange={(e) =>
                      handleConfigChange(
                        'delivery_distance_limit',
                        parseFloat(e.target.value)
                      )
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Commandes programmées Card */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes programmées</CardTitle>
            <CardDescription>Permettre la programmation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="scheduled-enabled">Activer</Label>
              <Switch
                id="scheduled-enabled"
                checked={config?.scheduled_orders_enabled || false}
                onCheckedChange={(checked) =>
                  handleConfigChange('scheduled_orders_enabled', checked)
                }
              />
            </div>
            {config?.scheduled_orders_enabled && (
              <div className="border-t pt-4">
                <Label htmlFor="scheduled-days-max" className="block text-sm font-medium mb-2">
                  Jours max en avance
                </Label>
                <Input
                  id="scheduled-days-max"
                  type="number"
                  min="1"
                  max="90"
                  value={config?.scheduled_orders_max_days || 7}
                  onChange={(e) =>
                    handleConfigChange(
                      'scheduled_orders_max_days',
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'appearance':
        return renderAppearanceTab();
      case 'modes':
        return renderModesTab();
      case 'bank-accounts':
        return <BankAccountsTab />;
      case 'seo':
        return (
          <ScanNOrderSeoPanel
            accessUrl={accessUrl || null}
            establishmentName={establishmentInfo?.name}
            city={establishmentInfo?.city}
            takeawayEnabled={config?.takeaway_enabled}
            deliveryEnabled={config?.delivery_enabled}
          />
        );
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Apparence' },
    { id: 'modes', label: 'Commandes' },
    { id: 'seo', label: 'Référencement' },
    { id: 'bank-accounts', label: 'Compte bancaire' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 mx-auto"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!config) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Erreur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Impossible de charger la configuration. Veuillez réessayer.
              </p>
              <Button onClick={() => fetchConfig()} className="mt-4 w-full">
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Activation de l'encaissement (onboarding Stripe) : vérification des
  // informations transmises à Stripe, puis redirection. La carte, elle, est
  // consultable sans cette étape (ib-welloresto-api
  // docs/scannorder-carte-sans-stripe.md).
  const activationDialog = (
    <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activer la commande en ligne</DialogTitle>
          <DialogDescription>
            Vérifiez les informations ci-dessous : elles sont transmises à notre plateforme de paiement sécurisée. Si nécessaire, modifiez-les dans les paramètres avant activation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4" />
                  Etablissement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-start gap-2 text-muted-foreground"><Store className="h-4 w-4 mt-0.5" /><span>{establishmentInfo?.name || 'Non renseigné'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><Phone className="h-4 w-4 mt-0.5" /><span>{establishmentInfo?.phone || 'Non renseigné'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><FileText className="h-4 w-4 mt-0.5" /><span>SIRET: {establishmentInfo?.siret || 'Non renseigné'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="h-4 w-4 mt-0.5" /><span>{fullAddress || 'Non renseignée'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><Globe className="h-4 w-4 mt-0.5" /><span>{establishmentInfo?.website || 'Non renseigné'}</span></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Utilisateur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-start gap-2 text-muted-foreground"><User className="h-4 w-4 mt-0.5" /><span>{profile?.lastname || 'Non renseigné'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><User className="h-4 w-4 mt-0.5" /><span>{profile?.firstname || 'Non renseigné'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><Phone className="h-4 w-4 mt-0.5" /><span>{profile?.phone || 'Non renseigné'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><Mail className="h-4 w-4 mt-0.5" /><span>{profile?.email || 'Non renseigné'}</span></p>
                <p className="flex items-start gap-2 text-muted-foreground"><Calendar className="h-4 w-4 mt-0.5" /><span>{formattedBirthDate}</span></p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/settings/establishment')}>
                Modifier l'établissement
              </Button>
              <Button variant="outline" onClick={() => navigate('/settings/profile')}>
                Modifier l'utilisateur
              </Button>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Button onClick={handleActivate} disabled={activating}>
                {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {activating ? 'Redirection vers Stripe...' : 'Activer la commande en ligne'}
              </Button>
              <p className="max-w-sm text-xs text-muted-foreground sm:text-right">
                Vous allez être redirigé vers notre plateforme de paiement sécurisée.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-bold">ScanNOrder</h1>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">URL d'accès:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className={`px-3 py-2 bg-muted rounded text-sm font-mono truncate ${accessUrl ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {accessUrl || 'Indisponible'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCopyDialogOpen(true)}
                    disabled={!accessUrl}
                    title="Copier l'URL"
                    className="flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <CopyLinkSourceDialog
                    open={copyDialogOpen}
                    onOpenChange={setCopyDialogOpen}
                    url={accessUrl}
                    onCopy={copyToClipboard}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openInNewTab}
                    disabled={!accessUrl}
                    title="Ouvrir dans un nouvel onglet"
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground md:hidden">
                Votre carte en ligne, et la commande en ligne une fois l'encaissement activé
              </p>
            </div>
            <p className="text-sm text-muted-foreground hidden md:block">
              Votre carte en ligne, et la commande en ligne une fois l'encaissement activé
            </p>
          </div>
        }
      >
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Commande en ligne : Stripe sert uniquement à encaisser */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${canOrder ? 'bg-green-500' : 'bg-muted-foreground/40'}`}></div>
                  <CardTitle className="text-base text-foreground">Commande en ligne</CardTitle>
                </div>
                {stripeReady && (
                  <Switch
                    checked={orderingSwitchOn}
                    onCheckedChange={handleOrderingToggle}
                    disabled={switching !== null}
                    aria-label="Commande en ligne"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {!stripeReady ? (
                <>
                  <p>Votre carte est déjà consultable. Activez l'encaissement pour recevoir des commandes payées en ligne.</p>
                  <Button size="sm" onClick={() => setShowActivationDialog(true)}>
                    Activer la commande en ligne
                  </Button>
                </>
              ) : canOrder ? (
                <p>Vos clients peuvent commander et payer en ligne.</p>
              ) : orderingSwitchOn ? (
                <p>Commande indisponible : vérifiez votre compte de paiement (ci-dessous) ou votre abonnement.</p>
              ) : (
                <p>Commande coupée : vos clients consultent la carte et vous contactent pour commander.</p>
              )}
            </CardContent>
          </Card>

          {/* Affichage de la carte, indépendant de la commande */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${storefrontOn ? 'bg-green-500' : 'bg-muted-foreground/40'}`}></div>
                  <CardTitle className="text-base text-foreground">Affichage de la carte</CardTitle>
                </div>
                <Switch
                  checked={storefrontOn}
                  onCheckedChange={handleStorefrontToggle}
                  disabled={switching !== null}
                  aria-label="Affichage de la carte"
                />
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {storefrontOn
                ? "Votre carte est visible à l'URL d'accès ci-dessus."
                : 'Carte masquée : le lien affiche « Carte indisponible » et rien ne peut être commandé.'}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Etat des commandes
                </CardTitle>
                <EstablishmentOperationsModal triggerMode="icon" />
              </div>
            </CardHeader>
            <CardContent>
              {closureDate ? (
                <>
                  <div className="text-xl font-semibold text-amber-600">
                    Ferme jusqu a {closureDate.toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </>
              ) : canOrder ? (
                  <div className="text-xl font-semibold text-green-600">Accepte les commandes</div>
              ) : (
                  <div className="text-xl font-semibold text-muted-foreground">Carte seule</div>
              )}
            </CardContent>
          </Card>
        </div>

          <ConfirmDialog
            open={showDisableDialog}
            onOpenChange={setShowDisableDialog}
            title="Couper la commande en ligne"
            description="Vos clients ne pourront plus commander ni payer sur ScanNOrder. Votre carte reste visible, avec l'invitation à vous contacter pour commander."
            onConfirm={() => updateSwitch('ordering', { active: false }, 'Commande en ligne coupée')}
            isLoading={switching === 'ordering'}
            isDangerous={true}
          />

          <ConfirmDialog
            open={showHideStorefrontDialog}
            onOpenChange={setShowHideStorefrontDialog}
            title="Masquer la carte"
            description="Le lien et les QR codes ScanNOrder afficheront « Carte indisponible » et plus aucune commande ne sera possible. Vous pourrez la réafficher à tout moment."
            onConfirm={() => updateSwitch('storefront', { storefront_enabled: false }, 'Carte masquée')}
            isLoading={switching === 'storefront'}
            isDangerous={true}
          />

          {activationDialog}

        {/* ═══ Stripe Status Card ═══ */}
        {stripeReady && <StripeStatusCard active={true} />}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-8">
          {/* Revenue — en surbrillance */}
          <Card className="bg-gradient-primary border-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/90">
                Chiffre d'affaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {kpis !== null ? new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: getMerchantCurrency(),
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(kpis.revenue / 100) : '—'}
              </div>
              <p className="text-xs text-white/80 mt-1">Par ScanNOrder</p>
            </CardContent>
          </Card>

          {/* Stripe Balance */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Solde actuel
                  <InfoTooltip
                    title="À propos du solde et des paiements"
                    description={
                      `Le solde actuel correspond à l'argent déjà prélevé, prêt pour le prochain versement vers votre compte bancaire.\n\n` +
                      `La section "En attente" indique les fonds qui seront bientôt disponibles (paiements en cours de validation).\n\n` +
                      `Tous les versements sont effectués automatiquement le 7 de chaque mois.`
                    }
                  />
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stripeBalance !== null
                  ? new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: getMerchantCurrency(),
                      minimumFractionDigits: 0,
                    }).format(stripeBalance.available / 100)
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En attente&nbsp;:
                {stripeBalance !== null
                  ? ` ${new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: getMerchantCurrency(),
                      minimumFractionDigits: 0,
                    }).format(stripeBalance.pending / 100)}`
                  : ' —'}
              </p>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis !== null ? kpis.orders : '—'}</div>
              <p className="text-xs text-muted-foreground mt-1">Commandes totales</p>
            </CardContent>
          </Card>

          {/* Average Basket */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Panier moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis !== null ? new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: getMerchantCurrency(),
                  minimumFractionDigits: 0,
                }).format(kpis.avg_basket / 100) : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Montant moyen</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <TabSystem
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            renderContent={renderTabContent}
          />
        </div>

        {/* Actions — l'onglet Référencement a son propre enregistrement */}
        {activeTab !== 'seo' && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/integrations/overview')}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-32"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
