import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  marketplaceOnboardingService,
  onboardingErrorCode,
  UBER_RETURN_REASONS,
  type UberConnectResult,
  type UberStoreOption,
} from '@/services/marketplaceOnboardingService';

/** Envoie le navigateur vers la page de connexion Uber Eats. */
const startUberConnect = async () => {
  try {
    const url = await marketplaceOnboardingService.getUberConnectUrl();
    window.location.assign(url);
  } catch (e) {
    toast.error(UBER_RETURN_REASONS[onboardingErrorCode(e) ?? ''] ?? UBER_RETURN_REASONS.failed);
    throw e;
  }
};

/** Écran « Uber Eats non connecté » : explication et bouton de connexion. */
export const UberEatsConnectPanel = () => {
  const [redirecting, setRedirecting] = useState(false);

  const handleConnect = async () => {
    setRedirecting(true);
    try {
      await startUberConnect();
    } catch {
      setRedirecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Connecter Uber Eats</CardTitle>
        <CardDescription>
          Recevez vos commandes Uber Eats directement dans Wello Resto et gérez votre menu, vos disponibilités et vos horaires depuis un seul endroit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Cliquez sur « Connecter mon compte Uber Eats ».</li>
          <li>Connectez-vous avec le compte Uber Eats propriétaire ou gérant de votre restaurant, puis autorisez Wello Resto.</li>
          <li>De retour ici, choisissez le ou les restaurants à relier.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ? Inscrivez votre établissement sur{' '}
          <a href="https://merchants.ubereats.com/fr/fr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Uber Eats pour les restaurateurs
          </a>
          , puis revenez sur cette page.
        </p>
        <Button onClick={handleConnect} disabled={redirecting}>
          {redirecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Connecter mon compte Uber Eats
        </Button>
      </CardContent>
    </Card>
  );
};

const STATUS_BADGE: Partial<Record<UberStoreOption['status'], { label: string; variant: 'secondary' | 'destructive' }>> = {
  connected_here: { label: 'Déjà relié', variant: 'secondary' },
  linked_elsewhere: { label: 'Relié à un autre établissement', variant: 'destructive' },
};

const describeResults = (results: UberConnectResult[]): { ok: number; message: string } => {
  const ok = results.filter((r) => r.status === 'connected');
  const elsewhere = results.filter((r) => r.status === 'linked_elsewhere');
  const failed = results.filter((r) => r.status === 'failed');
  const parts: string[] = [];
  if (ok.length) parts.push(ok.length === 1 ? `${ok[0].name || 'Restaurant'} est connecté.` : `${ok.length} restaurants connectés.`);
  if (elsewhere.length) parts.push(`${elsewhere.map((r) => r.name).join(', ')} : déjà relié à un autre établissement Wello Resto.`);
  if (failed.length) parts.push(`${failed.map((r) => r.name).join(', ')} : la connexion a échoué, réessayez.`);
  return { ok: ok.length, message: parts.join(' ') };
};

interface UberEatsStoreSelectDialogProps {
  sessionId: string | null;
  onClose: () => void;
  /** Appelé après une connexion réussie (au moins un restaurant). */
  onConnected: () => void;
}

/** Choix des restaurants Uber Eats à relier, au retour de la page Uber. */
export const UberEatsStoreSelectDialog = ({ sessionId, onClose, onConnected }: UberEatsStoreSelectDialogProps) => {
  const [stores, setStores] = useState<UberStoreOption[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setStores(null);
    setError(null);
    marketplaceOnboardingService
      .getUberConnectSession(sessionId)
      .then((session) => {
        setStores(session.stores);
        // Pré-coche les restaurants libres quand il n'y en a qu'un : le cas courant.
        const free = session.stores.filter((s) => s.status !== 'linked_elsewhere');
        setSelected(new Set(free.length === 1 ? [free[0].store_id] : []));
      })
      .catch((e) => {
        setError(
          onboardingErrorCode(e) === 'session_expired'
            ? 'Le délai pour choisir vos restaurants est dépassé. Recommencez la connexion.'
            : 'Impossible de charger vos restaurants Uber Eats. Recommencez la connexion.'
        );
      });
  }, [sessionId]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!sessionId || selected.size === 0) return;
    setSubmitting(true);
    try {
      const results = await marketplaceOnboardingService.completeUberConnect(sessionId, [...selected]);
      const { ok, message } = describeResults(results);
      if (ok > 0) {
        toast.success(message);
        onConnected();
        onClose();
      } else {
        toast.error(message || 'La connexion a échoué. Réessayez.');
      }
    } catch (e) {
      toast.error(
        onboardingErrorCode(e) === 'session_expired'
          ? 'Le délai pour choisir vos restaurants est dépassé. Recommencez la connexion.'
          : 'La connexion a échoué. Réessayez dans un instant.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!sessionId} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choisissez vos restaurants Uber Eats</DialogTitle>
          <DialogDescription>
            Les restaurants cochés seront reliés à cet établissement : leurs commandes arriveront dans Wello Resto.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !stores ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {stores.map((store) => {
              const blocked = store.status === 'linked_elsewhere';
              const badge = STATUS_BADGE[store.status];
              return (
                <label
                  key={store.store_id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${blocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'}`}
                >
                  <Checkbox
                    checked={selected.has(store.store_id)}
                    disabled={blocked || submitting}
                    onCheckedChange={(v) => toggle(store.store_id, v === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{store.name || 'Restaurant sans nom'}</span>
                      {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                    </div>
                    {store.address && <p className="text-xs text-muted-foreground mt-1">{store.address}</p>}
                    {store.other_software && !blocked && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        Ce restaurant est déjà relié à un autre logiciel de caisse : en le connectant, Wello Resto demandera à Uber Eats d'en gérer les commandes.
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!!error || !stores || selected.size === 0 || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Connecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
