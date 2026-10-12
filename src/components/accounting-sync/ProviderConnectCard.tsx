import { useState } from 'react';
import { ExternalLink, KeyRound, Link2, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AUTH_API_TOKEN,
  AUTH_OAUTH,
  accountingErrorCode,
  accountingErrorMessage,
  accountingSyncService,
  type AccountingProvider,
} from '@/services/accountingSyncService';

interface ProviderConnectCardProps {
  providers: AccountingProvider[];
  /** Appelé une fois la connexion créée : la page se recharge sur l'étape suivante. */
  onConnected: () => void;
}

/**
 * Étape 1 : choisir le logiciel de comptabilité du catalogue et s'y connecter,
 * par OAuth (bouton « Se connecter avec… », quand l'application de l'éditeur
 * est configurée côté API) ou par jeton d'API généré par l'établissement.
 */
export const ProviderConnectCard = ({ providers, onConnected }: ProviderConnectCardProps) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(providers.length === 1 ? providers[0].key : null);
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = providers.find((p) => p.key === selectedKey) ?? null;
  const canOAuth = !!provider && provider.auth_methods.includes(AUTH_OAUTH);
  const canToken = !!provider && provider.auth_methods.includes(AUTH_API_TOKEN);

  const handleOAuth = async () => {
    if (!provider) return;
    setError(null);
    setRedirecting(true);
    try {
      const url = await accountingSyncService.getOAuthUrl(provider.key);
      window.location.href = url;
    } catch (e) {
      setError(accountingErrorMessage(e));
      setRedirecting(false);
    }
  };

  const handleToken = async () => {
    if (!provider) return;
    setError(null);
    setSubmitting(true);
    try {
      await accountingSyncService.connectWithToken(provider.key, token);
      setToken('');
      toast.success(`${provider.name} est connecté.`);
      onConnected();
    } catch (e) {
      const code = accountingErrorCode(e);
      if (code === 'credentials_rejected') {
        setError(
          `${provider.name} a refusé ce jeton. Vérifiez qu'il est complet, qu'il n'a pas expiré et que les droits demandés sont bien cochés.`,
        );
      } else if (code === 'not_configured') {
        setError("La connexion à un logiciel de comptabilité n'est pas encore disponible. Contactez le support WelloResto.");
      } else {
        setError(accountingErrorMessage(e, "Connexion impossible. Vérifiez le jeton puis réessayez."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-card rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Plug className="h-5 w-5" />
          Relier votre logiciel de comptabilité
        </CardTitle>
        <CardDescription>
          Chaque jour, après la clôture de la veille, WelloResto envoie à votre logiciel l'écriture de vos ventes
          (chiffre d'affaires par taux de TVA, encaissements par moyen de paiement). Votre comptable n'a plus à
          ressaisir vos Z de caisse. Un seul logiciel peut être relié à votre établissement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Logiciel</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {providers.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setSelectedKey(p.key);
                  setError(null);
                }}
                className={`rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  p.key === selectedKey ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}
              >
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
          {providers.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun logiciel n'est disponible pour le moment.</p>
          )}
        </div>

        {provider && (
          <div className="space-y-5">
            {canOAuth && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Connexion directe</p>
                <p className="text-xs text-muted-foreground">
                  Vous serez redirigé vers {provider.name} pour choisir l'entreprise et autoriser WelloResto, puis
                  ramené ici.
                </p>
                <Button onClick={handleOAuth} disabled={redirecting} className="gap-2">
                  <Link2 className="h-4 w-4" />
                  {redirecting ? 'Redirection...' : `Se connecter avec ${provider.name}`}
                </Button>
              </div>
            )}

            {canToken && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{canOAuth ? 'Ou avec un jeton d\'API' : 'Connexion par jeton d\'API'}</p>
                  <Badge variant="secondary" className="gap-1">
                    <KeyRound className="h-3 w-3" />
                    Jeton
                  </Badge>
                </div>

                {provider.key === 'pennylane' && (
                  <Alert>
                    <AlertTitle>Créer le jeton dans Pennylane</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>
                          Connectez-vous à Pennylane avec un compte <strong>administrateur</strong> (dirigeant ou
                          comptable) ; un abonnement Essential ou supérieur est requis.
                        </li>
                        <li>
                          Ouvrez les paramètres de l'entreprise, rubrique <strong>Connectivité &gt; Développeurs</strong>,
                          et créez un jeton d'API (le libellé du menu peut varier selon la version).
                        </li>
                        <li>Cliquez sur « Générer un jeton d'API » et nommez-le « WelloResto ».</li>
                        <li>
                          Sous <strong>API V2</strong>, choisissez <strong>Lecture et écriture</strong> : WelloResto lit
                          vos journaux et vos comptes, et crée l'écriture de ventes.
                        </li>
                        <li>
                          Choisissez l'expiration <strong>Illimité</strong> (ou la plus longue proposée) : à
                          l'expiration du jeton, la synchronisation s'arrête.
                        </li>
                        <li>
                          <strong>Copiez le jeton tout de suite</strong> : Pennylane ne l'affiche qu'une fois.
                        </li>
                      </ol>
                      <p className="text-xs text-muted-foreground">
                        Quand le jeton expire ou est révoqué, la synchronisation s'arrête et il suffit d'en coller un
                        nouveau.
                      </p>
                      <a
                        href="https://pennylane.readme.io/docs/generating-my-api-token"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Guide Pennylane <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="accounting-token">Jeton d'API {provider.name}</Label>
                  <Input
                    id="accounting-token"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Collez le jeton ici"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le jeton est chiffré et ne sera plus jamais affiché.
                  </p>
                </div>
                <Button onClick={handleToken} disabled={submitting || token.trim() === ''} className="gap-2">
                  <Plug className="h-4 w-4" />
                  {submitting ? 'Vérification...' : 'Connecter'}
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
