/**
 * Présentation commerciale des modules à la carte : nom, courte description,
 * prix public. Partagée par l'écran Abonnement & facturation (ModuleOfferCard)
 * et l'écran Modules du tunnel d'inscription (ScreenModules).
 *
 * Textes et prix publics repris du site vitrine (wello-resto-vitrine :
 * src/pages/tarifs.astro `configModules`). Les mini-mockups associés sont
 * dans ModuleMockup.tsx.
 */
export interface ModuleOffer {
  name: string;
  description: string;
  /** Prix public HT affiché sur la vitrine (tarifs.astro). */
  publicPrice: string;
}

export const MODULE_OFFERS: Record<string, ModuleOffer> = {
  reservation: {
    name: "Réservation",
    description: "Site de réservation, plan de salle, liste d'attente, rappels e-mail et SMS.",
    publicPrice: "59 €",
  },
  haccp: {
    name: "HACCP",
    description: "Relevés de températures, traçabilité photo, étiquettes, affiche allergènes.",
    publicPrice: "35 €",
  },
  planning: {
    name: "Planning",
    description: "Plannings, pointage, congés, suivi de la masse salariale.",
    publicPrice: "29 € + 2,50 €/salarié",
  },
  marketplaces: {
    name: "Intégration marketplaces",
    description: "Uber Eats et Deliveroo reçus directement en cuisine, disponibilités synchronisées en direct.",
    publicPrice: "39 €",
  },
  delivery: {
    name: "Suivi de livraison",
    description: "Dispatch sur tablette, position des livreurs en direct, suivi envoyé au client par SMS.",
    publicPrice: "39 €",
  },
};
