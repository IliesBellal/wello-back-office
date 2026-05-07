import { useEffect, useRef, useState } from 'react';
import { loadGooglePlacesLibrary } from '@/lib/googlePlacesLoader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

export interface ParsedAddress {
  address: string;     // formatted_address
  street: string;
  city: string;
  postal_code: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

interface AddressAutocompleteProps {
  label?: string;
  value: string;
  onSelect: (parsed: ParsedAddress) => void;
  placeholder?: string;
}

export const AddressAutocomplete = ({ label, value, onSelect, placeholder }: AddressAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onSelectRef = useRef(onSelect);
  const [inputValue, setInputValue] = useState(value);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep callback ref fresh without re-binding the autocomplete listener
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Sync external value (e.g. form reset)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        setLoadError(null);
        await loadGooglePlacesLibrary();
        if (!inputRef.current || autocompleteRef.current) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['address_components', 'formatted_address', 'geometry'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current!.getPlace();
          if (!place.address_components) return;

          const get = (type: string, short = false) => {
            const comp = place.address_components!.find(c => c.types.includes(type));
            return short ? (comp?.short_name ?? '') : (comp?.long_name ?? '');
          };

          const street = [get('street_number'), get('route')].filter(Boolean).join(' ');

          const parsed: ParsedAddress = {
            address: place.formatted_address ?? '',
            street,
            city: get('locality') || get('postal_town') || get('administrative_area_level_2'),
            postal_code: get('postal_code'),
            country: get('country', true), // ISO 3166-1 alpha-2
            lat: place.geometry?.location?.lat() ?? null,
            lng: place.geometry?.location?.lng() ?? null,
          };

          setInputValue(parsed.address);
          onSelectRef.current(parsed);
        });
      } catch (error) {
        setLoadError('Impossible de charger Google Places. Verifiez la cle API et les restrictions de domaine.');
        console.error('Google Places initialization failed', error);
      }
    };

    initAutocomplete();
  }, []);

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder ?? 'Rechercher une adresse...'}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {loadError && <p className="text-xs text-destructive">{loadError}</p>}
    </div>
  );
};
