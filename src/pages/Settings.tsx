import { useParams, Navigate } from "react-router-dom";
import { EstablishmentTab } from "@/components/settings/EstablishmentTab";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";

const Settings = () => {
  const { section } = useParams<{ section?: string }>();
  const currentSection = section || 'establishment';

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <h1 className="text-3xl font-bold text-foreground">
            {currentSection === 'establishment' ? 'Établissement' : 'Mon Profil'}
          </h1>
        }
        description={
          currentSection === 'establishment' 
            ? 'Gérez les paramètres de votre établissement, horaires et informations générales'
            : 'Gérez vos informations personnelles et préférences de compte'
        }
      >
        {currentSection === 'establishment' && <EstablishmentTab />}
        {currentSection === 'profile' && <ProfileTab />}
        {!['establishment', 'profile'].includes(currentSection) && (
          <Navigate to="/settings/establishment" replace />
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default Settings;
