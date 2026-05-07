import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, Mail, Phone, Check } from "lucide-react";
import { useUserProfile } from "@/hooks/useSettings";
import { SettingsSection } from "./SettingsSection";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { UserProfile } from "@/types/settings";
import { userProfileFields } from "@/config/settingsConfig";
import { useEstablishmentSettings } from "@/hooks/useSettings";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { toast } from "@/hooks/use-toast";

export const ProfileTab = () => {
  const { profile, isLoading, isSaving, updateProfile, refreshProfile, uploadAvatar } = useUserProfile();
  const { settings: establishmentSettings } = useEstablishmentSettings();
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpMode, setOtpMode] = useState<'email' | 'tel' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
      const trimmedPhone = formData.phone?.trim();
      if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
        toast({
          title: "Numéro invalide",
          description: "Le numéro de téléphone est incomplet pour le pays sélectionné.",
          variant: "destructive"
        });
        return;
      }

      const normalizedPhone = trimmedPhone
        ? parsePhoneNumber(trimmedPhone)?.number || trimmedPhone
        : trimmedPhone;

      updateProfile({
        ...formData,
        phone: normalizedPhone
      });
    }
  };

  const handleVerifyClick = (type: 'email' | 'tel') => {
    setOtpMode(type);
    setOtpDialogOpen(true);
  };

  const handleOtpSuccess = async () => {
    // OTP validation updates verification flags server-side; only refresh local profile.
    await refreshProfile();
    setOtpDialogOpen(false);
    setOtpMode(null);
  };

  const handleOtpCancel = () => {
    setOtpDialogOpen(false);
    setOtpMode(null);
  };

  const handleAvatarButtonClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await uploadAvatar(file);
    event.target.value = "";
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
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button variant="outline" size="sm" onClick={handleAvatarButtonClick} disabled={isSaving}>
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
            defaultPhoneCountry={establishmentSettings?.info.country_code}
          />

          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-gradient-primary">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Vérification de contact
          </CardTitle>
          <CardDescription>
            Vérifiez votre email et numéro de téléphone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Verification */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{formData.email}</p>
                <p className="text-xs text-muted-foreground">Email</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {formData.email_verified ? (
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Check className="w-4 h-4" />
                  Vérifié
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerifyClick('email')}
                  className="text-xs"
                >
                  Vérifier
                </Button>
              )}
            </div>
          </div>

          {/* Phone Verification */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{formData.phone}</p>
                <p className="text-xs text-muted-foreground">Téléphone</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {formData.phone_verified ? (
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Check className="w-4 h-4" />
                  Vérifié
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerifyClick('tel')}
                  className="text-xs"
                >
                  Vérifier
                </Button>
              )}
            </div>
          </div>
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

      {otpMode && (
        <OTPVerification
          mode={otpMode}
          isOpen={otpDialogOpen}
          onSuccess={handleOtpSuccess}
          onCancel={handleOtpCancel}
        />
      )}
    </div>
  );
};
