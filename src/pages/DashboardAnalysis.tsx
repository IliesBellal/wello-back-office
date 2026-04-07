/**
 * Dashboard Analysis Page
 * 
 * Under "Tableau de bord" > "Analyse"
 * Reserved for future analytics dashboard content.
 */

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export const DashboardAnalysis = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Analyse</h1>
        <p className="text-muted-foreground">
          Contenu d'analyse à venir...
        </p>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalysis;
