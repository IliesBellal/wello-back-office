import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import {
  getOnlineOrdersConfig,
  updateOnlineOrdersConfig,
  uploadLogo,
  uploadBanner,
  OnlineOrdersConfig,
} from '@/services/onlineOrdersService';
import { AlertCircle, ChevronLeft } from 'lucide-react';

export default function OnlineOrders() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<OnlineOrdersConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');

  // Fetch config on mount
  useEffect(() => {
    fetchConfig();
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
      // Show success message (could use toast)
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setSaving(false);
    }
  };

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
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/integrations/overview')}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Commandes en ligne</h1>
            <p className="text-gray-600">
              Configurez votre plateforme de commande en ligne
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appearance">Apparence</TabsTrigger>
            <TabsTrigger value="modes">Modes de livraison</TabsTrigger>
          </TabsList>

          {/* Tab 1: Apparence */}
          <TabsContent value="appearance" className="space-y-6">
            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>
                  Téléchargez le logo de votre plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1">
                    <Label htmlFor="logo-upload" className="mb-2 block">
                      Sélectionner un logo
                    </Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </div>
                  {logoPreview && (
                    <div className="flex-shrink-0">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Banner */}
            <Card>
              <CardHeader>
                <CardTitle>Bannière</CardTitle>
                <CardDescription>
                  Téléchargez la bannière de votre plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="banner-upload" className="mb-2 block">
                      Sélectionner une bannière
                    </Label>
                    <Input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                    />
                  </div>
                  {bannerPreview && (
                    <div>
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="w-full rounded-lg object-cover"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Primary Color */}
            <Card>
              <CardHeader>
                <CardTitle>Couleur principale</CardTitle>
                <CardDescription>
                  Choisissez la couleur principale de votre plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    value={config.primary_color}
                    onChange={(e) =>
                      handleConfigChange('primary_color', e.target.value)
                    }
                    className="h-12 w-20 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">
                    {config.primary_color}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Header */}
            <Card>
              <CardHeader>
                <CardTitle>En-tête</CardTitle>
                <CardDescription>
                  Configurez le titre et le texte de l'en-tête
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="header-title" className="mb-2 block">
                    Titre
                  </Label>
                  <Input
                    id="header-title"
                    value={config.header_title}
                    onChange={(e) =>
                      handleConfigChange('header_title', e.target.value)
                    }
                    placeholder="Titre de l'en-tête"
                  />
                </div>
                <div>
                  <Label htmlFor="header-text" className="mb-2 block">
                    Texte
                  </Label>
                  <Input
                    id="header-text"
                    value={config.header_text}
                    onChange={(e) =>
                      handleConfigChange('header_text', e.target.value)
                    }
                    placeholder="Texte descriptif"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Links */}
            <Card>
              <CardHeader>
                <CardTitle>Liens</CardTitle>
                <CardDescription>
                  Configurez les liens importants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cgv-link" className="mb-2 block">
                    Lien CGV
                  </Label>
                  <Input
                    id="cgv-link"
                    type="url"
                    value={config.cgv_link}
                    onChange={(e) =>
                      handleConfigChange('cgv_link', e.target.value)
                    }
                    placeholder="https://example.com/cgv"
                  />
                </div>
                <div>
                  <Label htmlFor="return-policy" className="mb-2 block">
                    Lien politique de retour
                  </Label>
                  <Input
                    id="return-policy"
                    type="url"
                    value={config.return_policy_link}
                    onChange={(e) =>
                      handleConfigChange('return_policy_link', e.target.value)
                    }
                    placeholder="https://example.com/return-policy"
                  />
                </div>
                <div>
                  <Label htmlFor="legal-notices" className="mb-2 block">
                    Lien mentions légales
                  </Label>
                  <Input
                    id="legal-notices"
                    type="url"
                    value={config.legal_notices_link}
                    onChange={(e) =>
                      handleConfigChange('legal_notices_link', e.target.value)
                    }
                    placeholder="https://example.com/legal"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Modes */}
          <TabsContent value="modes" className="space-y-6">
            {/* Takeaway Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Mode à emporter</CardTitle>
                <CardDescription>
                  Activez et configurez le mode à emporter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="takeaway-enabled">Activer à emporter</Label>
                  <Switch
                    id="takeaway-enabled"
                    checked={config.takeaway_enabled}
                    onCheckedChange={(checked) =>
                      handleConfigChange('takeaway_enabled', checked)
                    }
                  />
                </div>
                {config.takeaway_enabled && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <Label htmlFor="takeaway-auto-accept">
                      Acceptation automatique des commandes
                    </Label>
                    <Switch
                      id="takeaway-auto-accept"
                      checked={config.takeaway_auto_accept}
                      onCheckedChange={(checked) =>
                        handleConfigChange('takeaway_auto_accept', checked)
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Mode livraison</CardTitle>
                <CardDescription>
                  Activez et configurez le mode livraison
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="delivery-enabled">Activer livraison</Label>
                  <Switch
                    id="delivery-enabled"
                    checked={config.delivery_enabled}
                    onCheckedChange={(checked) =>
                      handleConfigChange('delivery_enabled', checked)
                    }
                  />
                </div>
                {config.delivery_enabled && (
                  <>
                    <div className="flex items-center justify-between border-t pt-4">
                      <Label htmlFor="delivery-auto-accept">
                        Acceptation automatique des commandes
                      </Label>
                      <Switch
                        id="delivery-auto-accept"
                        checked={config.delivery_auto_accept}
                        onCheckedChange={(checked) =>
                          handleConfigChange('delivery_auto_accept', checked)
                        }
                      />
                    </div>
                    <div className="border-t pt-4">
                      <Label htmlFor="delivery-distance" className="mb-2 block">
                        Distance maximale de livraison (km)
                      </Label>
                      <Input
                        id="delivery-distance"
                        type="number"
                        min="0"
                        step="0.5"
                        value={config.delivery_distance_limit}
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
          </TabsContent>
        </Tabs>

        {/* Save Button */}
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
      </div>
    </DashboardLayout>
  );
}
