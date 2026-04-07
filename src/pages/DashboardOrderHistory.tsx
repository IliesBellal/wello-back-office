/**
 * Dashboard Order History Page
 * 
 * Under "Tableau de bord" > "Historique de commandes"
 * Shows the order history that was previously in the Orders page.
 */

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardOrderHistory = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Historique de commandes</h1>
          <p className="text-muted-foreground mt-1">
            Consultez l'historique complet de vos commandes
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <p className="text-muted-foreground">Aucun historique</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardOrderHistory;
