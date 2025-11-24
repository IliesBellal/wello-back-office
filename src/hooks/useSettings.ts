import { useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';
import { UserProfile, EstablishmentSettings } from '@/types/settings';
import { toast } from '@/hooks/use-toast';

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getUserProfile();
      setProfile(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setIsSaving(true);
      const updated = await settingsService.updateUserProfile(updates);
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

  return { profile, isLoading, isSaving, updateProfile };
};

export const useEstablishmentSettings = () => {
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getEstablishmentSettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<EstablishmentSettings>) => {
    try {
      setIsSaving(true);
      const updated = await settingsService.updateEstablishmentSettings(updates);
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

  return { settings, isLoading, isSaving, updateSettings };
};
