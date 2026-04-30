import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { EstablishmentClosureModal } from '@/components/integrations/EstablishmentClosureModal';
import { integrationsService, type IntegrationStatus } from '@/services/integrationsService';
import { AlertCircle } from 'lucide-react';

const DeliverrooTutorial = () => (
  <div className="space-y-6">
    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 1: Créer un compte Deliveroo</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Visitez <a href="https://restaurateurs.deliveroo.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">restaurateurs.deliveroo.fr</a></li>
        <li>Cliquez sur "S'inscrire" et créez votre compte</li>
        <li>Remplissez les informations complètes de votre restaurant</li>
        <li>Fournissez votre SIRET et vérifiez votre établissement</li>
        <li>Acceptez les conditions d'utilisation Deliveroo</li>
      </ol>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 2: Ajouter votre menu</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Dans votre manager Deliveroo, allez à "Menu"</li>
        <li>Créez ou importez votre menu avec les catégories</li>
        <li>Ajoutez tous vos articles avec description et prix</li>
        <li>Configurez les variantes et options disponibles</li>
        <li>Enregistrez et publiez votre menu</li>
      </ol>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 3: Configurer la gestion des commandes</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Allez à "Paramètres" → "Integrations"</li>
        <li>Sélectionnez l'option API ou intégration POS</li>
        <li>Autorisez Wello Resto à recevoir les commandes</li>
        <li>Configurez vos préférences d'acceptation de commandes</li>
        <li>Testez avec une commande de test</li>
      </ol>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 4: Activer les zones de livraison</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Dans "Zones de couverture", définissez vos zones de livraison</li>
        <li>Fixez les frais de livraison par zone si applicable</li>
        <li>Définissez les horaires de service</li>
        <li>Activez la visibilité de votre restaurant sur Deliveroo</li>
        <li>Commencez à recevoir des commandes</li>
      </ol>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Étape 5: Optimiser votre visibilité</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Ajoutez des photos attrayantes de vos plats</li>
        <li>Rédigez des descriptions engageantes</li>
        <li>Mettez à jour régulièrement les disponibilités</li>
        <li>Répondez aux avis clients rapidement</li>
        <li>Créez des promotions pour augmenter les commandes</li>
      </ol>
    </div>

    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Besoin d'aide?</p>
          <p>Consultez la <a href="https://restaurateurs.deliveroo.fr/fr/support" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-400">documentation Deliveroo pour restaurateurs</a> ou contacter leur support.</p>
        </div>
      </div>
    </div>
  </div>
);

export default function DeliverooPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    integrationsService.getDeliverooStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (data: { commission_rate: number; auto_accept_orders: boolean; preparation_time_minutes?: number }) => {
    const updated = await integrationsService.updateDeliveroo(data);
    setStatus(updated);
  };

  const handleDisable = async () => {
    const updated = await integrationsService.disableDeliveroo();
    setStatus(updated);
  };

  const handleSync = async () => {
    await integrationsService.syncDeliverooMenu();
    // Refresh status
    const updated = await integrationsService.getDeliverooStatus();
    setStatus(updated);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Deliveroo</h1>
            <EstablishmentClosureModal />
          </div>
        }
        description="Gérez votre intégration Deliveroo, commandes et synchronisation du menu"
      >
        <IntegrationCard
          name="Deliveroo"
          status={status}
          loading={loading}
          onUpdate={handleUpdate}
          onDisable={handleDisable}
          onSync={handleSync}
          tutorial={<DeliverrooTutorial />}
          enablePreparationTime={true}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
