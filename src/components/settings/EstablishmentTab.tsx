import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Store, ShoppingCart, Clock, Calendar, Utensils, Package, Truck, Lock, Sparkles } from "lucide-react";
import { useEstablishmentSettings } from "@/hooks/useSettings";
import { TabSystem } from "@/components/shared/TabSystem";
import { SettingsSection } from "./SettingsSection";
import { OpeningHours } from "./OpeningHours";
import { EstablishmentSettings, HourOfOperationPayload, DEFAULT_CUSTOMER_FORM_REQUIREMENTS } from "@/types/settings";
import {
  establishmentInfoFields,
  establishmentTimingsFields,
  establishmentOrderingFields,
  establishmentSecurityFields
} from "@/config/settingsConfig";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { toast } from "@/hooks/use-toast";
import { AddressAutocomplete, ParsedAddress } from "@/components/shared/AddressAutocomplete";

const CUSTOMER_FORM_FIELDS: { key: string; label: string }[] = [
  { key: 'first_name', label: 'Prénom' },
  { key: 'name', label: 'Nom' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'postal_address', label: 'Adresse postale' },
  { key: 'email', label: 'Email' },
];

const CUSTOMER_FORM_MODES: { key: 'dine_in' | 'take_away' | 'delivery'; label: string }[] = [
  { key: 'dine_in', label: 'Sur place' },
  { key: 'take_away', label: 'À emporter' },
  { key: 'delivery', label: 'Livraison' },
];

export const EstablishmentTab = () => {
  const {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    createHourOfOperation,
    updateHourOfOperation,
    deleteHourOfOperation,
  } = useEstablishmentSettings();
  const [formData, setFormData] = useState<EstablishmentSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>("general");

  const securityDelayField = establishmentSecurityFields.find((field) => field.key === 'pos_auto_lock_delay_minutes');
  const securityDelayMin = securityDelayField?.min ?? 5;
  const securityDelayMax = securityDelayField?.max ?? 240;

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleFieldChange = (group: keyof EstablishmentSettings, key: string, value: unknown) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [group]: {
        ...formData[group],
        [key]: value
      }
    });
  };

  const handleCustomerFormChange = (fieldKey: string, modeKey: 'dine_in' | 'take_away' | 'delivery', value: boolean) => {
    if (!formData) return;
    const currentRequirements = formData.customer_form_requirements ?? DEFAULT_CUSTOMER_FORM_REQUIREMENTS;
    setFormData({
      ...formData,
      customer_form_requirements: {
        ...currentRequirements,
        [fieldKey]: {
          ...(currentRequirements[fieldKey] ?? { dine_in: false, take_away: false, delivery: false }),
          [modeKey]: value,
        },
      },
    });
  };

  const getSecurityDelayError = (value: number): string | null => {
    if (value < securityDelayMin || value > securityDelayMax) {
      return `Le délai doit être compris entre ${securityDelayMin} et ${securityDelayMax} minutes.`;
    }
    return null;
  };

  const handleAddressSelect = (parsed: ParsedAddress) => {
    if (!formData) return;
    setFormData({
      ...formData,
      info: {
        ...formData.info,
        address: parsed.address,
        street: parsed.street,
        city: parsed.city,
        postal_code: parsed.postal_code,
        country: parsed.country,
        lat: parsed.lat,
        lng: parsed.lng,
      },
    });
  };

  const handleSave = () => {
    if (formData) {
      const trimmedPhone = formData.info.phone?.trim();
      if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
        toast({
          title: "Numéro invalide",
          description: "Le numéro de téléphone est incomplet pour le pays sélectionné.",
          variant: "destructive"
        });
        return;
      }

      const securityDelayError = getSecurityDelayError(formData.security.pos_auto_lock_delay_minutes);
      if (securityDelayError) {
        toast({
          title: "Délai invalide",
          description: securityDelayError,
          variant: "destructive"
        });
        return;
      }

      const normalizedPhone = trimmedPhone
        ? parsePhoneNumber(trimmedPhone)?.number || trimmedPhone
        : trimmedPhone;

      updateSettings({
        ...formData,
        info: {
          ...formData.info,
          phone: normalizedPhone
        }
      });
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
              <div className="space-y-4">
                <SettingsSection
                  fields={establishmentInfoFields}
                  values={formData.info}
                  onChange={(key, value) => handleFieldChange('info', key, value)}
                  defaultPhoneCountry={formData.info.country_code}
                />
                <AddressAutocomplete
                  label="Adresse"
                  value={formData.info.address ?? ''}
                  onSelect={handleAddressSelect}
                  placeholder="Rechercher l'adresse de l'établissement..."
                />
              </div>
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

          {/* Vente additionnelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Vente additionnelle
              </CardTitle>
              <CardDescription>Suggestions d'articles complémentaires sur le POS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Suggestions de vente additionnelle
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Afficher des suggestions d'articles complémentaires lors de la prise de commande sur le POS
                  </p>
                </div>
                <Switch
                  checked={formData.ordering.upsell_enabled}
                  onCheckedChange={(checked) => handleFieldChange('ordering', 'upsell_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Formulaire client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Utensils className="h-5 w-5" />
                Formulaire client
              </CardTitle>
              <CardDescription>Définissez les informations client requises pour chaque mode de commande</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-muted-foreground py-2"></th>
                      {CUSTOMER_FORM_MODES.map((mode) => (
                        <th key={mode.key} className="text-center font-medium text-muted-foreground py-2 px-2">
                          {mode.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CUSTOMER_FORM_FIELDS.map((field) => {
                      const fieldRequirements = formData.customer_form_requirements?.[field.key]
                        ?? DEFAULT_CUSTOMER_FORM_REQUIREMENTS[field.key];
                      return (
                        <tr key={field.key} className="border-t">
                          <td className="py-3 font-medium text-foreground">{field.label}</td>
                          {CUSTOMER_FORM_MODES.map((mode) => (
                            <td key={mode.key} className="text-center py-3 px-2">
                              <Switch
                                checked={fieldRequirements[mode.key]}
                                onCheckedChange={(checked) => handleCustomerFormChange(field.key, mode.key, checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

    if (tabId === "security") {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5" />
                Sécurité
              </CardTitle>
              <CardDescription>
                La caisse (POS) se verrouille automatiquement après une période d'inactivité.
                Ce verrouillage ne s'applique pas à l'application mobile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsSection
                fields={establishmentSecurityFields}
                values={formData.security}
                onChange={(key, value) => handleFieldChange('security', key, value)}
                errors={
                  getSecurityDelayError(formData.security.pos_auto_lock_delay_minutes)
                    ? { pos_auto_lock_delay_minutes: getSecurityDelayError(formData.security.pos_auto_lock_delay_minutes)! }
                    : undefined
                }
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
              <OpeningHours
                hours={formData.hours_of_operations}
                isSaving={isSaving}
                onCreateHour={(payload: HourOfOperationPayload) => createHourOfOperation(payload)}
                onUpdateHour={(hourId: string, payload: HourOfOperationPayload) => updateHourOfOperation(hourId, payload)}
                onDeleteHour={(hourId: string) => deleteHourOfOperation(hourId)}
              />
            </CardContent>
          </Card>
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
          { id: "security", label: "Sécurité" },
          { id: "hours", label: "Horaires d'ouvertures" }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        renderContent={renderTabContent}
      />
    </div>
  );
};
