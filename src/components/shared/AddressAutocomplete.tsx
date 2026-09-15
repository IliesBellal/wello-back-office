/// <reference types="@types/google.maps" />

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
  // LOT A Semaine 3, Chantier 14 additions — only populated when
  // searchType="establishment" (Google only returns these for a business
  // place, never for a plain address prediction).
  place_id: string;
  name: string | null; // Place.name — the business name, establishment results only
  phone: string | null;
  opening_hours: string[] | null; // Place.opening_hours.weekday_text, as-is
  business_types: string[] | null; // Place.types (Google's own category tags)
}

interface AddressAutocompleteProps {
  label?: string;
  value: string;
  onSelect: (parsed: ParsedAddress) => void;
  placeholder?: string;
  /**
   * "address" (default) restricts predictions to postal addresses — the
   * original behavior every existing call site (EstablishmentTab,
   * ProfileTab) relies on. "establishment" searches businesses instead,
   * which is what actually populates phone/opening_hours/business_types —
   * Google only returns those for a place with a storefront, never for a
   * bare address. Chantier 14's own screen 2 (établissement) needs
   * "establishment"; nothing existing should change search type.
   */
  searchType?: 'address' | 'establishment';
  /**
   * Fires on every keystroke, independently of onSelect (which only fires
   * once Google resolves an actual place). Without this, a visitor who
   * types free text without picking a suggestion — the Places script
   * failing to load, an unlisted address, or Chantier 14's own manual-entry
   * fallback — has their typed text sitting only in this component's local
   * state, never reaching the parent form at all. Optional: the two
   * pre-existing call sites (EstablishmentTab, ProfileTab) don't pass it and
   * keep their original onSelect-only behavior.
   */
  onInputChange?: (text: string) => void;
}

export const AddressAutocomplete = ({ label, value, onSelect, placeholder, searchType = 'address', onInputChange }: AddressAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onSelectRef = useRef(onSelect);
  const onInputChangeRef = useRef(onInputChange);
  const [inputValue, setInputValue] = useState(value);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep callback refs fresh without re-binding the autocomplete listener
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onInputChangeRef.current = onInputChange;
  }, [onInputChange]);

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
          types: [searchType],
          fields: [
            'address_components', 'formatted_address', 'geometry', 'name',
            'place_id', 'international_phone_number', 'opening_hours', 'types',
          ],
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
            place_id: place.place_id ?? '',
            name: place.name ?? null,
            phone: place.international_phone_number ?? null,
            opening_hours: place.opening_hours?.weekday_text ?? null,
            business_types: place.types ?? null,
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
    // The `autocompleteRef.current` guard above means a later searchType
    // change wouldn't actually re-create the widget — callers don't change
    // it after mount — but it's listed here since the effect does read it.
  }, [searchType]);

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onInputChangeRef.current?.(e.target.value);
          }}
          placeholder={placeholder ?? 'Rechercher une adresse...'}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {loadError && <p className="text-xs text-destructive">{loadError}</p>}
    </div>
  );
};
