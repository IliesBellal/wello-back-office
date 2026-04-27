import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { TabSystem, PageContainer } from '@/components/shared';
import { StripeStatusCard } from '@/components/integrations/StripeStatusCard';
import { BankAccountsTab } from '@/components/integrations/BankAccountsTab';
import {
  getOnlineOrdersConfig,
  updateOnlineOrdersConfig,
  uploadLogo,
  uploadBanner,
  OnlineOrdersConfig,
} from '@/services/onlineOrdersService';
import { AlertCircle, Upload, Copy, ExternalLink, Power, Euro, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { integrationsService } from '@/services/integrationsService';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    fetchConfig();
    integrationsService.getStripeBalance()
      .then(setStripeBalance)
      .catch(() => {/* balance stays null */});
    integrationsService.getScanNOrderStatus()
      .then(status => setKpis(status.kpis))
      .catch(() => {/* kpis stay null */});
  }, []);

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
    // TODO: Implement disable functionality
    console.log('ScanNOrder integration disabled');
  };

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

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">ScanNOrder</h1>
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
        {/* Status Card */}
        <Card className="mb-8">
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
                size="sm"
                onClick={handleDisable}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Power className="h-4 w-4 mr-2" />
                Désactiver
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* ═══ Stripe Status Card ═══ */}
        <StripeStatusCard />

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
