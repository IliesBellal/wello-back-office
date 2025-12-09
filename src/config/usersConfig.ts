export const permissionsConfig = [
  {
    key: 'enabled',
    label: 'Compte Actif',
    description: "L'utilisateur peut se connecter"
  },
  {
    key: 'is_admin',
    label: 'Administrateur',
    description: 'Accès complet au back-office'
  }
];

export const activityTypeLabels: Record<string, { label: string; color: string }> = {
  ORDER_CREATION: { label: 'Création de commande', color: 'text-green-600' },
  ORDER_PRICING: { label: 'Tarification commande', color: 'text-blue-600' },
  PAYMENT_CREATION: { label: 'Paiement créé', color: 'text-emerald-600' },
  ORDER_EDITING: { label: 'Modification commande', color: 'text-amber-600' },
  PAYMENT_DELETION: { label: 'Paiement supprimé', color: 'text-red-600' },
  ORDER_REFUND: { label: 'Remboursement commande', color: 'text-orange-600' },
  CASH_REGISTER_CLOSE: { label: 'Fermeture caisse', color: 'text-purple-600' },
  CLOCK_IN: { label: 'Pointage entrée', color: 'text-teal-600' }
};
