import { useState } from 'react';
import { AddressAutocomplete, type ParsedAddress } from '@/components/shared/AddressAutocomplete';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicTunnelApi } from '@/services/publicTunnelApi';
import type { CompanyCandidate, ResolveCompaniesResponse } from '@/types/signupTunnel';
import { Building2, CheckCircle2 } from 'lucide-react';
import type { TunnelState } from './tunnelState';

interface ScreenEstablishmentProps {
  state: TunnelState;
  onNext: (patch: Partial<TunnelState>) => void;
  onBack: () => void;
}

/**
 * LOT A Semaine 3, Chantier 14, §5.4 — AddressAutocomplete searches the
 * establishment itself (not a bare address, see AddressAutocomplete's
 * searchType prop), then POST /v1/public/companies/resolve (Chantier 12)
 * suggests SIRET candidates from the selected name + postal code. SIRET is
 * always pre-filled-but-editable — the server, not this screen, is the
 * authority on whether it's actually valid (checked again at final submit).
 */
export const ScreenEstablishment = ({ state, onNext, onBack }: ScreenEstablishmentProps) => {
  const [businessName, setBusinessName] = useState(state.businessName);
  const [address, setAddress] = useState(state.address);
  const [zipCode, setZipCode] = useState(state.zipCode);
  const [city, setCity] = useState(state.city);
  const [country, setCountry] = useState(state.country);
  const [lat, setLat] = useState(state.lat);
  const [lng, setLng] = useState(state.lng);
  const [phone, setPhone] = useState(state.phone);
  const [siret, setSiret] = useState(state.siret);
  const [naf, setNaf] = useState<string | null>(state.naf);
  const [placeId, setPlaceId] = useState(state.placeId);

  const [candidates, setCandidates] = useState<CompanyCandidate[]>([]);
  const [resolving, setResolving] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSelect = async (parsed: ParsedAddress) => {
    const name = parsed.name || businessName;
    setBusinessName(name);
    setAddress(parsed.address);
    setZipCode(parsed.postal_code);
    setCity(parsed.city);
    setCountry(parsed.country || 'FR');
    if (parsed.lat != null) setLat(parsed.lat);
    if (parsed.lng != null) setLng(parsed.lng);
    setPhone(parsed.phone || phone);
    setPlaceId(parsed.place_id);
    setCandidates([]);
    setManualEntry(false);

    if (!name || !parsed.postal_code || !parsed.city) return;

    setResolving(true);
    try {
      const resp = await publicTunnelApi.post<ResolveCompaniesResponse>('/v1/public/companies/resolve', {
        name,
        postal_code: parsed.postal_code,
        city: parsed.city,
      });
      setCandidates(resp.candidates);
      if (resp.candidates.length === 0) setManualEntry(true);
    } catch {
      // Third-party lookup failing must never block the tunnel — the API
      // itself already degrades to an empty list on its side; a network
      // failure reaching the API at all gets the same manual fallback here.
      setManualEntry(true);
    } finally {
      setResolving(false);
    }
  };

  const selectCandidate = (candidate: CompanyCandidate) => {
    setSiret(candidate.siret);
    setNaf(candidate.naf);
    setManualEntry(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim() || !address.trim() || !zipCode.trim() || !city.trim() || !phone.trim()) {
      setError("L'établissement, son adresse et son téléphone sont requis.");
      return;
    }
    if (!/^\d{14}$/.test(siret.trim())) {
      setError('Le SIRET doit contenir exactement 14 chiffres.');
      return;
    }

    // merchant.merchanttel is varchar(15) — strip spaces/separators so a
    // formatted "+33 3 82 51 98 08" (17 chars) fits, instead of failing the
    // INSERT at final submit with a raw SQLSTATE 22001.
    const normalizedPhone = phone.trim().replace(/[\s.\-()]/g, '');
    if (normalizedPhone.length > 15) {
      setError('Le numéro de téléphone est trop long (15 caractères maximum).');
      return;
    }

    onNext({
      businessName: businessName.trim(),
      address: address.trim(),
      zipCode: zipCode.trim(),
      city: city.trim(),
      country: country.trim() || 'FR',
      lat,
      lng,
      phone: normalizedPhone,
      siret: siret.trim(),
      naf,
      placeId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Votre établissement</h1>
        <p className="text-sm text-slate-600">L'étape 2 sur 4 — où êtes-vous installé ?</p>
      </div>

      <AddressAutocomplete
        label="Nom ou adresse de l'établissement"
        value={address}
        placeholder="Rechercher votre établissement..."
        searchType="establishment"
        onSelect={handleAddressSelect}
        onInputChange={(text) => {
          // Free typing without picking a suggestion — Places unavailable,
          // or the establishment genuinely isn't listed — still counts as
          // the address/name for manual entry (§5.4's fallback).
          setAddress(text);
          if (!businessName) setBusinessName(text);
        }}
      />

      {resolving && <p className="text-sm text-slate-500">Recherche du SIRET en cours...</p>}

      {candidates.length > 0 && !manualEntry && (
        <div className="space-y-2">
          <Label>Est-ce votre établissement ?</Label>
          <div className="space-y-2">
            {candidates.map((c) => (
              <button
                key={c.siret}
                type="button"
                onClick={() => selectCandidate(c)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  siret === c.siret ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {siret === c.siret ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-medium text-sm">{c.company_name}</span>
                  {c.high_confidence && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">Correspondance forte</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 pl-6">{c.address} — SIRET {c.siret}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setManualEntry(true)}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Aucun ne correspond, saisir le SIRET manuellement
          </button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="siret">SIRET</Label>
        <Input
          id="siret"
          value={siret}
          onChange={(e) => {
            setSiret(e.target.value);
            setManualEntry(true);
          }}
          placeholder="14 chiffres"
          maxLength={14}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zip-code">Code postal</Label>
          <Input id="zip-code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone de l'établissement</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33 6 00 00 00 00"
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-6 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Retour
        </button>
        <button
          type="submit"
          className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
            rounded-lg shadow-md hover:shadow-xl hover:from-blue-700 hover:to-blue-700 transition-all duration-300"
        >
          Continuer
        </button>
      </div>
    </form>
  );
};
