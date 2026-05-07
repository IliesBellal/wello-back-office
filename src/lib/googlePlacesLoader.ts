/// <reference types="@types/google.maps" />

let placesLibraryPromise: Promise<void> | null = null;

const injectGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('#google-maps-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
};

export const loadGooglePlacesLibrary = async (): Promise<void> => {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  console.log('Google Places API key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'UNDEFINED');
  if (!apiKey) {
    throw new Error('Missing VITE_GOOGLE_PLACES_API_KEY for Google Places autocomplete.');
  }

  if (!placesLibraryPromise) {
    placesLibraryPromise = injectGoogleMapsScript(apiKey).then(() => {
      return new Promise<void>((resolve) => {
        const check = () => {
          if ((window as Window & { google?: typeof google }).google?.maps?.places) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    });
  }

  await placesLibraryPromise;
};
