import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FloorPlanEditor } from '@/components/locations/FloorPlanEditor';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Page « Plan de salle » : garde de permission + mise en page. L'éditeur
 * (brouillon, canvas, outils) vit dans `FloorPlanEditor`.
 */
export default function Locations() {
  const { canManageSeatingPlan } = usePermissions();

  // RBAC lot 10 : on redirige sans permission.
  if (!canManageSeatingPlan) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout>
      <FloorPlanEditor />
    </DashboardLayout>
  );
}
