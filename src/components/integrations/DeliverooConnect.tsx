import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { marketplaceOnboardingService, onboardingErrorCode } from '@/services/marketplaceOnboardingService';

const CONNECT_ERRORS: Record<string, string> = {
  not_linked:
    "Deliveroo ne nous a pas encore transmis ce site. Vérifiez l'identifiant saisi dans le Partner Hub, puis réessayez dans quelques minutes.",
  linked_elsewhere: 'Ce site Deliveroo est déjà relié à un autre établissement Wello Resto. Contactez le support Wello Resto.',
  location_not_allowed: 'Cet identifiant ne correspond pas à votre établissement. Rechargez la page et recommencez.',
};

interface DeliverooConnectPanelProps {
  /** Appelé une fois le site relié. */
  onConnected: () => void;
}

/**
 * Écran « Deliveroo non connecté » : Deliveroo n'a pas de page de connexion
 * comme Uber Eats ; le restaurateur relie son site à Wello Resto dans le
 * Partner Hub avec l'identifiant affiché ici, puis on vérifie la liaison.
 */
export const DeliverooConnectPanel = ({ onConnected }: DeliverooConnectPanelProps) => {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    marketplaceOnboardingService
      .getDeliverooConnectInfo()
      .then((info) => setLocationId(info.location_id))
      .catch(() => setLoadError(true));
  }, []);

  const handleCopy = async () => {
    if (!locationId) return;
    try {
      await navigator.clipboard.writeText(locationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible : sélectionnez l'identifiant et copiez-le à la main.");
    }
  };

  const handleCheck = async () => {
    if (!locationId) return;
    setChecking(true);
    setCheckError(null);
    try {
      await marketplaceOnboardingService.connectDeliveroo(locationId);
      toast.success('Deliveroo est connecté. Vos commandes arriveront dans Wello Resto.');
      onConnected();
    } catch (e) {
      setCheckError(CONNECT_ERRORS[onboardingErrorCode(e) ?? ''] ?? 'La vérification a échoué. Réessayez dans un instant.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Connecter Deliveroo</CardTitle>
        <CardDescription>
          Recevez vos commandes Deliveroo directement dans Wello Resto et gérez votre menu et vos disponibilités depuis un seul endroit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>Impossible de préparer la connexion Deliveroo. Rechargez la page.</AlertDescription>
          </Alert>
        ) : locationId === null ? (
          <Skeleton className="h-40 w-full" />
        ) : locationId === '' ? (
          <Alert>
            <AlertDescription>
              Tous les sites Deliveroo possibles sont déjà reliés à cet établissement. Contactez le support Wello Resto pour en ajouter un.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
              <li>
                Connectez-vous au{' '}
                <a href="https://partner-hub.deliveroo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Partner Hub Deliveroo
                </a>
                .
              </li>
              <li>Ouvrez « Intégrations », puis « Connecter des sites », et choisissez Wello Resto.</li>
              <li>
                <span>Pour votre site, saisissez cet identifiant dans le champ « Site location ID » :</span>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded-md border bg-muted px-3 py-1.5 text-base font-semibold text-foreground select-all">{locationId}</code>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? 'Copié' : 'Copier'}
                  </Button>
                </div>
              </li>
              <li>Validez chez Deliveroo, puis revenez ici et cliquez sur « Vérifier la connexion ».</li>
            </ol>

            {checkError && (
              <Alert variant="destructive">
                <AlertDescription>{checkError}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleCheck} disabled={checking}>
              {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vérifier la connexion
            </Button>
          </>
        )}
        <p className="text-sm text-muted-foreground">
          Pas encore partenaire Deliveroo ? Inscrivez votre établissement sur{' '}
          <a href="https://restaurateurs.deliveroo.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            restaurateurs.deliveroo.fr
          </a>
          , puis revenez sur cette page.
        </p>
      </CardContent>
    </Card>
  );
};
