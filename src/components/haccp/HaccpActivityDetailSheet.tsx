import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Thermometer, Droplets, User, Calendar, MapPin, Camera, MessageCircle, ShieldAlert, ScanSearch } from 'lucide-react';
import {
  HaccpActivity,
  TemperatureSession,
  HaccpCleaningSession,
  getTemperatureSession,
  getHaccpCleaningSession,
  HaccpTraceabilityRecord,
  getTraceabilityRecord,
} from '@/services/haccpService';
import { useToast } from '@/hooks/use-toast';
import { PhotoGallery } from '@/components/shared/PhotoGallery';

interface HaccpActivityDetailSheetProps {
  activity: HaccpActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'ok':
    case 'done':
      return 'bg-green-100 text-green-700 hover:bg-green-100';
    case 'alert':
      return 'bg-orange-100 text-orange-700 hover:bg-orange-100';
    case 'critical':
    case 'failed':
    case 'error':
      return 'bg-red-100 text-red-700 hover:bg-red-100';
    case 'pending':
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
  }
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    ok: 'OK',
    done: 'Terminé',
    alert: 'Alerte',
    critical: 'Critique',
    failed: 'Échec',
    error: 'Erreur',
    pending: 'En attente',
    in_progress: 'En cours',
  };
  return map[status] ?? status;
};

const formatDateTime = (iso: string) =>
  format(new Date(iso), 'dd MMMM yyyy à HH:mm', { locale: fr });

const hasDisplayableValue = (value: string | number | null | undefined): boolean =>
  value !== null && value !== undefined && value !== '';

// ── Temperature Session Detail ──────────────────────────────────────────────

function TemperatureSessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<TemperatureSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setSession(null);

    getTemperatureSession(sessionId)
      .then(setSession)
      .catch(() =>
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la session de température.',
          variant: 'destructive',
        })
      )
      .finally(() => setLoading(false));
  }, [sessionId, toast]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-5 mt-4">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Informations de session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Effectué le</span>
              </div>
              <p className="font-medium text-slate-900">{formatDateTime(session.performed_at)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>Opérateur</span>
              </div>
              <p className="font-medium text-slate-900">{session.performed_by?.name || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Statut global :</span>
            <Badge className={cn('font-semibold', statusBadgeClass(session.status))}>
              {statusLabel(session.status)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Relevés de température ({session.readings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
            {session.readings.map((reading) => (
              <div key={reading.id} className="flex flex-col sm:flex-row gap-3 rounded-md border border-slate-200 p-3">
                <div className="w-full sm:w-28 sm:h-28 h-36 rounded-md border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                  {reading.photo_url ? (
                    <img
                      src={reading.photo_url}
                      alt="Photo du relevé"
                      className="w-full h-full object-cover cursor-zoom-in"
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewImageUrl(reading.photo_url ?? null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setPreviewImageUrl(reading.photo_url ?? null);
                        }
                      }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const sibling = target.nextElementSibling as HTMLElement | null;
                        if (sibling) sibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    style={{ display: reading.photo_url ? 'none' : 'flex' }}
                    className="w-full h-full items-center justify-center text-slate-500 text-xs gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Pas d'image</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 truncate" title={reading.zone_id}>
                      {reading.zone_name || 'Zone'}
                    </p>
                    <Badge className={cn('text-xs font-medium', statusBadgeClass(reading.status))}>
                      {statusLabel(reading.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <Thermometer className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold tabular-nums text-slate-900">{reading.value} °C</span>
                  </div>
                  {reading.comment && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                      <MessageCircle className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
                      <span className="text-slate-900">{reading.comment}</span>
                    </div>
                  )}
                  {Array.isArray(reading.corrective_actions) && reading.corrective_actions.length > 0 && (
                    <div className="mt-3 rounded-md border border-orange-200 bg-orange-50/60 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Actions correctives</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {reading.corrective_actions.map((action, index) => (
                          <div
                            key={`${reading.id}-${action.action_id}-${index}`}
                            className="rounded-md border border-orange-100 bg-white/90 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50"
                              >
                                {action.label}
                              </Badge>
                              {hasDisplayableValue(action.follow_up_value) && (
                                <span className="text-xs text-slate-500">
                                  Valeur de suivi : <span className="font-medium text-slate-700">{action.follow_up_value}</span>
                                </span>
                              )}
                            </div>

                            {action.note && (
                              <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                                <MessageCircle className="mt-0.5 h-4 w-4 text-orange-500 shrink-0" />
                                <span className="text-slate-900">{action.note}</span>
                              </div>
                            )}

                            {action.photo_url && (
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(action.photo_url ?? null)}
                                className="mt-2 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-left transition hover:bg-slate-100"
                              >
                                <img
                                  src={action.photo_url}
                                  alt={`Photo liée à ${action.label}`}
                                  className="h-10 w-10 rounded object-cover"
                                />
                                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Camera className="h-3.5 w-3.5" />
                                  Voir la photo liée
                                </span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-black">
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Aperçu du relevé"
              className="w-full max-h-[85vh] object-contain bg-black"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Cleaning Session Detail ─────────────────────────────────────────────────

function CleaningSessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<HaccpCleaningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setSession(null);

    getHaccpCleaningSession(sessionId)
      .then(setSession)
      .catch(() =>
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la session de nettoyage.',
          variant: 'destructive',
        })
      )
      .finally(() => setLoading(false));
  }, [sessionId, toast]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-5 mt-4">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Informations de session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Effectué le</span>
              </div>
              <p className="font-medium text-slate-900">{formatDateTime(session.performed_at)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>Opérateur</span>
              </div>
              <p className="font-medium text-slate-900">{session.performed_by?.name || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-slate-500">Statut global :</span>
            <Badge className={cn('font-semibold', statusBadgeClass(session.status))}>
              {statusLabel(session.status)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Exécutions ({session.executions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {session.executions.map((execution) => (
            <div key={execution.id} className="flex flex-col sm:flex-row gap-3 rounded-md border border-slate-200 p-3">
              <div className="w-full sm:w-28 sm:h-28 h-36 rounded-md border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                {execution.photo_url ? (
                  <img
                    src={execution.photo_url}
                    alt="Photo de nettoyage"
                    className="w-full h-full object-cover cursor-zoom-in"
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewImageUrl(execution.photo_url ?? null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setPreviewImageUrl(execution.photo_url ?? null);
                      }
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const sibling = target.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  style={{ display: execution.photo_url ? 'none' : 'flex' }}
                  className="w-full h-full items-center justify-center text-slate-500 text-xs gap-1.5"
                >
                  <Camera className="h-4 w-4" />
                  <span>Pas d'image</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 truncate">{execution.surface_name}</p>
                  <Badge className={cn('font-semibold', statusBadgeClass(execution.status))}>
                    {statusLabel(execution.status)}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {execution.zone_name}
                </p>
                {execution.comment && (
                  <p className="text-sm text-slate-700">Commentaire: {execution.comment}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-black">
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Aperçu de la photo de nettoyage"
              className="w-full max-h-[85vh] object-contain bg-black"
            />
          )}
        </DialogContent>
      </Dialog>

      {session.executions.length === 0 && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6 text-sm text-slate-500">
            Aucune exécution disponible pour cette session.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Traceability Record Detail ─────────────────────────────────────────────

function TraceabilityRecordDetail({ recordId }: { recordId: string }) {
  const [record, setRecord] = useState<HaccpTraceabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!recordId) return;
    setLoading(true);
    setRecord(null);

    getTraceabilityRecord(recordId)
      .then(setRecord)
      .catch(() =>
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la fiche de traçabilité.',
          variant: 'destructive',
        })
      )
      .finally(() => setLoading(false));
  }, [recordId, toast]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="space-y-5 mt-4">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Informations du contrôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Effectué le</span>
              </div>
              <p className="font-medium text-slate-900">{formatDateTime(record.performed_at)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>Opérateur</span>
              </div>
              <p className="font-medium text-slate-900">{record.performed_by?.name || '—'}</p>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Commentaire</span>
            </div>
            <p className="text-sm text-slate-900">{record.comment || 'Aucun commentaire'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Photos ({record.photos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGallery
            photos={record.photos.map((photo) => ({
              id: photo.id,
              url: photo.photo_url,
              label: photo.label,
              caption: photo.caption,
              alt: photo.label,
            }))}
            emptyLabel="Aucune photo enregistrée"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Sheet ───────────────────────────────────────────────────────────────

export function HaccpActivityDetailSheet({
  activity,
  open,
  onOpenChange,
}: HaccpActivityDetailSheetProps) {
  const isTemperature = activity?.type === 'temperatures';
  const isCleaning = activity?.type === 'cleanings';
  const isTraceability = activity?.type === 'traceability';

  const sessionId =
    isTemperature && activity
      ? String(activity.metadata?.session_id ?? activity.id)
      : '';

  const cleaningSessionId =
    isCleaning && activity
      ? String(activity.metadata?.session_id ?? activity.id)
      : '';

  const recordId =
    isTraceability && activity
      ? String(activity.metadata?.record_id ?? activity.id)
      : '';

  const sheetTitle = isTemperature
    ? 'Détail — Session de températures'
    : isCleaning
    ? 'Détail — Session de nettoyage'
    : isTraceability
    ? 'Détail — Traçabilité'
    : 'Détail activité';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-slate-50 border-slate-200 p-0">
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-700 text-white px-6 py-4 border-b border-slate-600">
          <DialogTitle className="flex items-center gap-2">
            {isTemperature && <Thermometer className="h-5 w-5 text-blue-500" />}
            {isCleaning && <Droplets className="h-5 w-5 text-cyan-500" />}
            {isTraceability && <ScanSearch className="h-5 w-5 text-amber-500" />}
            {sheetTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {isTemperature && sessionId && (
            <TemperatureSessionDetail key={sessionId} sessionId={sessionId} />
          )}

          {isCleaning && cleaningSessionId && (
            <CleaningSessionDetail key={cleaningSessionId} sessionId={cleaningSessionId} />
          )}

          {isTraceability && recordId && (
            <TraceabilityRecordDetail key={recordId} recordId={recordId} />
          )}

          {!isTemperature && !isCleaning && !isTraceability && (
            <Card className="mt-4 bg-white border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">
                  Aucun détail disponible pour ce type d'activité.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
