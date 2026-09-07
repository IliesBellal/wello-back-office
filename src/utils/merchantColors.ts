// Stable, ID-derived colors for the multi-establishment selector's charts
// (PROMPT 24 Phase 4) — mirrors channels.ts's channelColor pattern (a pure
// function keyed by ID, never by array index/rank) for the same reason:
// deselecting one establishment must not shift every other one's color. If
// color came from position in the current selection, unchecking the first
// establishment would silently reassign "the blue line" to a different site
// — exactly the confusion PROMPT 24 calls out explicitly.
//
// The palette is a DIFFERENT hue family from CHANNEL_COLORS (blue/green/
// amber/cyan/teal/gray) — violet/pink/indigo/fuchsia/rose/purple — so an
// establishment series and a channel series on the same screen are never
// visually confusable, as required (two distinct categorical scales, not a
// reused palette).
const MERCHANT_COLOR_PALETTE = [
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
  '#d946ef', // fuchsia
  '#f43f5e', // rose
  '#a855f7', // purple
  '#c026d3', // fuchsia (dark)
  '#4f46e5', // indigo (dark)
];

// A simple string hash (djb2-style), not the raw numeric id mod palette
// length: merchant IDs are small sequential integers-as-strings in
// practice, and a naive numeric mod would make adjacent establishments
// (e.g. "212"/"213") land on adjacent palette entries far more often than
// chance — a string hash spreads them out instead.
const hashMerchantId = (merchantId: string): number => {
  let hash = 0;
  for (let i = 0; i < merchantId.length; i++) {
    hash = (hash * 31 + merchantId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const merchantColor = (merchantId: string): string =>
  MERCHANT_COLOR_PALETTE[hashMerchantId(merchantId) % MERCHANT_COLOR_PALETTE.length];
