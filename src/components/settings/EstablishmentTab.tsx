import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Store, ShoppingCart, Clock, Calendar, Utensils, Package, Truck } from "lucide-react";
import { useEstablishmentSettings } from "@/hooks/useSettings";
import { TabSystem } from "@/components/shared/TabSystem";
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
  const [activeTab, setActiveTab] = useState<string>("general");

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

  const renderTabContent = (tabId: string) => {
    if (tabId === "general") {
      return (
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
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
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.info.is_open}
                    onCheckedChange={(checked) => handleFieldChange('info', 'is_open', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
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

          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-gradient-primary">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      );
    }

    if (tabId === "ordering") {
      return (
        <div className="space-y-6">
          {/* Modes de commandes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Utensils className="h-5 w-5" />
                Modes de commandes
              </CardTitle>
              <CardDescription>Activez ou désactivez les modes de service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sur Place */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <Utensils className="h-4 w-4" />
                      Sur Place
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Les clients peuvent manger sur place</p>
                  </div>
                  <Switch
                    checked={formData.ordering.active_on_site}
                    onCheckedChange={(checked) => handleFieldChange('ordering', 'active_on_site', checked)}
                  />
                </div>

                {/* A Emporter */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      A Emporter
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Les clients peuvent retirer leur commande</p>
                  </div>
                  <Switch
                    checked={formData.ordering.active_takeaway}
                    onCheckedChange={(checked) => handleFieldChange('ordering', 'active_takeaway', checked)}
                  />
                </div>

                {/* Livraison */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Livraison
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Livraison disponible aux clients</p>
                  </div>
                  <Switch
                    checked={formData.ordering.active_delivery}
                    onCheckedChange={(checked) => handleFieldChange('ordering', 'active_delivery', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-gradient-primary">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      );
    }

    if (tabId === "production") {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
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

          {/* Cuisine */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                Cuisine
              </CardTitle>
              <CardDescription>Paramètres de gestion des commandes</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsSection
                fields={establishmentOrderingFields}
                values={formData.ordering}
                onChange={(key, value) => handleFieldChange('ordering', key, value)}
              />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-gradient-primary">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      );
    }

    if (tabId === "hours") {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Horaires d'ouvertures
              </CardTitle>
              <CardDescription>Gérez vos horaires d'ouverture</CardDescription>
            </CardHeader>
            <CardContent>
              <OpeningHours />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-gradient-primary">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full space-y-6 px-4 sm:px-6 md:px-8 py-6">
      <TabSystem
        tabs={[
          { id: "general", label: "Général" },
          { id: "ordering", label: "Prise de commande" },
          { id: "production", label: "Production" },
          { id: "hours", label: "Horaires d'ouvertures" }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        renderContent={renderTabContent}
      />
    </div>
  );
};
