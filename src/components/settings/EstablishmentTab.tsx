import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Store, ShoppingCart, Clock } from "lucide-react";
import { useEstablishmentSettings } from "@/hooks/useSettings";
import { SettingsSection } from "./SettingsSection";
import { OpeningHours } from "./OpeningHours";
import { EstablishmentSettings } from "@/types/settings";
import {
  establishmentInfoFields,
  establishmentTimingsFields,
  establishmentOrderingFields
} from "@/config/settingsConfig";

export const EstablishmentTab = () => {
  const { settings, isLoading, isSaving, updateSettings } = useEstablishmentSettings();
  const [formData, setFormData] = useState<EstablishmentSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleFieldChange = (group: keyof EstablishmentSettings, key: string, value: any) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [group]: {
        ...formData[group],
        [key]: value
      }
    });
  };

  const handleSave = () => {
    if (formData) {
      updateSettings(formData);
    }
  };

  if (isLoading || !formData) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10">
      {/* Status Card */}
      <Card className="mb-10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">Statut</span>
                <Badge variant={formData.info.is_open ? "default" : "destructive"} className="text-sm">
                  {formData.info.is_open ? "🟢 Ouvert" : "🔴 Fermé"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formData.info.is_open 
                  ? "Selon horaires d'ouverture" 
                  : "Fermeture forcée"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                checked={formData.info.is_open}
                onCheckedChange={(checked) => handleFieldChange('info', 'is_open', checked)}
              />
              <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-primary">
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille de sections: 2 colonnes sur desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
        {/* Identity Card - Pleine largeur */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Identité
            </CardTitle>
            <CardDescription>Informations générales</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsSection
              fields={establishmentInfoFields}
              values={formData.info}
              onChange={(key, value) => handleFieldChange('info', key, value)}
              useGrid={true}
            />
          </CardContent>
        </Card>

        {/* Timings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Temps d'attente
            </CardTitle>
            <CardDescription>Configurez les délais de livraison</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsSection
              fields={establishmentTimingsFields}
              values={formData.timings}
              onChange={(key, value) => handleFieldChange('timings', key, value)}
            />
          </CardContent>
        </Card>

        {/* Ordering Options Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Options de commande
            </CardTitle>
            <CardDescription>Paramètres de gestion</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsSection
              fields={establishmentOrderingFields}
              values={formData.ordering}
              onChange={(key, value) => handleFieldChange('ordering', key, value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Opening Hours - Full Width */}
      <OpeningHours />
    </div>
  );
};
