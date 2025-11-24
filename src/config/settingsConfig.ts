import { FieldConfig } from "@/types/settings";

export const userProfileFields: FieldConfig[] = [
  { key: 'firstname', label: 'Prénom', type: 'text', group: 'profile', placeholder: 'Votre prénom' },
  { key: 'lastname', label: 'Nom', type: 'text', group: 'profile', placeholder: 'Votre nom' },
  { key: 'email', label: 'Email', type: 'email', group: 'profile', placeholder: 'votre@email.fr' },
  { key: 'phone', label: 'Téléphone', type: 'tel', group: 'profile', placeholder: '+33 6 12 34 56 78' },
];

export const establishmentInfoFields: FieldConfig[] = [
  { key: 'name', label: 'Nom de l\'établissement', type: 'text', group: 'info', placeholder: 'Nom du restaurant' },
  { key: 'phone', label: 'Téléphone', type: 'tel', group: 'info', placeholder: '01 02 03 04 05' },
  { key: 'siret', label: 'SIRET', type: 'text', group: 'info', placeholder: '123 456 789 00012' },
  { key: 'address', label: 'Adresse', type: 'text', group: 'info', placeholder: 'Adresse complète' },
  { key: 'currency', label: 'Devise', type: 'select', group: 'info', options: [
    { value: 'EUR', label: '€ Euro' },
    { value: 'USD', label: '$ Dollar' },
    { value: 'GBP', label: '£ Livre' },
  ]},
];

export const establishmentTimingsFields: FieldConfig[] = [
  { key: 'wait_time_min', label: 'Temps d\'attente minimum (min)', type: 'number', group: 'timings', min: 0, max: 120 },
  { key: 'wait_time_max', label: 'Temps d\'attente maximum (min)', type: 'number', group: 'timings', min: 0, max: 120 },
  { key: 'auto_close_enabled', label: 'Fermeture automatique', type: 'switch', group: 'timings' },
  { key: 'auto_close_delay', label: 'Délai de fermeture auto (min)', type: 'number', group: 'timings', min: 0, max: 60 },
];

export const establishmentOrderingFields: FieldConfig[] = [
  { key: 'paid_orders_only', label: 'Commandes payées uniquement', type: 'switch', group: 'ordering' },
  { key: 'concurrent_capacity', label: 'Capacité simultanée', type: 'number', group: 'ordering', min: 1, max: 200 },
  { key: 'disable_low_stock', label: 'Désactiver articles en rupture', type: 'switch', group: 'ordering' },
  { key: 'register_required', label: 'Inscription obligatoire', type: 'switch', group: 'ordering' },
];

export const establishmentScanOrderFields: FieldConfig[] = [
  { key: 'active_delivery', label: 'Livraison activée', type: 'switch', group: 'scan_order' },
  { key: 'active_takeaway', label: 'À emporter activé', type: 'switch', group: 'scan_order' },
  { key: 'active_on_site', label: 'Sur place activé', type: 'switch', group: 'scan_order' },
  { key: 'auto_accept_delivery', label: 'Auto-accepter livraisons', type: 'switch', group: 'scan_order' },
  { key: 'auto_accept_takeaway', label: 'Auto-accepter à emporter', type: 'switch', group: 'scan_order' },
  { key: 'allow_scheduled', label: 'Autoriser commandes programmées', type: 'switch', group: 'scan_order' },
  { key: 'max_schedule_days', label: 'Jours de programmation max', type: 'number', group: 'scan_order', min: 1, max: 30 },
  { key: 'enable_rating', label: 'Activer les avis', type: 'switch', group: 'scan_order' },
];
