import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let isConfigured = false;
let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

export const loadGooglePlacesLibrary = async (): Promise<google.maps.PlacesLibrary> => {
  if (!isConfigured) {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    console.log('Google Places API key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'UNDEFINED');
    if (!apiKey) {
      throw new Error('Missing VITE_GOOGLE_PLACES_API_KEY for Google Places autocomplete.');
    }

    setOptions({
      apiKey,
      version: 'weekly',
    });
    isConfigured = true;
  }

  if (!placesLibraryPromise) {
    placesLibraryPromise = importLibrary('places') as Promise<google.maps.PlacesLibrary>;
  }

  return placesLibraryPromise;
};
