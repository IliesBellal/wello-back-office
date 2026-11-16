/** Salutation selon l'heure de la journée (partagée entre le header et l'accueil). */
export const getGreeting = (date: Date = new Date()): string => {
  const h = date.getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};
