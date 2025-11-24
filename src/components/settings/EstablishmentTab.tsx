import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Clock, Smartphone, ShoppingCart } from "lucide-react";
import { useEstablishmentSettings } from "@/hooks/useSettings";
import { SettingsSection } from "./SettingsSection";
import { ColorPreview } from "./ColorPreview";
import { OpeningHours } from "./OpeningHours";
import { EstablishmentSettings } from "@/types/settings";
import {
  establishmentInfoFields,
  establishmentTimingsFields,
  establishmentOrderingFields,
  establishmentScanOrderFields
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={formData.info.is_open ? "default" : "destructive"} className="text-sm">
            {formData.info.is_open ? "🟢 Ouvert" : "🔴 Fermé"}
          </Badge>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-primary">
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Identité & Branding
          </CardTitle>
          <CardDescription>
            Informations générales de votre établissement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SettingsSection
            fields={establishmentInfoFields.filter(f => f.key !== 'primary_color' && f.key !== 'text_color')}
            values={formData.info}
            onChange={(key, value) => handleFieldChange('info', key, value)}
          />
          
          <ColorPreview
            primaryColor={formData.info.primary_color}
            textColor={formData.info.text_color}
            onPrimaryChange={(color) => handleFieldChange('info', 'primary_color', color)}
            onTextChange={(color) => handleFieldChange('info', 'text_color', color)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Flux de Commande
          </CardTitle>
          <CardDescription>
            Paramètres de gestion des commandes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">Temps d'attente</h4>
            <SettingsSection
              fields={establishmentTimingsFields}
              values={formData.timings}
              onChange={(key, value) => handleFieldChange('timings', key, value)}
            />
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-3">Options de commande</h4>
            <SettingsSection
              fields={establishmentOrderingFields}
              values={formData.ordering}
              onChange={(key, value) => handleFieldChange('ordering', key, value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Scan & Order
          </CardTitle>
          <CardDescription>
            Configuration de la commande digitale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsSection
              fields={establishmentScanOrderFields}
              values={formData.scan_order}
              onChange={(key, value) => handleFieldChange('scan_order', key, value)}
            />
          </div>
        </CardContent>
      </Card>

      <OpeningHours />
    </div>
  );
};
