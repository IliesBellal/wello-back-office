import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, TabSystem, ConfirmDialog } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  HaccpSettings,
  HaccpTemperatureZone,
  HaccpCleaningZone,
  HaccpCleaningSurface,
  CreateHaccpTemperatureZonePayload,
  UpdateHaccpTemperatureZonePayload,
  CreateHaccpCleaningZonePayload,
  UpdateHaccpCleaningZonePayload,
  UpsertHaccpCleaningSurfacePayload,
  getHaccpSettings,
  updateHaccpSettings,
  getHaccpTemperatureZones,
  createHaccpTemperatureZone,
  updateHaccpTemperatureZone,
  deleteHaccpTemperatureZone,
  getHaccpCleaningZones,
  createHaccpCleaningZone,
  updateHaccpCleaningZone,
  deleteHaccpCleaningZone,
  getHaccpCleaningSurfaces,
  createHaccpCleaningSurface,
  updateHaccpCleaningSurface,
  deleteHaccpCleaningSurface,
} from '@/services/haccpService';

type HaccpSettingsKey = keyof HaccpSettings;
type FrequencyUnit = UpsertHaccpCleaningSurfacePayload['frequency_unit'];

type DeleteCandidate =
  | { type: 'temperature-zone'; id: string; label: string }
  | { type: 'cleaning-zone'; id: string; label: string }
  | { type: 'cleaning-surface'; id: string; label: string }
  | null;

const GENERAL_FIELDS: Array<{ key: HaccpSettingsKey; label: string; description: string }> = [
  {
    key: 'temp_entry_required',
    label: 'Saisie des températures obligatoire',
    description: 'Oblige les équipes à saisir les relevés de température selon le process défini.',
  },
  {
    key: 'temp_corrective_actions',
    label: 'Action corrective obligatoire (températures)',
    description: 'Si un relevé est hors plage, une action corrective/commentaire doit être renseigné.',
  },
  {
    key: 'temp_failure_photo_required',
    label: 'Photo obligatoire en cas d’échec (températures)',
    description: 'Exige une photo justificative lorsqu’un relevé de température est non conforme.',
  },
  {
    key: 'temp_block_past_dates',
    label: 'Bloquer les dates passées (températures)',
    description: 'Empêche de créer/modifier des relevés de température sur des dates antérieures.',
  },
  {
    key: 'traceability_product_name',
    label: 'Nom produit obligatoire (traçabilité)',
    description: 'Rend le nom du produit obligatoire dans les saisies de traçabilité.',
  },
  {
    key: 'traceability_block_past_dates',
    label: 'Bloquer les dates passées (traçabilité)',
    description: 'Empêche les saisies de traçabilité rétroactives.',
  },
  {
    key: 'cleaning_photo',
    label: 'Photo obligatoire (nettoyage)',
    description: 'Exige une photo comme preuve lors de la validation d’un nettoyage.',
  },
  {
    key: 'cleaning_block_past_dates',
    label: 'Bloquer les dates passées (nettoyage)',
    description: 'Empêche la saisie de nettoyages sur des dates antérieures.',
  },
  {
    key: 'reception_other_products',
    label: 'Activer les autres produits (réception)',
    description: 'Active la gestion d’autres types de produits dans les contrôles de réception.',
  },
  {
    key: 'reception_control_sample',
    label: 'Échantillon de contrôle obligatoire (réception)',
    description: 'Exige la saisie d’un échantillon témoin lors d’un contrôle de réception.',
  },
  {
    key: 'reception_block_past_dates',
    label: 'Bloquer les dates passées (réception)',
    description: 'Empêche les saisies de réception rétroactives.',
  },
  {
    key: 'reception_photo',
    label: 'Photo/facture obligatoire (réception)',
    description: 'Exige une photo ou pièce justificative (facture, bon) à la réception.',
  },
  {
    key: 'reception_non_conformities',
    label: 'Non-conformités obligatoires (réception)',
    description: 'Exige de renseigner les non-conformités détectées lors du contrôle.',
  },
  {
    key: 'oils_block_past_dates',
    label: 'Bloquer les dates passées (huiles)',
    description: 'Empêche les saisies rétroactives pour les contrôles d’huiles.',
  },
  {
    key: 'oils_polar_compound_rate',
    label: 'Taux de composés polaires obligatoire (huiles)',
    description: 'Active/rend obligatoire le contrôle du taux de composés polaires.',
  },
  {
    key: 'oils_photo',
    label: 'Photo obligatoire (huiles)',
    description: 'Exige une photo de preuve pour les contrôles liés aux huiles.',
  },
  {
    key: 'production_block_past_dates',
    label: 'Bloquer les dates passées (production)',
    description: 'Empêche les saisies de production rétroactives.',
  },
  {
    key: 'production_traceability',
    label: 'Traçabilité obligatoire en production',
    description: 'Active/renforce les exigences de traçabilité sur les étapes de production.',
  },
  {
    key: 'cooling_block_past_dates',
    label: 'Bloquer les dates passées (refroidissement)',
    description: 'Empêche les saisies rétroactives sur les contrôles de refroidissement.',
  },
  {
    key: 'freezing_block_past_dates',
    label: 'Bloquer les dates passées (congélation)',
    description: 'Empêche les saisies rétroactives sur les contrôles de congélation.',
  },
  {
    key: 'reheating_block_past_dates',
    label: 'Bloquer les dates passées (remise en température)',
    description: 'Empêche les saisies rétroactives sur les contrôles de remise en température.',
  },
  {
    key: 'holding_block_past_dates',
    label: 'Bloquer les dates passées (maintien en température)',
    description: 'Empêche les saisies rétroactives sur les contrôles de maintien.',
  },
  {
    key: 'holding_corrective_actions',
    label: 'Action corrective obligatoire (maintien en température)',
    description: 'Exige une action corrective/commentaire en cas de non-conformité de maintien.',
  },
  {
    key: 'notif_authorization',
    label: 'Autoriser les notifications HACCP',
    description: 'Active l’envoi des notifications HACCP aux utilisateurs concernés.',
  },
  {
    key: 'notif_security',
    label: 'Notifications sécurité renforcées',
    description: 'Active les notifications liées aux événements HACCP critiques/sécurité.',
  },
];

const TEMPERATURE_FIELDS: HaccpSettingsKey[] = [
  'temp_entry_required',
  'temp_corrective_actions',
  'temp_failure_photo_required',
  'temp_block_past_dates',
  'cooling_block_past_dates',
  'freezing_block_past_dates',
  'reheating_block_past_dates',
  'holding_block_past_dates',
  'holding_corrective_actions',
];

const CLEANING_FIELDS: HaccpSettingsKey[] = [
  'cleaning_photo',
  'cleaning_block_past_dates',
];

const TRACEABILITY_FIELDS: HaccpSettingsKey[] = [
  'traceability_product_name',
  'traceability_block_past_dates',
  'reception_other_products',
  'reception_control_sample',
  'reception_block_past_dates',
  'reception_photo',
  'reception_non_conformities',
  'production_traceability',
  'production_block_past_dates',
];

const OILS_FIELDS: HaccpSettingsKey[] = [
  'oils_block_past_dates',
  'oils_polar_compound_rate',
  'oils_photo',
];

const GENERAL_MISC_FIELDS: HaccpSettingsKey[] = [
  'notif_authorization',
  'notif_security',
];

const defaultTemperatureZoneForm: CreateHaccpTemperatureZonePayload = {
  name: '',
  target_temp_min: 0,
  target_temp_max: 0,
};

const defaultCleaningZoneForm: CreateHaccpCleaningZonePayload = {
  zone: '',
};

const defaultSurfaceForm: UpsertHaccpCleaningSurfacePayload = {
  zone_id: '',
  name: '',
  frequency_unit: 'day',
  frequency_count: 1,
};

const frequencyUnitLabel: Record<FrequencyUnit, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
};

const HaccpSettingsPage = () => {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('general');

  const [settings, setSettings] = useState<HaccpSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [temperatureZones, setTemperatureZones] = useState<HaccpTemperatureZone[]>([]);
  const [loadingTemperatureZones, setLoadingTemperatureZones] = useState(true);
  const [savingTemperatureZone, setSavingTemperatureZone] = useState(false);
  const [editingTemperatureZoneId, setEditingTemperatureZoneId] = useState<string | null>(null);
  const [temperatureZoneDialogOpen, setTemperatureZoneDialogOpen] = useState(false);
  const [temperatureZoneForm, setTemperatureZoneForm] = useState<CreateHaccpTemperatureZonePayload>(defaultTemperatureZoneForm);

  const [cleaningZones, setCleaningZones] = useState<HaccpCleaningZone[]>([]);
  const [loadingCleaningZones, setLoadingCleaningZones] = useState(true);
  const [savingCleaningZone, setSavingCleaningZone] = useState(false);
  const [editingCleaningZoneId, setEditingCleaningZoneId] = useState<string | null>(null);
  const [cleaningZoneDialogOpen, setCleaningZoneDialogOpen] = useState(false);
  const [cleaningZoneForm, setCleaningZoneForm] = useState<CreateHaccpCleaningZonePayload>(defaultCleaningZoneForm);

  const [cleaningSurfaces, setCleaningSurfaces] = useState<HaccpCleaningSurface[]>([]);
  const [loadingCleaningSurfaces, setLoadingCleaningSurfaces] = useState(true);
  const [savingSurface, setSavingSurface] = useState(false);
  const [editingSurfaceId, setEditingSurfaceId] = useState<string | null>(null);
  const [surfaceDialogOpen, setSurfaceDialogOpen] = useState(false);
  const [surfaceForm, setSurfaceForm] = useState<UpsertHaccpCleaningSurfacePayload>(defaultSurfaceForm);

  const [deleteCandidate, setDeleteCandidate] = useState<DeleteCandidate>(null);
  const [deleting, setDeleting] = useState(false);

  const tabs = useMemo(
    () => [
      { id: 'general', label: 'Général' },
      { id: 'temperature-zones', label: 'Zones températures' },
      { id: 'cleaning-zones', label: 'Zones nettoyage' },
    ],
    []
  );

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await getHaccpSettings();
      setSettings(response);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les paramètres HACCP.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadTemperatureZones = async () => {
    setLoadingTemperatureZones(true);
    try {
      const response = await getHaccpTemperatureZones();
      setTemperatureZones(response);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les zones de températures.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTemperatureZones(false);
    }
  };

  const loadCleaningZones = async () => {
    setLoadingCleaningZones(true);
    try {
      const response = await getHaccpCleaningZones();
      setCleaningZones(response);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les zones de nettoyage.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCleaningZones(false);
    }
  };

  const loadCleaningSurfaces = async () => {
    setLoadingCleaningSurfaces(true);
    try {
      const response = await getHaccpCleaningSurfaces();
      setCleaningSurfaces(response);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les surfaces de nettoyage.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCleaningSurfaces(false);
    }
  };

  const refreshCleaningData = async () => {
    await Promise.all([loadCleaningZones(), loadCleaningSurfaces()]);
  };

  useEffect(() => {
    loadSettings();
    loadTemperatureZones();
    refreshCleaningData();
  }, []);

  const handleToggleSetting = (key: HaccpSettingsKey, checked: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: checked,
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSavingSettings(true);
    try {
      const updated = await updateHaccpSettings(settings);
      setSettings(updated);
      toast({
        title: 'Succès',
        description: 'Paramètres HACCP enregistrés.',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer les paramètres HACCP.",
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const resetTemperatureZoneForm = () => {
    setTemperatureZoneForm(defaultTemperatureZoneForm);
    setEditingTemperatureZoneId(null);
    setTemperatureZoneDialogOpen(false);
  };

  const resetCleaningZoneForm = () => {
    setCleaningZoneForm(defaultCleaningZoneForm);
    setEditingCleaningZoneId(null);
    setCleaningZoneDialogOpen(false);
  };

  const resetSurfaceForm = () => {
    setSurfaceForm(defaultSurfaceForm);
    setEditingSurfaceId(null);
    setSurfaceDialogOpen(false);
  };

  const handleSubmitTemperatureZone = async () => {
    const payload: UpdateHaccpTemperatureZonePayload = {
      name: temperatureZoneForm.name.trim(),
      target_temp_min: Number(temperatureZoneForm.target_temp_min),
      target_temp_max: Number(temperatureZoneForm.target_temp_max),
    };

    if (!payload.name) {
      toast({ title: 'Validation', description: 'Le nom de la zone est requis.', variant: 'destructive' });
      return;
    }

    if (payload.target_temp_min >= payload.target_temp_max) {
      toast({
        title: 'Validation',
        description: 'La température min doit être inférieure à la température max.',
        variant: 'destructive',
      });
      return;
    }

    setSavingTemperatureZone(true);
    try {
      if (editingTemperatureZoneId) {
        await updateHaccpTemperatureZone(editingTemperatureZoneId, payload);
        toast({ title: 'Succès', description: 'Zone de température mise à jour.' });
      } else {
        await createHaccpTemperatureZone(payload);
        toast({ title: 'Succès', description: 'Zone de température créée.' });
      }
      await loadTemperatureZones();
      resetTemperatureZoneForm();
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la zone.", variant: 'destructive' });
    } finally {
      setSavingTemperatureZone(false);
    }
  };

  const handleSubmitCleaningZone = async () => {
    const payload: UpdateHaccpCleaningZonePayload = {
      zone: cleaningZoneForm.zone.trim(),
    };

    if (!payload.zone) {
      toast({ title: 'Validation', description: 'Le nom de la zone est requis.', variant: 'destructive' });
      return;
    }

    setSavingCleaningZone(true);
    try {
      if (editingCleaningZoneId) {
        await updateHaccpCleaningZone(editingCleaningZoneId, payload);
        toast({ title: 'Succès', description: 'Zone de nettoyage mise à jour.' });
      } else {
        await createHaccpCleaningZone(payload);
        toast({ title: 'Succès', description: 'Zone de nettoyage créée.' });
      }
      await refreshCleaningData();
      resetCleaningZoneForm();
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer la zone de nettoyage.",
        variant: 'destructive',
      });
    } finally {
      setSavingCleaningZone(false);
    }
  };

  const handleSubmitSurface = async () => {
    const payload: UpsertHaccpCleaningSurfacePayload = {
      zone_id: surfaceForm.zone_id,
      name: surfaceForm.name.trim(),
      frequency_unit: surfaceForm.frequency_unit,
      frequency_count: Number(surfaceForm.frequency_count),
    };

    if (!payload.zone_id || !payload.name) {
      toast({ title: 'Validation', description: 'Zone et nom de surface sont requis.', variant: 'destructive' });
      return;
    }

    if (payload.frequency_count < 1) {
      toast({ title: 'Validation', description: 'La fréquence doit être supérieure ou égale à 1.', variant: 'destructive' });
      return;
    }

    setSavingSurface(true);
    try {
      if (editingSurfaceId) {
        await updateHaccpCleaningSurface(editingSurfaceId, payload);
        toast({ title: 'Succès', description: 'Surface mise à jour.' });
      } else {
        await createHaccpCleaningSurface(payload);
        toast({ title: 'Succès', description: 'Surface créée.' });
      }
      await refreshCleaningData();
      resetSurfaceForm();
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la surface.", variant: 'destructive' });
    } finally {
      setSavingSurface(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;

    setDeleting(true);
    try {
      if (deleteCandidate.type === 'temperature-zone') {
        await deleteHaccpTemperatureZone(deleteCandidate.id);
        await loadTemperatureZones();
        if (editingTemperatureZoneId === deleteCandidate.id) {
          resetTemperatureZoneForm();
        }
        toast({ title: 'Succès', description: 'Zone de température supprimée.' });
      }

      if (deleteCandidate.type === 'cleaning-zone') {
        await deleteHaccpCleaningZone(deleteCandidate.id);
        await refreshCleaningData();
        if (editingCleaningZoneId === deleteCandidate.id) {
          resetCleaningZoneForm();
        }
        toast({ title: 'Succès', description: 'Zone de nettoyage supprimée.' });
      }

      if (deleteCandidate.type === 'cleaning-surface') {
        await deleteHaccpCleaningSurface(deleteCandidate.id);
        await refreshCleaningData();
        if (editingSurfaceId === deleteCandidate.id) {
          resetSurfaceForm();
        }
        toast({ title: 'Succès', description: 'Surface supprimée.' });
      }

      setDeleteCandidate(null);
    } catch {
      toast({ title: 'Erreur', description: 'Suppression impossible.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const renderGeneralTab = () => {
    if (loadingSettings || !settings) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    const fieldMap = new Map(GENERAL_FIELDS.map((field) => [field.key, field]));

    const renderSettingsGroupCard = (
      title: string,
      description: string,
      keys: HaccpSettingsKey[]
    ) => (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {keys.map((key) => {
            const field = fieldMap.get(key);
            if (!field) return null;

            return (
              <div
                key={field.key}
                className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => handleToggleSetting(field.key, !settings[field.key])}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleToggleSetting(field.key, !settings[field.key]);
                  }
                }}
              >
                <div className="pr-4">
                  <Label htmlFor={field.key} className="text-sm font-medium">
                    {field.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                </div>
                <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  <Switch
                    id={field.key}
                    checked={settings[field.key]}
                    onCheckedChange={(checked) => handleToggleSetting(field.key, checked)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSettingsGroupCard('Général', 'Préférences globales et notifications HACCP.', GENERAL_MISC_FIELDS)}
        {renderSettingsGroupCard('Nettoyage', 'Règles de validation et contraintes des activités de nettoyage.', CLEANING_FIELDS)}
        {renderSettingsGroupCard('Températures', 'Réglages de relevés de température et contraintes associées.', TEMPERATURE_FIELDS)}
        {renderSettingsGroupCard('Traçabilité', 'Paramètres de traçabilité et de réception des produits.', TRACEABILITY_FIELDS)}
        {renderSettingsGroupCard('Huiles', 'Options de suivi et contrôle des huiles.', OILS_FIELDS)}

        <div className="flex justify-end pt-2 lg:col-span-2">
          <Button onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    );
  };

  const renderTemperatureZonesTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Zones existantes</CardTitle>
              <Button
                onClick={() => {
                  setEditingTemperatureZoneId(null);
                  setTemperatureZoneForm(defaultTemperatureZoneForm);
                  setTemperatureZoneDialogOpen(true);
                }}
              >
                Créer une zone
              </Button>
            </div>
            <CardDescription>Configurez vos zones de contrôle de température HACCP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingTemperatureZones ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : temperatureZones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune zone définie.</p>
            ) : (
              temperatureZones.map((zone) => (
                <div key={zone.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-md p-3">
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Cible: {zone.target_temp_min} °C à {zone.target_temp_max} °C
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={zone.enabled ? 'default' : 'secondary'}>{zone.enabled ? 'Active' : 'Inactive'}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTemperatureZoneId(zone.id);
                        setTemperatureZoneForm({
                          name: zone.name,
                          target_temp_min: zone.target_temp_min,
                          target_temp_max: zone.target_temp_max,
                        });
                        setTemperatureZoneDialogOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteCandidate({ type: 'temperature-zone', id: zone.id, label: zone.name })}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Dialog
          open={temperatureZoneDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetTemperatureZoneForm();
              return;
            }
            setTemperatureZoneDialogOpen(true);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTemperatureZoneId ? 'Modifier une zone' : 'Créer une zone'}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="temp-zone-name">Nom de la zone</Label>
                <Input
                  id="temp-zone-name"
                  value={temperatureZoneForm.name}
                  onChange={(e) => setTemperatureZoneForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Chambre froide"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-zone-min">Température min (°C)</Label>
                <Input
                  id="temp-zone-min"
                  type="number"
                  step="0.1"
                  value={temperatureZoneForm.target_temp_min}
                  onChange={(e) =>
                    setTemperatureZoneForm((prev) => ({
                      ...prev,
                      target_temp_min: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-zone-max">Température max (°C)</Label>
                <Input
                  id="temp-zone-max"
                  type="number"
                  step="0.1"
                  value={temperatureZoneForm.target_temp_max}
                  onChange={(e) =>
                    setTemperatureZoneForm((prev) => ({
                      ...prev,
                      target_temp_max: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetTemperatureZoneForm}>
                Annuler
              </Button>
              <Button onClick={handleSubmitTemperatureZone} disabled={savingTemperatureZone}>
                {savingTemperatureZone ? 'Enregistrement...' : editingTemperatureZoneId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderCleaningZonesTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Zones de nettoyage</CardTitle>
              <Button
                onClick={() => {
                  setEditingCleaningZoneId(null);
                  setCleaningZoneForm(defaultCleaningZoneForm);
                  setCleaningZoneDialogOpen(true);
                }}
              >
                Créer une zone
              </Button>
            </div>
            <CardDescription>Créez les zones de nettoyage HACCP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingCleaningZones ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : cleaningZones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune zone de nettoyage définie.</p>
            ) : (
              cleaningZones.map((zone) => (
                <div key={zone.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-md p-3">
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {zone.surfaces.length} surface(s) · Créée le {new Date(zone.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={zone.enabled ? 'default' : 'secondary'}>{zone.enabled ? 'Active' : 'Inactive'}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCleaningZoneId(zone.id);
                        setCleaningZoneForm({ zone: zone.name });
                        setCleaningZoneDialogOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteCandidate({ type: 'cleaning-zone', id: zone.id, label: zone.name })}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Surfaces de nettoyage</CardTitle>
              <Button
                onClick={() => {
                  setEditingSurfaceId(null);
                  setSurfaceForm({
                    ...defaultSurfaceForm,
                    zone_id: cleaningZones[0]?.id || '',
                  });
                  setSurfaceDialogOpen(true);
                }}
                disabled={cleaningZones.length === 0}
              >
                Créer une surface
              </Button>
            </div>
            <CardDescription>
              Associez les surfaces aux zones avec leur fréquence de nettoyage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingCleaningSurfaces ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : cleaningSurfaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune surface définie.</p>
            ) : (
              cleaningSurfaces.map((surface) => (
                <div key={surface.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-md p-3">
                  <div>
                    <p className="font-medium">{surface.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {surface.zone_name} · Tous les {surface.frequency_count} {frequencyUnitLabel[surface.frequency_unit].toLowerCase()}(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={surface.active ? 'default' : 'secondary'}>{surface.active ? 'Active' : 'Inactive'}</Badge>
                    {surface.computed.overdue && <Badge variant="destructive">En retard</Badge>}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSurfaceId(surface.id);
                        setSurfaceForm({
                          zone_id: surface.zone_id,
                          name: surface.name,
                          frequency_unit: surface.frequency_unit,
                          frequency_count: surface.frequency_count,
                        });
                        setSurfaceDialogOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteCandidate({ type: 'cleaning-surface', id: surface.id, label: surface.name })}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Dialog
          open={cleaningZoneDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetCleaningZoneForm();
              return;
            }
            setCleaningZoneDialogOpen(true);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCleaningZoneId ? 'Modifier une zone' : 'Créer une zone'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="cleaning-zone-name">Nom de la zone</Label>
              <Input
                id="cleaning-zone-name"
                value={cleaningZoneForm.zone}
                onChange={(e) => setCleaningZoneForm({ zone: e.target.value })}
                placeholder="Ex: Cuisine chaude"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetCleaningZoneForm}>
                Annuler
              </Button>
              <Button onClick={handleSubmitCleaningZone} disabled={savingCleaningZone}>
                {savingCleaningZone ? 'Enregistrement...' : editingCleaningZoneId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={surfaceDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetSurfaceForm();
              return;
            }
            setSurfaceDialogOpen(true);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSurfaceId ? 'Modifier une surface' : 'Créer une surface'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="surface-zone">Zone</Label>
                <Select
                  value={surfaceForm.zone_id}
                  onValueChange={(value) => setSurfaceForm((prev) => ({ ...prev, zone_id: value }))}
                >
                  <SelectTrigger id="surface-zone">
                    <SelectValue placeholder="Sélectionner une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {cleaningZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="surface-name">Surface</Label>
                <Input
                  id="surface-name"
                  value={surfaceForm.name}
                  onChange={(e) => setSurfaceForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Plan de travail"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surface-frequency-unit">Périodicité</Label>
                <Select
                  value={surfaceForm.frequency_unit}
                  onValueChange={(value: FrequencyUnit) =>
                    setSurfaceForm((prev) => ({ ...prev, frequency_unit: value }))
                  }
                >
                  <SelectTrigger id="surface-frequency-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Jour</SelectItem>
                    <SelectItem value="week">Semaine</SelectItem>
                    <SelectItem value="month">Mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surface-frequency-count">Fréquence</Label>
                <Input
                  id="surface-frequency-count"
                  type="number"
                  min={1}
                  value={surfaceForm.frequency_count}
                  onChange={(e) =>
                    setSurfaceForm((prev) => ({
                      ...prev,
                      frequency_count: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetSurfaceForm}>
                Annuler
              </Button>
              <Button onClick={handleSubmitSurface} disabled={savingSurface}>
                {savingSurface ? 'Enregistrement...' : editingSurfaceId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderContent = (tabId: string) => {
    if (tabId === 'general') return renderGeneralTab();
    if (tabId === 'temperature-zones') return renderTemperatureZonesTab();
    return renderCleaningZonesTab();
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={<h1 className="text-3xl font-bold">HACCP - Paramètres</h1>}
        description="Gérez les paramètres généraux HACCP, les zones de températures et les zones/surfaces de nettoyage."
      >
        <TabSystem tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} renderContent={renderContent} />

        <ConfirmDialog
          open={Boolean(deleteCandidate)}
          onOpenChange={(open) => {
            if (!open) setDeleteCandidate(null);
          }}
          title="Confirmer la suppression"
          description={deleteCandidate ? `Voulez-vous vraiment supprimer « ${deleteCandidate.label} » ?` : ''}
          onConfirm={handleConfirmDelete}
          confirmText="Oui"
          cancelText="Non"
          isDangerous
          isLoading={deleting}
        />
      </PageContainer>
    </DashboardLayout>
  );
};

export default HaccpSettingsPage;
