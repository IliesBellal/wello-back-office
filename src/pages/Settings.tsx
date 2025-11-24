import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, User } from "lucide-react";
import { EstablishmentTab } from "@/components/settings/EstablishmentTab";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les paramètres de votre établissement et votre profil
          </p>
        </div>

        <Tabs defaultValue="establishment" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="establishment" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Établissement
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Mon Profil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="establishment" className="mt-6">
            <EstablishmentTab />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <ProfileTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
