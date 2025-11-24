import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield } from "lucide-react";
import { useUserProfile } from "@/hooks/useSettings";
import { SettingsSection } from "./SettingsSection";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { UserProfile } from "@/types/settings";
import { userProfileFields } from "@/config/settingsConfig";

export const ProfileTab = () => {
  const { profile, isLoading, isSaving, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleFieldChange = (key: string, value: any) => {
    if (!formData) return;
    setFormData({ ...formData, [key]: value });
  };

  const handleSave = () => {
    if (formData) {
      updateProfile(formData);
    }
  };

  if (isLoading || !formData) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  const initials = `${formData.firstname[0]}${formData.lastname[0]}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Gérez vos informations de profil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={formData.avatar} alt={`${formData.firstname} ${formData.lastname}`} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                Changer l'avatar
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG ou GIF. Max 2MB.
              </p>
            </div>
          </div>

          <SettingsSection
            fields={userProfileFields}
            values={formData}
            onChange={handleFieldChange}
          />

          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-gradient-primary">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sécurité
          </CardTitle>
          <CardDescription>
            Gérez vos paramètres de sécurité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setIsPasswordDialogOpen(true)}
            className="w-full"
          >
            Modifier le mot de passe
          </Button>
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      />
    </div>
  );
};
