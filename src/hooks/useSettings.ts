import { useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';
import { UserProfile, EstablishmentSettings, MfaType, HourOfOperationPayload } from '@/types/settings';
import { toast } from '@/hooks/use-toast';

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async (withLoading = true) => {
    try {
      if (withLoading) {
        setIsLoading(true);
      }
      const data = await settingsService.getUserProfile();
      setProfile(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive"
      });
    } finally {
      if (withLoading) {
        setIsLoading(false);
      }
    }
  };

  const refreshProfile = async () => {
    await loadProfile(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { avatar: _avatar, ...profileUpdates } = updates;
    try {
      setIsSaving(true);
      const updated = await settingsService.updateUserProfile(profileUpdates);
      setProfile(updated);
      toast({
        title: "Profil mis à jour",
        description: "Vos modifications ont été enregistrées"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setIsSaving(true);
      await settingsService.uploadUserProfileAvatar(file);
      await refreshProfile();
      toast({
        title: "Photo mise à jour",
        description: "Votre photo de profil a été enregistrée"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo de profil",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateMfaType = async (mfaType: MfaType) => {
    try {
      setIsSaving(true);
      const updated = await settingsService.updateUserProfile({ mfa_type: mfaType });
      setProfile(updated);
      toast({
        title: mfaType === 'email_sms' ? 'MFA activé' : 'MFA désactivé',
        description: mfaType === 'email_sms'
          ? 'La double authentification par email/SMS est maintenant active.'
          : 'La double authentification a été désactivée.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le paramètre MFA.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return { profile, isLoading, isSaving, updateProfile, refreshProfile, uploadAvatar, updateMfaType };
};

export const useEstablishmentSettings = () => {
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (withLoading = true) => {
    try {
      if (withLoading) {
        setIsLoading(true);
      }
      const data = await settingsService.getEstablishmentSettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive"
      });
    } finally {
      if (withLoading) {
        setIsLoading(false);
      }
    }
  };

  const refreshHoursOfOperations = async () => {
    await loadSettings(false);
  };

  const updateSettings = async (updates: Partial<EstablishmentSettings>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { siret: _siret, ...infoWithoutSiret } = updates.info ?? {};
    // Opening hours are managed by dedicated CRUD endpoints.
    const { hours_of_operations: _hoursOfOperations, ...updatesWithoutHours } = updates;
    const sanitized: Partial<EstablishmentSettings> = updates.info
      ? { ...updatesWithoutHours, info: infoWithoutSiret as typeof updates.info }
      : updatesWithoutHours;
    try {
      setIsSaving(true);
      const updated = await settingsService.updateEstablishmentSettings(sanitized);
      setSettings(updated);
      toast({
        title: "Paramètres mis à jour",
        description: "Les modifications ont été enregistrées"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const createHourOfOperation = async (payload: HourOfOperationPayload) => {
    try {
      setIsSaving(true);
      const created = await settingsService.createHourOfOperation(payload);
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hours_of_operations: [...prev.hours_of_operations, created],
        };
      });
      toast({
        title: 'Horaire ajouté',
        description: "Le créneau d'ouverture a été créé.",
      });
      return created;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de créer le créneau d'ouverture.",
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const updateHourOfOperation = async (hourId: string, payload: HourOfOperationPayload) => {
    try {
      setIsSaving(true);
      const updated = await settingsService.updateHourOfOperation(hourId, payload);
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hours_of_operations: prev.hours_of_operations.map((hour) => (
            hour.id === hourId ? updated : hour
          )),
        };
      });
      toast({
        title: 'Horaire modifié',
        description: "Le créneau d'ouverture a été mis à jour.",
      });
      return updated;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de modifier le créneau d'ouverture.",
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteHourOfOperation = async (hourId: string) => {
    try {
      setIsSaving(true);
      await settingsService.deleteHourOfOperation(hourId);
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hours_of_operations: prev.hours_of_operations.filter((hour) => hour.id !== hourId),
        };
      });
      toast({
        title: 'Horaire supprimé',
        description: "Le créneau d'ouverture a été supprimé.",
      });
      return true;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer le créneau d'ouverture.",
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    createHourOfOperation,
    updateHourOfOperation,
    deleteHourOfOperation,
    refreshHoursOfOperations,
  };
};
