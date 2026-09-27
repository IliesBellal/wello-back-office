/**
 * Règle de validité d'un créneau horaire (promotions et disponibilités),
 * identique à celle de l'API : intervalle [début, fin[ en heure locale de
 * l'établissement, avec début < fin, ou fin à 00:00 = jusqu'à minuit
 * (ex. 19:00–00:00). Tout autre créneau à l'envers est refusé par l'API.
 */
export const isValidTimeSlot = (slot: { start_time: string; end_time: string }): boolean => {
  const start = (slot.start_time ?? '').slice(0, 5);
  const end = (slot.end_time ?? '').slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return false;
  }
  return start < end || end === '00:00';
};

export const TIME_SLOT_ERROR = 'La fin doit être après le début (00:00 = jusqu’à minuit).';
