/**
 * Canaux de vente reconnus dans une phrase (« CA borne aujourd'hui »,
 * « CA à emporter cette année », « ventes ScanNOrder hier »).
 *
 * Mêmes valeurs que les filtres de la page Analyse (src/utils/orderFilters.ts,
 * OrderFilterRequest côté API) : une source (caisse, borne, ScanNOrder, Uber
 * Eats, Deliveroo) ou un type de commande (sur place, à emporter, livraison).
 * Plusieurs noms par canal : une entrée par nom, même identifiant.
 */
import type { EntityRecord } from './types';

export type ChannelField = 'sources' | 'orderTypes';

export interface ChannelMeta {
  field: ChannelField;
  value: string;
  label: string;
}

const CHANNELS: Array<{ field: ChannelField; value: string; label: string; names: string[] }> = [
  { field: 'sources', value: 'KIOSK', label: 'Borne', names: ['borne', 'bornes', 'borne de commande', 'kiosk', 'kiosque'] },
  {
    field: 'sources',
    value: 'SCANNORDER',
    label: 'ScanNOrder',
    names: ['scannorder', 'scan and order', 'commande en ligne', 'commandes en ligne', 'en ligne', 'click and collect', 'qr code'],
  },
  { field: 'sources', value: 'UBER_EATS', label: 'Uber Eats', names: ['uber eats', 'ubereats', 'uber'] },
  { field: 'sources', value: 'DELIVEROO', label: 'Deliveroo', names: ['deliveroo'] },
  { field: 'sources', value: 'WELLO_RESTO_POS', label: 'Caisse', names: ['comptoir', 'caisse enregistreuse'] },
  { field: 'orderTypes', value: 'TAKE_AWAY', label: 'À emporter', names: ['à emporter', 'emporter', 'take away'] },
  { field: 'orderTypes', value: 'IN', label: 'Sur place', names: ['sur place'] },
  { field: 'orderTypes', value: 'DELIVERY', label: 'Livraison', names: ['livraison', 'livraisons', 'en livraison'] },
];

export const CHANNEL_RECORDS: EntityRecord[] = CHANNELS.flatMap((c) =>
  c.names.map((name) => ({
    type: 'channel' as const,
    id: `${c.field}:${c.value}`,
    name,
    // Nom complet exigé : « commandes » seul ne veut pas dire « commandes en ligne ».
    meta: { field: c.field, value: c.value, label: c.label, fullNameOnly: true },
  })),
);

export function channelMeta(record?: EntityRecord): ChannelMeta | undefined {
  const m = record?.meta as Partial<ChannelMeta> | undefined;
  return m?.field && m.value && m.label ? (m as ChannelMeta) : undefined;
}
