import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { integrationsService } from '@/services/integrationsService';

export interface BankAccount {
  id: string;
  bank_name: string;
  last4: string;
  currency: string;
  status: 'verified' | 'pending' | 'errored';
  account_holder_name?: string;
}

export const BankAccountsTab: React.FC = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ═══ Fetch bank accounts on mount ═══
  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await integrationsService.getStripeBankAccounts();
      setAccounts(response.accounts);
    } catch (error: any) {
      console.error('Failed to fetch bank accounts:', error);
      
      const errorCode = error?.response?.data?.code;
      
      if (errorCode === 'account_not_created') {
        setError('Veuillez d\'abord compléter votre configuration de paiements pour configurer vos virements.');
      } else if (errorCode === 'account_not_accessible') {
        setError('Votre compte n\'est pas accessible. Veuillez vérifier votre configuration.');
      } else {
        setError('Impossible de récupérer vos comptes bancaires.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBankInfo = async () => {
    try {
      setUpdating(true);
      const response = await integrationsService.getStripeBankAccountLink();
      
      if (response.url) {
        // Redirect to bank account configuration
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error('Failed to get bank account link:', error);
      
      const errorCode = error?.response?.data?.code;
      let errorMessage = 'Une erreur est survenue.';

      if (errorCode === 'account_not_found') {
        errorMessage = 'Compte introuvable. Veuillez contacter le support.';
      } else if (errorCode === 'link_expired') {
        errorMessage = 'Le lien d\'intégration a expiré. Veuillez réessayer plus tard.';
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  // ═══ Skeleton loading state ═══
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 md:px-8 py-10">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ Error state ═══
  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 md:px-8 py-10">
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <CardTitle>Configuration requise</CardTitle>
                <CardDescription className="mt-1">{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ═══ Empty state ═══
  if (accounts.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 md:px-8 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Compte bancaire</CardTitle>
            <CardDescription>
              Gérez les coordonnées bancaires pour vos virements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-foreground mb-2">Aucun compte bancaire</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Vous n'avez pas encore configuré de compte bancaire pour vos virements.
              </p>
              <Button onClick={handleUpdateBankInfo} disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter un compte bancaire
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ Bank accounts list ═══
  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-8 py-10 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Comptes bancaires</CardTitle>
              <CardDescription>
                Gérez les coordonnées bancaires pour vos virements.
              </CardDescription>
            </div>
            <Button
              onClick={handleUpdateBankInfo}
              disabled={updating}
              size="sm"
              className="w-full md:w-auto"
            >
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Modifier les coordonnées
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {account.bank_name || 'Compte bancaire'}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>IBAN : ••••{account.last4}</span>
                    <span>{account.currency}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : account.status === 'pending'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {account.status === 'verified'
                        ? 'Validé'
                        : account.status === 'pending'
                        ? 'En attente'
                        : 'Erreur'}
                    </span>
                  </div>
                  {account.account_holder_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Titulaire : {account.account_holder_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
