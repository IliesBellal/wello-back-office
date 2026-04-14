import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { integrationsService } from '@/services/integrationsService';

export type PaymentStatus = 'verified' | 'action_required';

interface PaymentStatusResponse {
  status: PaymentStatus;
}

export const StripeStatusCard: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ═══ Fetch payment status on mount ═══
  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        setLoading(true);
        const response = await integrationsService.getStripeStatus();
        setStatus(response.status);
      } catch (error) {
        console.error('Failed to fetch payment status:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de récupérer le statut de vos paiements.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();
  }, [toast]);

  // ═══ Handle action button click ═══
  const handleActionClick = async () => {
    try {
      setActionLoading(true);
      const response = await integrationsService.getStripeOnboardingLink();
      
      if (response.url) {
        // Redirect to onboarding
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error('Failed to get onboarding link:', error);
      
      // Handle different error codes from API
      const errorCode = error?.response?.data?.code;
      let errorMessage = 'Une erreur est survenue lors de la récupération du lien de configuration.';

      if (errorCode === 'account_not_found') {
        errorMessage = 'Compte introuvable. Veuillez contacter le support.';
      } else if (errorCode === 'link_expired') {
        errorMessage = 'Le lien d\'intégration a expiré. Veuillez réessayer plus tard.';
      } else if (errorCode === 'already_verified') {
        errorMessage = 'Votre compte est déjà vérifié.';
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ═══ Skeleton loading state ═══
  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-muted animate-pulse"></div>
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // ═══ SUCCESS State ═══
  if (status === 'verified') {
    return (
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Paiements en ligne activés
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre compte est vérifié et prêt à recevoir des paiements.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // ═══ WARNING State ═══
  if (status === 'action_required') {
    return (
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">
                  Vérification en cours
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Des informations supplémentaires sont requises pour activer vos paiements.
                </p>
              </div>
            </div>
            <Button
              onClick={handleActionClick}
              disabled={actionLoading}
              size="sm"
              className="shrink-0"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Renseigner mes informations
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // ═══ No status (fallback) ═══
  return null;
};
