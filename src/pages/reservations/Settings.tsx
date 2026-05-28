import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, TabSystem } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ReservationArea,
  ReservationServiceWindow,
  ReservationSettings,
  getReservationAreas,
  getReservationServiceWindows,
  getReservationSettings,
  updateReservationSettings,
} from '@/services/reservationsService';
import { BellRing, Clock3, LayoutGrid, UsersRound } from 'lucide-react';

type BooleanSettingKey =
  | 'autoConfirmOnline'
  | 'sendSmsReminders'
  | 'sendEmailReminders'
  | 'enableWaitlist'
  | 'allowWalkInsOnFullService'
  | 'collectDeposit';

type NumberSettingKey =
  | 'bookingWindowDays'
  | 'maxPartySize'
  | 'defaultDurationMinutes'
  | 'slotIntervalMinutes'
  | 'reminderLeadHours'
  | 'depositAmount';

const toggleFields: Array<{ key: BooleanSettingKey; label: string; description: string }> = [
  {
    key: 'autoConfirmOnline',
    label: 'Confirmer automatiquement les demandes web',
    description: 'Bascule mockee pour valider le parcours de confirmation automatique.',
  },
  {
    key: 'sendSmsReminders',
    label: 'Envoyer des rappels SMS',
    description: 'Active les rappels SMS avant le service pour les reservations confirmees.',
  },
  {
    key: 'sendEmailReminders',
    label: 'Envoyer des rappels email',
    description: 'Active les rappels email pour les reservations prises en ligne.',
  },
  {
    key: 'enableWaitlist',
    label: 'Activer la liste d attente',
    description: 'Permet de conserver des demandes lorsque le service est complet.',
  },
  {
    key: 'allowWalkInsOnFullService',
    label: 'Autoriser les placements manuels sur service complet',
    description: 'Maintient la possibilite de saisir une reservation sur place meme a capacite atteinte.',
  },
  {
    key: 'collectDeposit',
    label: 'Activer l acompte',
    description: 'Simule la collecte d un acompte pour les groupes et evenements.',
  },
];

const numberFields: Array<{ key: NumberSettingKey; label: string; description: string; min: number }> = [
  {
    key: 'bookingWindowDays',
    label: 'Fenetre de reservation (jours)',
    description: 'Nombre de jours ouverts a la reservation a l avance.',
    min: 1,
  },
  {
    key: 'maxPartySize',
    label: 'Taille maximale d un groupe',
    description: 'Limite appliquee avant bascule vers validation manuelle.',
    min: 1,
  },
  {
    key: 'defaultDurationMinutes',
    label: 'Duree par defaut (minutes)',
    description: 'Rotation par defaut appliquee aux reservations.',
    min: 30,
  },
  {
    key: 'slotIntervalMinutes',
    label: 'Intervalle des creneaux (minutes)',
    description: 'Granularite des horaires proposes au client.',
    min: 5,
  },
  {
    key: 'reminderLeadHours',
    label: 'Delai des rappels (heures)',
    description: 'Delai avant reservation pour l envoi des rappels.',
    min: 1,
  },
  {
    key: 'depositAmount',
    label: 'Montant de l acompte (euros)',
    description: 'Montant demande lorsque l acompte est active.',
    min: 0,
  },
];

const channelLabels: Record<ReservationServiceWindow['channel'], string> = {
  all: 'Tous canaux',
  online: 'Online uniquement',
  manual: 'Saisie equipe uniquement',
};

const ReservationsSettingsPage = () => {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [serviceWindows, setServiceWindows] = useState<ReservationServiceWindow[]>([]);
  const [areas, setAreas] = useState<ReservationArea[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs = useMemo(
    () => [
      { id: 'general', label: 'General' },
      { id: 'services', label: 'Services' },
      { id: 'areas', label: 'Salles' },
    ],
    [],
  );

  useEffect(() => {
    const loadPage = async () => {
      setLoadingSettings(true);
      setLoadingServices(true);
      setLoadingAreas(true);

      try {
        const [settingsResponse, windowsResponse, areasResponse] = await Promise.all([
          getReservationSettings(),
          getReservationServiceWindows(),
          getReservationAreas(),
        ]);

        setSettings(settingsResponse);
        setServiceWindows(windowsResponse);
        setAreas(areasResponse);
      } catch {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les parametres de reservation.',
          variant: 'destructive',
        });
      } finally {
        setLoadingSettings(false);
        setLoadingServices(false);
        setLoadingAreas(false);
      }
    };

    void loadPage();
  }, []);

  const handleToggle = (key: BooleanSettingKey, checked: boolean) => {
    if (!settings) {
      return;
    }

    setSettings({
      ...settings,
      [key]: checked,
    });
  };

  const handleNumberInput = (key: NumberSettingKey, value: string) => {
    if (!settings) {
      return;
    }

    const numericValue = Number(value);

    setSettings({
      ...settings,
      [key]: Number.isNaN(numericValue) ? 0 : numericValue,
    });
  };

  const handleWelcomeNote = (value: string) => {
    if (!settings) {
      return;
    }

    setSettings({
      ...settings,
      welcomeNote: value,
    });
  };

  const handleSave = async () => {
    if (!settings) {
      return;
    }

    setSaving(true);

    try {
      const response = await updateReservationSettings(settings);
      setSettings(response);
      toast({
        title: 'Succes',
        description: 'Parametres de reservation enregistres.',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible d enregistrer les parametres de reservation.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const activeServicesCount = serviceWindows.filter((window) => window.enabled).length;
  const activeAreasCount = areas.filter((area) => area.enabled).length;
  const activeCapacity = areas
    .filter((area) => area.enabled)
    .reduce((total, area) => total + area.capacity, 0);

  const renderGeneralTab = () => {
    if (loadingSettings) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      );
    }

    if (!settings) {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-4 w-4 text-primary" />
                Fenetre de vente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{settings.bookingWindowDays} jours</p>
              <p className="text-sm text-muted-foreground">Creneaux ouverts a la vente en avance.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="h-4 w-4 text-primary" />
                Rappels client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{settings.reminderLeadHours} h</p>
              <p className="text-sm text-muted-foreground">Delai applique aux rappels automatises.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersRound className="h-4 w-4 text-primary" />
                Capacite en ligne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{settings.maxPartySize} couverts</p>
              <p className="text-sm text-muted-foreground">Seuil maximum avant validation manuelle.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {toggleFields.map((field) => (
            <Card key={field.key}>
              <CardHeader>
                <CardTitle className="text-base">{field.label}</CardTitle>
                <CardDescription>{field.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Etat</p>
                    <p className="text-sm text-muted-foreground">
                      {settings[field.key] ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <Switch
                    checked={settings[field.key]}
                    onCheckedChange={(checked) => handleToggle(field.key, checked)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Regles operationnelles</CardTitle>
            <CardDescription>Parametres numeriques mockes pour preparer le formulaire bookings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {numberFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="number"
                  min={field.min}
                  value={settings[field.key]}
                  onChange={(event) => handleNumberInput(field.key, event.target.value)}
                />
                <p className="text-sm text-muted-foreground">{field.description}</p>
              </div>
            ))}
            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <Label htmlFor="reservation-welcome-note">Consigne equipe</Label>
              <Input
                id="reservation-welcome-note"
                value={settings.welcomeNote}
                onChange={(event) => handleWelcomeNote(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Message interne mocke pour guider l accueil sur les cas particuliers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderServicesTab = () => {
    if (loadingServices) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Services actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{activeServicesCount}</p>
              <p className="text-sm text-muted-foreground">Creneaux disponibles pour prise de reservation.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Capacite active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{activeCapacity}</p>
              <p className="text-sm text-muted-foreground">Couverts ouverts sur les zones actives.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">Mock</p>
              <p className="text-sm text-muted-foreground">Les modifications structurelles seront reliees a l API plus tard.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {serviceWindows.map((window) => (
            <Card key={window.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{window.label}</CardTitle>
                    <CardDescription>
                      {window.firstBookingTime} - {window.lastBookingTime}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {window.enabled ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>Canal</span>
                  <span className="font-medium text-foreground">{channelLabels[window.channel]}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>Capacite max</span>
                  <span className="font-medium text-foreground">{window.maxCovers} couverts</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderAreasTab = () => {
    if (loadingAreas) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Zones actives</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{activeAreasCount}</p>
              <p className="text-sm text-muted-foreground">Salles visibles dans le plan de salle.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Capacite totale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{activeCapacity}</p>
              <p className="text-sm text-muted-foreground">Couverts disponibles sur les zones actives.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Source</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">Mockee</p>
              <p className="text-sm text-muted-foreground">Etat temporaire avant integration CRUD.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {areas.map((area) => (
            <Card key={area.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                      {area.name}
                    </CardTitle>
                    <CardDescription>Configuration de zone liee au module reservations.</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {area.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>Capacite</span>
                  <span className="font-medium text-foreground">{area.capacity} couverts</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>Duree de rotation</span>
                  <span className="font-medium text-foreground">{area.turnDurationMinutes} min</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Parametres des reservations</h1>
                <Badge variant="secondary">Mock</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Ecran de configuration inspire des parametres HACCP, en attendant le branchement API bookings.
              </p>
            </div>
            <Button onClick={handleSave} disabled={loadingSettings || !settings || saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        }
      >
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          renderContent={(tabId) => {
            if (tabId === 'services') {
              return renderServicesTab();
            }

            if (tabId === 'areas') {
              return renderAreasTab();
            }

            return renderGeneralTab();
          }}
        />
      </PageContainer>
    </DashboardLayout>
  );
};

export default ReservationsSettingsPage;