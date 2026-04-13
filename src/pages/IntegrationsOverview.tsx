import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { integrationsService, type IntegrationStatus } from '@/services/integrationsService';
import { CheckCircle, AlertCircle, ArrowRight, Euro, ShoppingCart, TrendingUp, Copy, ExternalLink, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IntegrationOverviewProps {
  platform: string;
  status: IntegrationStatus | null;
  loading: boolean;
  icon: React.ReactNode;
  path: string;
}

const IntegrationOverview = ({ platform, status, loading, icon, path }: IntegrationOverviewProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const isActive = status.active;

  return (
    <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${!isActive ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{platform}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {isActive ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactif
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(path)}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      {isActive && (
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {/* Revenue */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Euro className="h-4 w-4" />
              </div>
              <div className="font-semibold">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(status.kpis.revenue / 100)}
              </div>
              <div className="text-xs text-muted-foreground">CA</div>
            </div>

            {/* Orders */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="font-semibold">{status.kpis.orders}</div>
              <div className="text-xs text-muted-foreground">Commandes</div>
            </div>

            {/* Avg Basket */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="font-semibold">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(status.kpis.avg_basket / 100)}
              </div>
              <div className="text-xs text-muted-foreground">Panier moyen</div>
            </div>
          </div>

          {/* Commission Rate */}
          <div className="mt-4 pt-4 border-t text-sm">
            <p className="text-muted-foreground">Taux de commission: <span className="font-semibold text-foreground">{status.commission_rate}%</span></p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

interface ScanNOrderStatusProps {
  status: IntegrationStatus | null;
  loading: boolean;
  icon: React.ReactNode;
  accessUrl?: string;
  path?: string;
}

const ScanNOrderOverview = ({ status, loading, icon, accessUrl = 'https://app.scanorder.com', path = '/integrations/scannorder' }: ScanNOrderStatusProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const isActive = status.active;

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

  return (
    <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${!isActive ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">ScanNOrder</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {isActive ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactif
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(path)}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      {isActive && (
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {/* Revenue */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Euro className="h-4 w-4" />
              </div>
              <div className="font-semibold">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(status.kpis.revenue / 100)}
              </div>
              <div className="text-xs text-muted-foreground">CA</div>
            </div>

            {/* Orders */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="font-semibold">{status.kpis.orders}</div>
              <div className="text-xs text-muted-foreground">Commandes</div>
            </div>

            {/* Avg Basket */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="font-semibold">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(status.kpis.avg_basket / 100)}
              </div>
              <div className="text-xs text-muted-foreground">Panier moyen</div>
            </div>
          </div>

          {/* Access URL */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">URL d'accès:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono text-foreground truncate">
                {accessUrl}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                title="Copier l'URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={openInNewTab}
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default function IntegrationsOverviewPage() {
  const [uberStatus, setUberStatus] = useState<IntegrationStatus | null>(null);
  const [deliverooStatus, setDeliverooStatus] = useState<IntegrationStatus | null>(null);
  const [scanNOrderStatus, setScanNOrderStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      integrationsService.getUberEatsStatus(),
      integrationsService.getDeliverooStatus(),
    ])
      .then(([uber, deliveroo]) => {
        setUberStatus(uber);
        setDeliverooStatus(deliveroo);
        // Mock ScanNOrder data (copié d'Uber Eats)
        setScanNOrderStatus({
          ...uber,
          platform: 'scanorder' as any,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const activeCount = (uberStatus?.active ? 1 : 0) + (deliverooStatus?.active ? 1 : 0) + (scanNOrderStatus?.active ? 1 : 0);
  const totalRevenue =
    (uberStatus?.kpis.revenue || 0) + (deliverooStatus?.kpis.revenue || 0) + (scanNOrderStatus?.kpis.revenue || 0);
  const totalOrders =
    (uberStatus?.kpis.orders || 0) + (deliverooStatus?.kpis.orders || 0) + (scanNOrderStatus?.kpis.orders || 0);

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <h1 className="text-3xl font-bold text-foreground">Canaux et Plateformes</h1>
        }
        description="Gérez vos intégrations avec les plateformes de livraison et consultez vos KPIs"
        className="space-y-6"
      >
        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Integrations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Intégrations actives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">sur 3 plateformes</p>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Chiffre d'affaires total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(totalRevenue / 100)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">tous les canaux</p>
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Commandes totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">tous les canaux</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IntegrationOverview
            platform="Uber Eats"
            status={uberStatus}
            loading={loading}
            icon={<span className="text-lg">🍽️</span>}
            path="/integrations/uber-eats"
          />
          <IntegrationOverview
            platform="Deliveroo"
            status={deliverooStatus}
            loading={loading}
            icon={<span className="text-lg">🏪</span>}
            path="/integrations/deliveroo"
          />
          <ScanNOrderOverview
            status={scanNOrderStatus}
            loading={loading}
            icon={<Search className="h-5 w-5 text-primary" />}
            accessUrl="https://app.scanorder.com"
          />
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
