import { useParams, Navigate } from "react-router-dom";
import { EstablishmentTab } from "@/components/settings/EstablishmentTab";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const Settings = () => {
  const { section } = useParams<{ section?: string }>();
  const currentSection = section || 'establishment';

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {currentSection === 'establishment' ? 'Établissement' : 'Mon Profil'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentSection === 'establishment' 
              ? 'Gérez les paramètres de votre établissement'
              : 'Gérez vos informations personnelles'
            }
          </p>
        </div>

        {currentSection === 'establishment' && <EstablishmentTab />}
        {currentSection === 'profile' && <ProfileTab />}
        {!['establishment', 'profile'].includes(currentSection) && (
          <Navigate to="/settings/establishment" replace />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
