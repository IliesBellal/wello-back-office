import { useState, useEffect, useRef } from 'react';
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
import {
  getOnlineOrdersConfig,
  updateOnlineOrdersConfig,
  uploadLogo,
  uploadBanner,
  OnlineOrdersConfig,
} from '@/services/onlineOrdersService';
import { AlertCircle, Upload, Copy, ExternalLink, Power, Euro, ShoppingCart, TrendingUp, Wallet, Loader2, Store, User, Phone, FileText, MapPin, Globe, Mail, Calendar } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { integrationsService, type IntegrationStatus } from '@/services/integrationsService';
import { settingsService } from '@/services/settingsService';
import { type UserProfile, type EstablishmentSettings } from '@/types/settings';
import { useToast } from '@/hooks/use-toast';
import { EstablishmentClosureModal } from '@/components/integrations/EstablishmentClosureModal';

// ════════════════════════════════════════════════════════════════════════════
// ImageUploadField Component
// ════════════════════════════════════════════════════════════════════════════
interface ImageUploadFieldProps {
  label: string;
  preview: string;
  isLogo?: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ImageUploadField({
  label,
  preview,
  isLogo = false,
  onUpload,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div
        onClick={handleClick}
        className="relative flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary hover:bg-muted/50"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt={label}
            className={`max-h-full max-w-full rounded-lg object-contain ${
              isLogo ? 'h-20 w-20' : 'h-32 w-full'
            }`}
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
  const accessUrl = 'https://app.scanorder.com';
  const [stripeBalance, setStripeBalance] = useState<{ available: number; pending: number } | null>(null);
  const [kpis, setKpis] = useState<{ revenue: number; orders: number; avg_basket: number } | null>(null);
  const [scanStatus, setScanStatus] = useState<IntegrationStatus | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [establishment, setEstablishment] = useState<EstablishmentSettings | null>(null);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disabling, setDisabling] = useState(false);
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
        if (status.active) {
          integrationsService.getStripeBalance()
            .then(setStripeBalance)
            .catch(() => {/* balance stays null */});
          // Si besoin d'appeler getStripeStatus, ajouter ici
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

    try {
      const url = await uploadBanner(file);
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accessUrl);
    toast({
      title: 'Copié !',
      description: 'L\'URL d\'accès a été copiée dans le presse-papiers.',
    });
  };

  const openInNewTab = () => {
    window.open(accessUrl, '_blank');
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      // TODO: Implement disable functionality
      console.log('ScanNOrder integration disabled');
    } finally {
      setDisabling(false);
    }
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
              Téléchargez la bannière de votre plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploadField
              label="Sélectionner une bannière"
              preview={bannerPreview}
              isLogo={false}
              onUpload={handleBannerUpload}
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
                  <Input
                    id="primary-color"
                    type="color"
                    value={config?.primary_color || '#3b82f6'}
                    onChange={(e) =>
                      handleConfigChange('primary_color', e.target.value)
                    }
                    className="h-12 w-20 cursor-pointer"
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
                  <Input
                    id="text-color"
                    type="color"
                    value={config?.text_color || '#ffffff'}
                    onChange={(e) =>
                      handleConfigChange('text_color', e.target.value)
                    }
                    className="h-12 w-20 cursor-pointer"
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
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Apparence' },
    { id: 'modes', label: 'Commandes' },
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

  if (scanStatus && !scanStatus.active) {
    return (
      <DashboardLayout>
        <PageContainer
          header={
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">ScanNOrder</h1>
              <p className="text-sm text-muted-foreground">
                Vérifiez les informations avant d'activer l'intégration.
              </p>
            </div>
          }
          className="space-y-6"
        >
          <Card className="border-yellow-300/60 bg-yellow-100/60 dark:border-yellow-800 dark:bg-yellow-950/30">
            <CardContent className="pt-6 text-sm text-yellow-900 dark:text-yellow-200">
              Merci de vous assurer que les données ci-dessous sont correctes. Si nécessaire, modifiez-les dans les paramètres avant activation.
            </CardContent>
          </Card>

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
                {activating ? 'Redirection vers Stripe...' : 'Activer ScanNOrder'}
              </Button>
              <p className="max-w-sm text-xs text-muted-foreground sm:text-right">
                Vous allez être redirigé vers notre plateforme de paiement sécurisée.
              </p>
            </div>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

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
                  <code className="px-3 py-2 bg-muted rounded text-sm font-mono text-foreground truncate">
                    {accessUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copier l'URL"
                    className="flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openInNewTab}
                    title="Ouvrir dans un nouvel onglet"
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground md:hidden">
                Configurez votre plateforme de commande en ligne
              </p>
            </div>
            <p className="text-sm text-muted-foreground hidden md:block">
              Configurez votre plateforme de commande en ligne
            </p>
          </div>
        }
      >
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <CardTitle className="text-foreground">
                    Intégration active
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDisableDialog(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  title="Désactiver ScanNOrder"
                  aria-label="Désactiver ScanNOrder"
                  disabled={disabling}
                >
                  {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Etat des commandes
                </CardTitle>
                <EstablishmentClosureModal triggerMode="icon" />
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
              ) : (
                  <div className="text-xl font-semibold text-green-600">Accepte les commandes</div>
              )}
            </CardContent>
          </Card>
        </div>

          <ConfirmDialog
            open={showDisableDialog}
            onOpenChange={setShowDisableDialog}
            title="Désactiver l'intégration ScanNOrder"
            description="Êtes-vous sûr de vouloir désactiver ScanNOrder ? Les commandes ne seront plus reçues de cette plateforme."
            onConfirm={handleDisable}
            isLoading={disabling}
            isDangerous={true}
          />

        {/* ═══ Stripe Status Card ═══ */}
        {scanStatus?.active && <StripeStatusCard active={true} />}

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
                  currency: 'EUR',
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
                      currency: 'EUR',
                      minimumFractionDigits: 0,
                    }).format(stripeBalance.available / 100)
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En attente&nbsp;:
                {stripeBalance !== null
                  ? ` ${new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
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
                  currency: 'EUR',
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

        {/* Actions */}
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
      </PageContainer>
    </DashboardLayout>
  );
}
