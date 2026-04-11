import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { IntegrationStatus } from '@/services/integrationsService';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Power } from 'lucide-react';

interface IntegrationCardProps {
  name: string;
  status: IntegrationStatus | null;
  loading: boolean;
  onUpdate: (data: { commission_rate: number; auto_accept_orders: boolean }) => Promise<void>;
  onDisable: () => Promise<void>;
  onSync: () => Promise<void>;
  tutorial: React.ReactNode;
}

export const IntegrationCard = ({
  name,
  status,
  loading,
  onUpdate,
  onDisable,
  onSync,
  tutorial,
}: IntegrationCardProps) => {
  const [editMode, setEditMode] = useState(false);
  const [commissionRate, setCommissionRate] = useState(status?.commission_rate || 0);
  const [autoAccept, setAutoAccept] = useState(status?.auto_accept_orders || false);
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  useEffect(() => {
    if (status) {
      setCommissionRate(status.commission_rate);
      setAutoAccept(status.auto_accept_orders);
    }
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        commission_rate: commissionRate,
        auto_accept_orders: autoAccept,
      });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      await onDisable();
      setShowDisableDialog(false);
    } finally {
      setDisabling(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
      setShowSyncDialog(false);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  if (!status.active) {
    return (
      <div className="space-y-6">
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle>Intégration non active</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
            Veuillez configurer votre intégration {name} pour commencer.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Guide d'intégration {name}</CardTitle>
          </CardHeader>
          <CardContent>
            {tutorial}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <CardTitle className="text-green-700 dark:text-green-300">
                  Intégration active
                </CardTitle>
                {status.last_sync && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Dernière synchronisation: {new Date(status.last_sync).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDisableDialog(true)}
              disabled={disabling}
            >
              {disabling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Power className="h-4 w-4 mr-2" />
              Désactiver
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chiffre d'affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
              }).format(status.kpis.revenue / 100)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Par {name.toLowerCase()}</p>
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
            <div className="text-2xl font-bold">{status.kpis.orders}</div>
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
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
              }).format(status.kpis.avg_basket / 100)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Montant moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Configuration</CardTitle>
            {editMode && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sync Button */}
          <div className="pb-6 border-b">
            <Button
              onClick={() => setShowSyncDialog(true)}
              disabled={syncing}
              className="w-full sm:w-auto"
            >
              {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <RefreshCw className="h-4 w-4 mr-2" />
              Synchroniser avec le menu Wello Resto
            </Button>
            {status.synced_items > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {status.synced_items} articles synchronisés
              </p>
            )}
          </div>

          {editMode ? (
            <>
              {/* Commission Rate Edit */}
              <div className="space-y-2">
                <Label htmlFor="commission">Taux de commission (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Commission prélevée par {name.toLowerCase()}
                </p>
              </div>

              {/* Auto Accept Switch Edit */}
              <div className="flex items-center justify-between py-3 px-3 rounded-lg border">
                <div>
                  <Label htmlFor="auto-accept" className="font-medium cursor-pointer">
                    Acceptation automatique des commandes
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepter automatiquement les nouvelles commandes
                  </p>
                </div>
                <Switch
                  id="auto-accept"
                  checked={autoAccept}
                  onCheckedChange={setAutoAccept}
                />
              </div>

              {/* Edit Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-auto"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  className="flex-1 sm:flex-auto"
                >
                  Annuler
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Commission Rate View */}
              <div className="flex items-center justify-between py-3 px-3 rounded-lg border">
                <div>
                  <p className="font-medium">Taux de commission</p>
                  <p className="text-xs text-muted-foreground">{commissionRate}%</p>
                </div>
              </div>

              {/* Auto Accept Switch View */}
              <div className="flex items-center justify-between py-3 px-3 rounded-lg border">
                <div>
                  <p className="font-medium">Acceptation automatique</p>
                  <p className="text-xs text-muted-foreground">
                    {autoAccept ? 'Activée' : 'Désactivée'}
                  </p>
                </div>
                <Badge variant={autoAccept ? 'default' : 'secondary'}>
                  {autoAccept ? 'ON' : 'OFF'}
                </Badge>
              </div>

              {/* Edit Button */}
              <Button
                variant="outline"
                onClick={() => setEditMode(true)}
                className="w-full sm:w-auto"
              >
                Modifier la configuration
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Disable Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l'intégration {name}</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir désactiver {name}? Les commandes ne seront plus reçues de cette plateforme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Non, continuer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disabling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Oui, désactiver
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync Dialog */}
      <AlertDialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Synchroniser le menu {name}</AlertDialogTitle>
            <AlertDialogDescription>
              Synchroniser votre menu Wello Resto avec {name}? Cela mettra à jour via les articles et prix.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Synchroniser
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
