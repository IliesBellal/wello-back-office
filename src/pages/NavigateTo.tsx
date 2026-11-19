import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';

/**
 * Page publique du QR code des tickets de livraison : le livreur choisit son
 * application GPS. Aucune authentification et aucun appel API : la destination
 * est dans l'URL (`?lat=..&lng=..`, ou `?q=adresse` à défaut de coordonnées),
 * donc la page ne dépend que de l'hébergement statique (pas de démarrage à
 * froid de l'API pendant que le livreur est dans la rue).
 *
 * Le dernier choix est mémorisé sur l'appareil : aux scans suivants on
 * redirige directement, avec un lien « Changer d'application » (?choose=1).
 */

type NavApp = 'google' | 'waze' | 'apple';

const STORAGE_KEY = 'wello_nav_app';

const APP_LABELS: Record<NavApp, string> = {
  google: 'Google Maps',
  waze: 'Waze',
  apple: 'Plans (Apple)',
};

interface Destination {
  lat: number;
  lng: number;
}

const readStoredApp = (): NavApp | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'google' || value === 'waze' || value === 'apple' ? value : null;
  } catch {
    return null;
  }
};

const storeApp = (app: NavApp) => {
  try {
    localStorage.setItem(STORAGE_KEY, app);
  } catch {
    // Navigation privée : tant pis, on redemandera au prochain scan.
  }
};

const isApplePlatform = () => {
  const ua = navigator.userAgent;
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
};

const parseCoordinate = (raw: string | null, limit: number): number | null => {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
};

const buildUrl = (app: NavApp, destination: Destination | null, query: string): string => {
  const coords = destination ? `${destination.lat},${destination.lng}` : null;
  const encodedQuery = encodeURIComponent(query);
  switch (app) {
    case 'waze':
      return coords
        ? `https://waze.com/ul?ll=${coords}&navigate=yes`
        : `https://waze.com/ul?q=${encodedQuery}&navigate=yes`;
    case 'apple':
      return coords
        ? `https://maps.apple.com/?daddr=${coords}&dirflg=d`
        : `https://maps.apple.com/?daddr=${encodedQuery}&dirflg=d`;
    case 'google':
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${coords ?? encodedQuery}&travelmode=driving`;
  }
};

const NavigateTo = () => {
  const [searchParams] = useSearchParams();

  const lat = parseCoordinate(searchParams.get('lat'), 90);
  const lng = parseCoordinate(searchParams.get('lng'), 180);
  const query = (searchParams.get('q') ?? '').trim().slice(0, 300);
  const destination: Destination | null = lat !== null && lng !== null ? { lat, lng } : null;
  const hasDestination = destination !== null || query !== '';
  const forceChoice = searchParams.get('choose') === '1';

  const [redirecting, setRedirecting] = useState<NavApp | null>(null);

  const order = useMemo<NavApp[]>(
    () => (isApplePlatform() ? ['apple', 'google', 'waze'] : ['google', 'waze', 'apple']),
    [],
  );

  const open = (app: NavApp) => {
    storeApp(app);
    window.location.assign(buildUrl(app, destination, query));
  };

  // Choix déjà fait sur cet appareil : on part directement.
  useEffect(() => {
    if (!hasDestination || forceChoice) return;
    const stored = readStoredApp();
    if (stored) {
      setRedirecting(stored);
      window.location.replace(buildUrl(stored, destination, query));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasDestination) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-2">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Adresse introuvable</h1>
          <p className="text-sm text-muted-foreground">
            Ce QR code ne contient pas de destination. Utilisez l'adresse écrite sur le ticket.
          </p>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-4">
          <Navigation className="mx-auto h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Ouverture de {APP_LABELS[redirecting]}…
          </p>
          <a
            href={`?${new URLSearchParams({
              ...Object.fromEntries(searchParams),
              choose: '1',
            }).toString()}`}
            className="text-sm underline text-muted-foreground"
          >
            Changer d'application
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Navigation className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-xl font-semibold">Itinéraire de livraison</h1>
          <p className="text-sm text-muted-foreground">
            Choisissez votre application. Ce choix sera retenu sur ce téléphone.
          </p>
        </div>
        <div className="space-y-3">
          {order.map((app, index) => (
            <button
              key={app}
              type="button"
              onClick={() => open(app)}
              className={
                'w-full rounded-xl px-4 py-4 text-base font-medium transition-colors ' +
                (index === 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-input bg-background hover:bg-accent')
              }
            >
              {APP_LABELS[app]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NavigateTo;
