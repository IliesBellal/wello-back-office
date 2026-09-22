// Types du module CDS (Customer Display System) — écrans d'affichage client.
//
// Distincts de ceux du module Kiosk (`src/types/kiosks.ts`) : les deux parcs
// sont séparés côté API (tables, quota, permission), et un écran n'a ni
// paiement, ni menu, ni panier. Voir
// wello-resto-customer-display-system/docs/CDS_DECISIONS.md.

// ─── Enums ──────────────────────────────────────────────────────────────────

// Pas de statut 'inactive' : un écran est enrôlé ou révoqué, il n'existe pas
// d'état désactivé (décision D15). C'est l'écart le plus visible avec
// KioskStatus.
export type CdsDisplayStatus = 'pending' | 'active' | 'revoked';

// Les deux axes du filtre d'affichage (décision D2). Orthogonaux : une
// commande Uber Eats porte order_type = DELIVERY ou TAKE_AWAY, ce n'est pas
// un type à part.
export type CdsOrderType = 'IN' | 'TAKE_AWAY' | 'DELIVERY';
export type CdsChannel = 'WELLO_RESTO' | 'UBER_EATS' | 'DELIVEROO';

// Trois dispositions, un seul champ : il remplace l'ancien couple
// two_zones/three_zones + marketing_enabled, qui pouvait être incohérent.
export type CdsLayoutMode = 'marketing_right' | 'marketing_bottom' | 'no_marketing';

export type CdsMediaKind = 'image' | 'video' | 'qr';

// ─── Labels ─────────────────────────────────────────────────────────────────

export const cdsDisplayStatusLabels: Record<CdsDisplayStatus, string> = {
  pending: 'En attente',
  active: 'Actif',
  revoked: 'Révoqué',
};

export const cdsOrderTypeLabels: Record<CdsOrderType, string> = {
  IN: 'Sur place',
  TAKE_AWAY: 'À emporter',
  DELIVERY: 'Livraison',
};

export const cdsChannelLabels: Record<CdsChannel, string> = {
  WELLO_RESTO: 'WelloResto',
  UBER_EATS: 'Uber Eats',
  DELIVEROO: 'Deliveroo',
};

// L'ordre des clés est l'ordre d'affichage dans le sélecteur.
export const cdsLayoutModeLabels: Record<CdsLayoutMode, string> = {
  marketing_right: 'Bandeau marketing vertical (à droite)',
  marketing_bottom: 'Bandeau marketing horizontal (en bas)',
  no_marketing: 'Sans bandeau marketing',
};

// Vrai si la disposition affiche un bandeau — donc si la gestion des médias a
// un sens. Les médias sont conservés quand on passe à « sans bandeau ».
export const cdsLayoutHasMarketing = (mode: CdsLayoutMode): boolean => mode !== 'no_marketing';

export const cdsMediaKindLabels: Record<CdsMediaKind, string> = {
  image: 'Image',
  video: 'Vidéo',
  qr: 'QR code',
};

// ─── Durée d'affichage des médias ──────────────────────────────────────────
// Mêmes bornes que les contraintes CHECK de l'API (cds_media_items /
// cds_settings) : les valider ici évite un aller-retour pour une erreur
// évidente, mais c'est l'API qui fait foi.
export const CDS_MEDIA_DURATION_MIN = 3;
export const CDS_MEDIA_DURATION_MAX = 120;
// Durées proposées en un clic pour le réglage global : les cadences usuelles
// d'un affichage dynamique, de la bannière rapide à l'image qu'on prend le
// temps de lire.
export const CDS_MEDIA_DURATION_PRESETS = [5, 8, 10, 15, 30] as const;

// ─── Dimensions recommandées du bandeau ────────────────────────────────────
//
// Calculées pour un moniteur 1920 × 1080, la cible de l'application. Elles
// DÉRIVENT de la mise en page de l'écran et doivent rester synchronisées avec
// elle (wello-resto-customer-display-system) :
//   - le bandeau occupe 22 % de la largeur (à droite) ou de la hauteur (en bas) ;
//   - il est entouré d'une marge de 16 px.
//   - vertical : 0,22 × 1920 − 32 = 390 px de large, 1080 − 32 = 1048 px de haut ;
//   - horizontal : 1920 − 32 = 1888 px de large, 0,22 × 1080 − 32 = 206 px de haut.
// test/layout_test.dart, côté application, échoue si ces chiffres dérivent.
export interface CdsBannerSpec {
  width: number;
  height: number;
  /** Rapport largeur:hauteur, lisible. */
  ratio: string;
  orientation: string;
  /** Côté du QR code affiché, en pixels : dit s'il sera scannable de loin. */
  qrSide: number;
}

export const cdsBannerSpecs: Record<Exclude<CdsLayoutMode, 'no_marketing'>, CdsBannerSpec> = {
  marketing_right: { width: 390, height: 1048, ratio: '≈ 3:8', orientation: 'portrait', qrSide: 334 },
  marketing_bottom: { width: 1888, height: 206, ratio: '≈ 9:1', orientation: 'panoramique', qrSide: 173 },
};

// Les limites de l'API d'upload (maxCDSMediaImageBytes / maxCDSMediaVideoBytes).
export const CDS_MAX_IMAGE_MB = 5;
export const CDS_MAX_VIDEO_MB = 50;

export const CDS_ORDER_TYPES: CdsOrderType[] = ['IN', 'TAKE_AWAY', 'DELIVERY'];
export const CDS_CHANNELS: CdsChannel[] = ['WELLO_RESTO', 'UBER_EATS', 'DELIVEROO'];

// ─── Écrans ─────────────────────────────────────────────────────────────────

export interface CdsDisplay {
  display_id: string;
  name: string;
  status: CdsDisplayStatus;
  app_version: string | null;
  hardware_model: string | null;
  os_version: string | null;
  last_heartbeat_at: string | null;
  last_ip: string | null;
  created_at: string;
}

// L'API expose le plafond et son usage avec la liste — le back-office doit
// pouvoir afficher « 3 / 4 écrans » et désactiver le bouton d'ajout avant que
// le restaurateur ne génère un code pour rien (décision D4).
export interface CdsDisplayList {
  displays: CdsDisplay[];
  active_used: number;
  active_max: number;
}

export interface UpdateCdsDisplayRequest {
  name: string;
}

// ─── Codes d'enrôlement ─────────────────────────────────────────────────────

export interface CdsEnrollmentCode {
  id: string;
  // Nom choisi à la génération. Nul pour un code créé sans nom : l'écran
  // garde alors celui qu'il s'est donné lui-même.
  name: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export interface CdsEnrollmentCodeCreated {
  code: string;
  name?: string;
  expires_at: string;
}

// ─── Paramètres (par écran) ─────────────────────────────────────────────────

export interface CdsSettings {
  layout_mode: CdsLayoutMode;
  preparing_zone_ratio: number;
  order_types: CdsOrderType[];
  channels: CdsChannel[];
  show_wait_time: boolean;
  // Durée d'affichage par défaut des images et QR codes de la rotation. Chaque
  // média peut la surcharger avec sa propre durée.
  default_media_duration_seconds: number;
}

// Mise à jour partielle : l'API n'écrit que les champs présents.
export type UpdateCdsSettingsRequest = Partial<CdsSettings>;

// ─── Médias marketing ───────────────────────────────────────────────────────

export interface CdsMediaItem {
  id: string;
  kind: CdsMediaKind;
  url: string | null;
  qr_payload: string | null;
  // Durée EFFECTIVE, résolue côté serveur : la durée propre du média si elle
  // existe, sinon la durée par défaut de l'écran. Sans objet pour une vidéo,
  // jouée en entier.
  duration_seconds: number;
  // Vrai si la durée est propre à ce média, faux s'il suit le réglage global.
  custom_duration: boolean;
  sort_order: number;
}

export interface CreateCdsQrMediaRequest {
  kind: 'qr';
  qr_payload: string;
  // Facultative : absente, le média suit la durée par défaut de l'écran.
  duration_seconds?: number;
}

// ─── Erreurs métier (200 OK avec un payload d'erreur dans `data`) ──────────

export type CdsApiErrorStatus =
  | 'cds_max_displays_reached'
  | 'cds_not_found'
  | 'cds_settings_invalid'
  | 'cds_media_invalid'
  | 'cds_media_not_found'
  | 'cds_name_invalid';

export interface CdsApiErrorPayload {
  error: string;
  message: string;
  status: CdsApiErrorStatus | string;
}

export const cdsApiErrorMessages: Record<CdsApiErrorStatus, string> = {
  // Le message dit quoi faire : sans cela, le restaurateur bute sur la limite
  // sans savoir que la révocation est la seule sortie (décision D4/D15).
  cds_max_displays_reached:
    "Limite d'écrans atteinte. Révoquez un écran existant pour en ajouter un nouveau.",
  cds_not_found: "Cet écran n'existe pas ou n'appartient pas à cet établissement.",
  cds_settings_invalid: 'Les paramètres envoyés sont invalides.',
  cds_media_invalid: "Ce média est invalide : vérifiez le format et la durée d'affichage.",
  cds_media_not_found: "Ce média n'existe plus.",
  cds_name_invalid: 'Le nom doit contenir entre 1 et 100 caractères.',
};
