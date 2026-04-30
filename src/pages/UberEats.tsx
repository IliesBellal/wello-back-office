import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { EstablishmentClosureModal } from '@/components/integrations/EstablishmentClosureModal';
import { integrationsService, type IntegrationStatus } from '@/services/integrationsService';
import { AlertCircle, Check, Monitor, ListChecks, Settings } from 'lucide-react';

const UberEatsTutorial = () => (
  <div className="space-y-6">
    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 1: Créer un compte Uber Eats</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Visitez <a href="https://restaurateurs.uber.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">restaurateurs.uber.com</a></li>
        <li>Cliquez sur "Créer un compte" ou connectez-vous avec un compte existant</li>
        <li>Remplissez les informations de votre établissement</li>
        <li>Acceptez les conditions d'utilisation d'Uber Eats</li>
        <li>Complétez la vérification de votre restaurant</li>
      </ol>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 2: Configurer votre menu</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Dans votre tableau de bord Uber Eats, allez à "Menu et articles"</li>
        <li>Importez votre menu complet avec les catégories, articles et prix</li>
        <li>Configurez les options et suppléments disponibles</li>
        <li>Définissez les horaires d'ouverture</li>
        <li>Vérifiez que tous les articles sont correctement affichés</li>
      </ol>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 3: Connecter votre système POS</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Allez à "Paramètres" → "Intégrations" dans Uber Eats</li>
        <li>Sélectionnez "Wello Resto" ou "Intégration API"</li>
        <li>Autorisez la connexion pour permettre la réception de commandes</li>
        <li>Testez la réception avec une commande test</li>
        <li>Activez l'acceptation automatique si désiré</li>
      </ol>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 4: Configurer les horaires et la livraison</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Définissez vos horaires de service</li>
        <li>Configurez les zones de livraison disponibles</li>
        <li>Définissez les frais de livraison si applicable</li>
        <li>Testez que les clients peuvent passer commandes</li>
      </ol>
    </div>

    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Besoin d'aide?</p>
          <p>Consultez la <a href="https://www.uber.com/fr/fr/uber-eats/restaurateurs/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-400">documentation Uber Eats pour restaurateurs</a> ou contacter leur support.</p>
        </div>
      </div>
    </div>
  </div>
);

export default function UberEatsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    integrationsService.getUberEatsStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (data: { commission_rate: number; auto_accept_orders: boolean; preparation_time_minutes?: number }) => {
    const updated = await integrationsService.updateUberEats(data);
    setStatus(updated);
  };

  const handleDisable = async () => {
    const updated = await integrationsService.disableUberEats();
    setStatus(updated);
  };

  const handleSync = async () => {
    await integrationsService.syncUberEatsMenu();
    // Refresh status
    const updated = await integrationsService.getUberEatsStatus();
    setStatus(updated);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Uber Eats</h1>
            <EstablishmentClosureModal />
          </div>
        }
        description="Gérez votre intégration Uber Eats, commandes et synchronisation du menu"
      >
        <IntegrationCard
          name="Uber Eats"
          status={status}
          loading={loading}
          onUpdate={handleUpdate}
          onDisable={handleDisable}
          onSync={handleSync}
          tutorial={<UberEatsTutorial />}
          enablePreparationTime={true}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
