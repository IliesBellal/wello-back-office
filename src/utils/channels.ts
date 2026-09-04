// Canonical channel keys, colors and labels for endpoints branched on
// internal/modules/analytics (ib-welloresto-api repo) — see that module's
// channels.go, which derives these same 8 keys from brand × order_type.
//
// docs/analytics/AUDIT.md I1 flagged the same channel being called
// `restaurant` in one tab's color map and `dine_in` in another's. This file
// is the one place a real (SQL-backed) analytics tab reads channel
// colors/labels from — every tab migrated off its mock should import from
// here rather than keep (or invent another) local map.
//
// The still-mocked tabs' own local channel maps (DashboardAnalysis.tsx's
// CHANNEL_COLORS, ChannelToggleButtons, etc.) are left untouched on purpose:
// they use a different, wider vocabulary (`ubereats`, `scanorder`,
// `click_collect`...) that isn't real either, and reconciling it is part of
// migrating those tabs, not this one.
export const CHANNEL_COLORS: Record<string, string> = {
  dine_in: '#3b82f6',
  takeaway: '#10b981',
  delivery: '#f59e0b',
  ubereats_takeaway: '#06b6d4',
  ubereats_delivery: '#0891b2',
  deliveroo_takeaway: '#14b8a6',
  deliveroo_delivery: '#0d9488',
  unknown: '#9ca3af',
};

export const CHANNEL_LABELS: Record<string, string> = {
  dine_in: 'Sur place',
  takeaway: 'À emporter',
  delivery: 'Livraison',
  ubereats_takeaway: 'UE Emporter',
  ubereats_delivery: 'UE Livraison',
  deliveroo_takeaway: 'DR Emporter',
  deliveroo_delivery: 'DR Livraison',
  unknown: 'Inconnu',
};

// Fixed display order — used when a chart wants a stable series/legend
// order rather than whatever order the API happened to return.
export const CHANNEL_ORDER = [
  'dine_in',
  'takeaway',
  'delivery',
  'ubereats_takeaway',
  'ubereats_delivery',
  'deliveroo_takeaway',
  'deliveroo_delivery',
  'unknown',
] as const;

export const channelColor = (channel: string): string => CHANNEL_COLORS[channel] ?? CHANNEL_COLORS.unknown;
export const channelLabel = (channel: string): string => CHANNEL_LABELS[channel] ?? channel;
