import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, AlertTriangle, CheckCircle2, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlertItem {
  id: string;
  date: string;
  zone: string;
  title: string;
  description: string;
  priority: 'critique' | 'majeur' | 'mineur';
  type: 'dlc' | 'temperature' | 'control_late';
  status: 'active' | 'acknowledged';
}

// Mock alerts data
const mockAlerts: AlertItem[] = [
  {
    id: '1',
    date: new Date().toISOString(),
    zone: 'Stockage',
    title: 'DLC dépassée',
    description: 'Crème fraîche DLUO: 08/04/2026. À éliminer immédiatement.',
    priority: 'critique',
    type: 'dlc',
    status: 'active',
  },
  {
    id: '2',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    zone: 'Préparation',
    title: 'Température hors seuil',
    description: 'Plan de travail froid à +12°C au lieu de +6°C. Maintenance requise.',
    priority: 'critique',
    type: 'temperature',
    status: 'acknowledged',
  },
  {
    id: '3',
    date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    zone: 'Cuisine',
    title: 'Contrôle de salubrité en retard',
    description: 'Le contrôle journalier de temperature frigo n\'a pas été effectué.',
    priority: 'majeur',
    type: 'control_late',
    status: 'active',
  },
  {
    id: '4',
    date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    zone: 'Salle',
    title: 'DLC approchante',
    description: 'Vin blanc: DLUO 15/04/2026 (dans 5 jours).',
    priority: 'mineur',
    type: 'dlc',
    status: 'active',
  },
  {
    id: '5',
    date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    zone: 'Entreposage froid',
    title: 'Température limite',
    description: 'Congélateur à -17°C. Seuil minimal recommandé: -18°C.',
    priority: 'mineur',
    type: 'temperature',
    status: 'acknowledged',
  },
];

const getPriorityConfig = (priority: AlertItem['priority']) => {
  switch (priority) {
    case 'critique':
      return {
        badge: 'bg-red-100 text-red-700',
        icon: 'text-red-600',
        label: 'Critique',
        color: 'border-red-200 bg-red-50',
      };
    case 'majeur':
      return {
        badge: 'bg-orange-100 text-orange-700',
        icon: 'text-orange-600',
        label: 'Majeur',
        color: 'border-orange-200 bg-orange-50',
      };
    case 'mineur':
      return {
        badge: 'bg-yellow-100 text-yellow-700',
        icon: 'text-yellow-600',
        label: 'Mineur',
        color: 'border-yellow-200 bg-yellow-50',
      };
  }
};

const getAlertIcon = (type: AlertItem['type']) => {
  switch (type) {
    case 'dlc':
      return '📦';
    case 'temperature':
      return '🌡️';
    case 'control_late':
      return '⏰';
    default:
      return '⚠️';
  }
};

interface ActionModalProps {
  alert: AlertItem | null;
  actionType: 'correct' | 'note' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (content: string) => void;
}

const ActionModal = ({ alert, actionType, open, onOpenChange, onSubmit }: ActionModalProps) => {
  const [content, setContent] = useState('');

  if (!alert) return null;

  const getTitle = () => {
    if (actionType === 'correct') return 'Traiter l\'alerte';
    if (actionType === 'note') return 'Ajouter une note';
    return '';
  };

  const getDescription = () => {
    if (actionType === 'correct') return 'Détaillez l\'action corrective effectuée';
    if (actionType === 'note') return 'Ajoutez une remarque ou observation';
    return '';
  };

  const handleSubmit = () => {
    onSubmit(content);
    setContent('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{getTitle()}</SheetTitle>
          <SheetDescription>{getDescription()}</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-4">
          {/* Alert Summary */}
          <div className="p-3 bg-muted rounded-lg border border-border text-sm space-y-2">
            <div className="font-medium text-foreground">{alert.title}</div>
            <div className="text-xs text-muted-foreground">{alert.description}</div>
            <div className="text-xs text-muted-foreground">
              Zone: <span className="font-medium">{alert.zone}</span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {actionType === 'correct' ? 'Action corrective' : 'Note / Commentaire'}
            </label>
            <Textarea
              placeholder={
                actionType === 'correct'
                  ? 'Décrivez l\'action corrective effectuée...'
                  : 'Ajoutez votre observation...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-24"
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim()}>
            {actionType === 'correct' ? 'Enregistrer' : 'Ajouter note'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export const Alerts = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'correct' | 'note' | null>(null);

  const criticalCount = alerts.filter((a) => a.priority === 'critique' && a.status === 'active').length;
  const activeCount = alerts.filter((a) => a.status === 'active').length;

  const handleAction = (alert: AlertItem, type: 'correct' | 'note' | 'ignore') => {
    if (type === 'ignore') {
      // Remove alert
      setAlerts(alerts.filter((a) => a.id !== alert.id));
      return;
    }

    setSelectedAlert(alert);
    setActionType(type);
    setActionModalOpen(true);
  };

  const handleModalSubmit = (content: string) => {
    if (!selectedAlert) return;

    console.log(`${actionType} action for alert ${selectedAlert.id}:`, content);

    // Mark as acknowledged and update
    setAlerts(
      alerts.map((a) =>
        a.id === selectedAlert.id
          ? { ...a, status: 'acknowledged' }
          : a
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">HACCP - Alertes</h1>
          <p className="text-sm text-muted-foreground">
            Points de friction et actions correctives requises
          </p>
        </div>

        {/* ═══ STATS CARDS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alertes critiques</p>
                  <p className="text-3xl font-bold text-red-700 mt-2">{criticalCount}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alertes actives</p>
                  <p className="text-3xl font-bold text-orange-700 mt-2">{activeCount}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ ALERTS LIST ═══ */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Alertes en cours</h2>
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">Toutes les alertes ont été traitées</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const priorityConfig = getPriorityConfig(alert.priority);
                const icon = getAlertIcon(alert.type);

                return (
                  <Card
                    key={alert.id}
                    className={cn('border', priorityConfig.color, 'transition-all hover:shadow-sm')}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-xl mt-0.5">{icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">{alert.title}</h3>
                                <Badge className={cn('capitalize text-xs', priorityConfig.badge)}>
                                  {priorityConfig.label}
                                </Badge>
                                {alert.status === 'acknowledged' && (
                                  <Badge variant="secondary" className="capitalize text-xs">
                                    Reconnu
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{alert.description}</p>
                            </div>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-t border-current border-opacity-10 pt-4">
                          <span className="font-medium">Zone: {alert.zone}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(alert.date), 'HH:mm', { locale: fr })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAction(alert, 'correct')}
                            className="flex-1 sm:flex-initial"
                          >
                            <span className="text-sm">Traiter</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(alert, 'note')}
                            className="flex-1 sm:flex-initial"
                          >
                            <span className="text-sm">Noter</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(alert, 'ignore')}
                            className="flex-1 sm:flex-initial text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <ActionModal
        alert={selectedAlert}
        actionType={actionType}
        open={actionModalOpen}
        onOpenChange={setActionModalOpen}
        onSubmit={handleModalSubmit}
      />
    </DashboardLayout>
  );
};

export default Alerts;
