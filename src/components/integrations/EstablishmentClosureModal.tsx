import { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Pause } from 'lucide-react';
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

const AVAILABLE_INTEGRATIONS: Array<{ id: IntegrationPlatform; label: string }> = [
  { id: 'uber_eats', label: 'Uber Eats' },
  { id: 'deliveroo', label: 'Deliveroo' },
  { id: 'scannorder', label: 'ScanNOrder' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

interface EstablishmentClosureModalProps {
  triggerMode?: 'button' | 'icon';
}

export const EstablishmentClosureModal = ({
  triggerMode = 'button',
}: EstablishmentClosureModalProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [selectedIntegrations, setSelectedIntegrations] = useState<IntegrationPlatform[]>(
    AVAILABLE_INTEGRATIONS.map(item => item.id)
  );
  const [submitting, setSubmitting] = useState(false);

  const submitDisabled = submitting || selectedIntegrations.length === 0;

  const selectedLabel = useMemo(() => {
    if (selectedIntegrations.length === AVAILABLE_INTEGRATIONS.length) {
      return 'Toutes les integrations';
    }

    return `${selectedIntegrations.length} integration(s) selectionnee(s)`;
  }, [selectedIntegrations]);

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
      setDurationMinutes('30');
      setSelectedIntegrations(AVAILABLE_INTEGRATIONS.map(item => item.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedIntegrations.length === 0) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await integrationsService.closeEstablishmentTemporary({
        duration_minutes: Number(durationMinutes),
        affected_integrations: selectedIntegrations,
      });

      toast({
        title: 'Etablissement ferme temporairement',
        description: `Fermeture appliquee jusqu'au ${new Date(result.closed_until).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })} sur ${result.affected_integrations.length} integration(s).`,
      });

      setOpen(false);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible d appliquer la fermeture temporaire.',
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
            title="Fermer temporairement"
            aria-label="Fermer temporairement"
          >
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Fermer temporairement
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Fermeture temporaire de l'établissement</DialogTitle>
          <DialogDescription>
            Fermez rapidement votre établissement sur les intégrations souhaitées.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Action immédiate: les canaux sélectionnés seront indisponibles pendant la durée choisie.
          </div>

          <div className="space-y-2">
            <Label htmlFor="closure-duration" className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Durée de fermeture
            </Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger id="closure-duration" className="max-w-xs">
                <SelectValue placeholder="Choisir une durée" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(minutes => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Intégrations impactées</Label>
            <p className="text-xs text-muted-foreground">{selectedLabel}</p>
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
              {AVAILABLE_INTEGRATIONS.map(integration => {
                const checked = selectedIntegrations.includes(integration.id);

                return (
                  <label
                    key={integration.id}
                    htmlFor={`closure-${integration.id}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`closure-${integration.id}`}
                      checked={checked}
                      onCheckedChange={value => toggleIntegration(integration.id, value === true)}
                    />
                    <span className="text-sm">{integration.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitDisabled}>
            {submitting ? 'Validation...' : 'Valider la fermeture'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
