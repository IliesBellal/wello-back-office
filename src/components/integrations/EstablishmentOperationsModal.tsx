import { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Hourglass, Pause, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { integrationsService, type IntegrationPlatform } from '@/services/integrationsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasModuleAccess } from '@/lib/moduleAccess';

type EstablishmentAction = 'wait_time' | 'extra_wait_time' | 'closure';

const PLATFORM_LABELS: Record<IntegrationPlatform, string> = {
  uber_eats: 'Uber Eats',
  deliveroo: 'Deliveroo',
  scannorder: 'ScanNOrder',
};

interface ActionConfig {
  label: string;
  description: string;
  /**
   * Plateformes réellement pilotables pour cette action. Le temps d'attente
   * permanent n'est adressable que sur Uber Eats et Deliveroo : côté ScanNOrder
   * il vit dans `merchant_parameters.preparation_time`, qu'aucun endpoint
   * n'écrit aujourd'hui.
   */
  platforms: IntegrationPlatform[];
  /** Libellé du champ de durée principal. */
  durationLabel: string;
  durationOptions: number[];
  defaultDuration: number;
  durationSuffix?: string;
  /**
   * Fenêtre d'application ("jusque quand"). Absente quand la notion n'a pas de
   * sens : un temps permanent ne s'éteint pas, et pour une fermeture la durée
   * choisie EST déjà l'échéance.
   */
  windowOptions?: number[];
  defaultWindow?: number;
  confirmLabel: string;
}

const ACTION_CONFIGS: Record<EstablishmentAction, ActionConfig> = {
  wait_time: {
    label: "Définir le temps d'attente",
    description: 'Règle le temps de préparation annoncé en permanence.',
    platforms: ['uber_eats', 'deliveroo'],
    durationLabel: 'Temps de préparation',
    durationOptions: [10, 15, 20, 25, 30, 40, 50, 60],
    defaultDuration: 20,
    confirmLabel: "Définir le temps d'attente",
  },
  extra_wait_time: {
    label: "Temps d'attente supplémentaire",
    description: "S'ajoute au temps habituel le temps d'un coup de feu, puis disparaît.",
    // Deliveroo absent volontairement : son API n'a ni supplément ni échéance,
    // seulement un mode de charge à redescendre à la main.
    platforms: ['uber_eats', 'scannorder'],
    durationLabel: 'Délai supplémentaire',
    durationOptions: [5, 10, 15, 20, 25, 30],
    defaultDuration: 10,
    durationSuffix: '+',
    windowOptions: [30, 60, 90, 120],
    defaultWindow: 60,
    confirmLabel: 'Appliquer le délai',
  },
  closure: {
    label: 'Fermeture temporaire',
    description: 'Suspend les commandes sur les canaux choisis.',
    platforms: ['uber_eats', 'deliveroo', 'scannorder'],
    durationLabel: 'Durée de fermeture',
    durationOptions: [15, 30, 45, 60, 90, 120],
    defaultDuration: 30,
    confirmLabel: 'Valider la fermeture',
  },
};

const ACTION_ORDER: EstablishmentAction[] = ['wait_time', 'extra_wait_time', 'closure'];

interface EstablishmentOperationsModalProps {
  triggerMode?: 'button' | 'icon';
}

export const EstablishmentOperationsModal = ({
  triggerMode = 'button',
}: EstablishmentOperationsModalProps) => {
  const { authData } = useAuth();
  const { toast } = useToast();
  const canAccessScanNOrder = hasModuleAccess(authData, 'scannorder');

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<EstablishmentAction>('extra_wait_time');
  const [durationMinutes, setDurationMinutes] = useState(
    String(ACTION_CONFIGS.extra_wait_time.defaultDuration),
  );
  const [windowMinutes, setWindowMinutes] = useState(
    String(ACTION_CONFIGS.extra_wait_time.defaultWindow),
  );
  const [selectedIntegrations, setSelectedIntegrations] = useState<IntegrationPlatform[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const config = ACTION_CONFIGS[action];

  // Plateformes proposées : celles que l'action sait piloter, moins celles que
  // l'abonnement du marchand n'inclut pas.
  const availableIntegrations = useMemo(
    () => config.platforms.filter(platform => platform !== 'scannorder' || canAccessScanNOrder),
    [config.platforms, canAccessScanNOrder],
  );

  const effectiveSelection = useMemo(
    () => selectedIntegrations.filter(platform => availableIntegrations.includes(platform)),
    [availableIntegrations, selectedIntegrations],
  );

  const submitDisabled = submitting || effectiveSelection.length === 0;

  const selectedLabel = useMemo(() => {
    if (effectiveSelection.length === availableIntegrations.length) {
      return 'Toutes les plateformes disponibles';
    }

    return `${effectiveSelection.length} plateforme(s) sélectionnée(s)`;
  }, [availableIntegrations.length, effectiveSelection]);

  const applyAction = (nextAction: EstablishmentAction) => {
    const nextConfig = ACTION_CONFIGS[nextAction];
    setAction(nextAction);
    setDurationMinutes(String(nextConfig.defaultDuration));
    setWindowMinutes(String(nextConfig.defaultWindow ?? ''));
    setSelectedIntegrations(
      nextConfig.platforms.filter(platform => platform !== 'scannorder' || canAccessScanNOrder),
    );
  };

  const toggleIntegration = (integrationId: IntegrationPlatform, checked: boolean) => {
    if (checked) {
      setSelectedIntegrations(prev => Array.from(new Set([...prev, integrationId])));
      return;
    }

    setSelectedIntegrations(prev => prev.filter(item => item !== integrationId));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      applyAction('extra_wait_time');
    }
  };

  const runAction = async (): Promise<string> => {
    const minutes = Number(durationMinutes);

    if (action === 'closure') {
      const result = await integrationsService.closeEstablishmentTemporary({
        duration_minutes: minutes,
        affected_integrations: effectiveSelection,
      });

      return `Fermeture jusqu'à ${new Date(result.closed_until).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })} sur ${result.affected_integrations.length} plateforme(s).`;
    }

    if (action === 'extra_wait_time') {
      const result = await integrationsService.setEstablishmentWaitTime({
        wait_time_minutes: minutes,
        affected_integrations: effectiveSelection,
        duration_minutes: Number(windowMinutes),
      });

      return `+${result.wait_time_minutes} min jusqu'à ${new Date(result.applied_until).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })} sur ${result.affected_integrations.length} plateforme(s).`;
    }

    // Temps d'attente permanent : pas d'endpoint global, on pilote chaque
    // plateforme par son propre PATCH.
    await Promise.all(
      effectiveSelection
        .filter((platform): platform is 'uber_eats' | 'deliveroo' => platform !== 'scannorder')
        .map(platform => integrationsService.updatePlatformPreparationTime(platform, minutes)),
    );

    return `Temps de préparation réglé à ${minutes} min sur ${effectiveSelection.length} plateforme(s).`;
  };

  const handleSubmit = async () => {
    if (effectiveSelection.length === 0) {
      return;
    }

    setSubmitting(true);

    try {
      const description = await runAction();

      toast({ title: config.label, description });
      setOpen(false);
    } catch {
      toast({
        title: 'Erreur',
        description: "L'action n'a pas pu être appliquée.",
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerMode === 'icon' ? (
          <Button
            variant="outline"
            size="icon"
            title="Gérer le service"
            aria-label="Gérer le service"
          >
            <Timer className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <Timer className="h-4 w-4" />
            Gérer le service
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gérer le service</DialogTitle>
          <DialogDescription>
            Ajustez vos délais ou suspendez les commandes sur vos canaux de vente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1. Action */}
          <div className="space-y-2">
            <Label>Action</Label>
            <div className="grid gap-2">
              {ACTION_ORDER.map(key => {
                const item = ACTION_CONFIGS[key];
                const active = key === action;
                const Icon = key === 'closure' ? Pause : key === 'extra_wait_time' ? Hourglass : Clock3;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyAction(key)}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {action === 'closure' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Action immédiate : les canaux sélectionnés seront indisponibles pendant la durée choisie.
            </div>
          )}

          {/* 2. Durée */}
          <div className="space-y-2">
            <Label htmlFor="operations-duration" className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {config.durationLabel}
            </Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger id="operations-duration" className="max-w-xs">
                <SelectValue placeholder="Choisir une durée" />
              </SelectTrigger>
              <SelectContent>
                {config.durationOptions.map(minutes => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {config.durationSuffix ?? ''}
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Jusque quand — uniquement si la notion a un sens pour l'action */}
          {config.windowOptions && (
            <div className="space-y-2">
              <Label htmlFor="operations-window" className="flex items-center gap-2">
                <Hourglass className="h-4 w-4" />
                Appliqué pendant
              </Label>
              <Select value={windowMinutes} onValueChange={setWindowMinutes}>
                <SelectTrigger id="operations-window" className="max-w-xs">
                  <SelectValue placeholder="Choisir une fenêtre" />
                </SelectTrigger>
                <SelectContent>
                  {config.windowOptions.map(minutes => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Au terme de cette période, le temps annoncé redevient le temps habituel.
              </p>
            </div>
          )}

          {/* 4. Plateformes */}
          <div className="space-y-3">
            <Label>Plateformes impactées</Label>
            <p className="text-xs text-muted-foreground">{selectedLabel}</p>
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
              {availableIntegrations.map(platform => (
                <label
                  key={platform}
                  htmlFor={`operations-${platform}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    id={`operations-${platform}`}
                    checked={effectiveSelection.includes(platform)}
                    onCheckedChange={value => toggleIntegration(platform, value === true)}
                  />
                  <span className="text-sm">{PLATFORM_LABELS[platform]}</span>
                </label>
              ))}
            </div>

            {action === 'wait_time' && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ScanNOrder n'apparaît pas ici : son temps de préparation se règle dans les
                paramètres de l'établissement.
              </p>
            )}

            {/*
              L'API Deliveroo ne connaît qu'un mode de charge, sans supplément ni
              échéance : un délai temporaire y resterait actif jusqu'à une
              désactivation manuelle. Le canal est donc hors de cette action, et
              on le dit plutôt que de le laisser manquer sans explication.
            */}
            {action === 'extra_wait_time' && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Deliveroo n'apparaît pas ici : la plateforme ne gère pas de délai temporaire.
                Utilisez son mode « occupé » depuis l'application Deliveroo.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant={action === 'closure' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {submitting ? 'Validation...' : config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
