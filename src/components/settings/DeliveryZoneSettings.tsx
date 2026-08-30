import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, LocateFixed } from "lucide-react";
import { DeliveryZoningType, EstablishmentDeliveryZone } from "@/types/settings";

interface DeliveryZoneSettingsProps {
  values: EstablishmentDeliveryZone;
  onChange: (key: keyof EstablishmentDeliveryZone, value: string | number | null) => void;
  establishmentCoords?: { lat: number | null; lng: number | null };
}

interface RangeBand {
  min: number;
  max: number;
}

// Radix Select n'autorise pas une SelectItem avec value="" (utilisé en interne
// pour représenter "aucune sélection"), d'où ce sentinel pour l'option "Aucun".
const NONE_SENTINEL = "NONE";

const ZONING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: NONE_SENTINEL, label: "Aucun" },
  { value: "CARDINAL", label: "Cardinal (points cardinaux)" },
  { value: "RADIAL", label: "Radial (secteurs égaux)" },
  { value: "GRID", label: "Grille" },
];

const parseRanges = (csv: string): RangeBand[] => {
  if (!csv.trim()) return [];
  return csv.split(",").map((part) => {
    const [min, max] = part.split("-").map((v) => Number(v.trim()));
    return { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 0 };
  });
};

const serializeRanges = (bands: RangeBand[]): string => bands.map((band) => `${band.min}-${band.max}`).join(",");

const RangeBandsEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const bands = useMemo(() => parseRanges(value), [value]);

  const updateBands = (next: RangeBand[]) => onChange(serializeRanges(next));

  const handleAdd = () => {
    const last = bands[bands.length - 1];
    const nextMin = last ? last.max : 0;
    updateBands([...bands, { min: nextMin, max: nextMin + 1 }]);
  };

  const handleRemove = (index: number) => {
    updateBands(bands.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: "min" | "max", raw: string) => {
    const numeric = Number(raw);
    updateBands(bands.map((band, i) => (i === index ? { ...band, [field]: Number.isFinite(numeric) ? numeric : 0 } : band)));
  };

  return (
    <div className="space-y-2">
      {bands.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune plage de distance définie.</p>
      )}
      {bands.map((band, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            className="w-24"
            value={band.min}
            onChange={(e) => handleFieldChange(index, "min", e.target.value)}
          />
          <span className="text-sm text-muted-foreground">à</span>
          <Input
            type="number"
            min={0}
            className="w-24"
            value={band.max}
            onChange={(e) => handleFieldChange(index, "max", e.target.value)}
          />
          <span className="text-sm text-muted-foreground">km</span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemove(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="link" size="sm" className="h-auto gap-1 px-0 text-xs" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5" />
        Ajouter une plage
      </Button>
    </div>
  );
};

export const DeliveryZoneSettings = ({ values, onChange, establishmentCoords }: DeliveryZoneSettingsProps) => {
  const handleUseEstablishmentCoords = () => {
    if (establishmentCoords?.lat == null || establishmentCoords?.lng == null) return;
    onChange("grid_origin_lat", establishmentCoords.lat);
    onChange("grid_origin_lng", establishmentCoords.lng);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="zoning_type">Type de zonage</Label>
        <Select
          value={values.zoning_type || NONE_SENTINEL}
          onValueChange={(value) => onChange("zoning_type", value === NONE_SENTINEL ? "" : (value as DeliveryZoningType))}
        >
          <SelectTrigger id="zoning_type">
            <SelectValue placeholder="Sélectionnez un type de zonage" />
          </SelectTrigger>
          <SelectContent>
            {ZONING_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {values.zoning_type === "" && (
        <p className="text-sm text-muted-foreground">
          Aucun découpage par zone n'est configuré pour cet établissement.
        </p>
      )}

      {values.zoning_type === "CARDINAL" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardinal_cone_count">Nombre de secteurs</Label>
            <Input
              id="cardinal_cone_count"
              type="number"
              min={2}
              max={16}
              value={values.cardinal_cone_count}
              onChange={(e) => onChange("cardinal_cone_count", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Ex : 4 secteurs = Nord / Est / Sud / Ouest, 8 secteurs = N / NE / E / SE / S / SO / O / NO
            </p>
          </div>
          <div className="space-y-2">
            <Label>Plages de distance par secteur (km)</Label>
            <RangeBandsEditor value={values.cardinal_zone_ranges} onChange={(value) => onChange("cardinal_zone_ranges", value)} />
          </div>
        </div>
      )}

      {values.zoning_type === "RADIAL" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="radial_cone_count">Nombre de secteurs</Label>
            <Input
              id="radial_cone_count"
              type="number"
              min={2}
              max={16}
              value={values.radial_cone_count}
              onChange={(e) => onChange("radial_cone_count", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Découpe la zone en secteurs angulaires égaux autour de l'établissement
            </p>
          </div>
          <div className="space-y-2">
            <Label>Plages de distance par secteur (km)</Label>
            <RangeBandsEditor value={values.radial_zone_ranges} onChange={(value) => onChange("radial_zone_ranges", value)} />
          </div>
        </div>
      )}

      {values.zoning_type === "GRID" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grid_cell_size_km">Taille de cellule (km)</Label>
            <Input
              id="grid_cell_size_km"
              type="number"
              min={1}
              max={50}
              value={values.grid_cell_size_km}
              onChange={(e) => onChange("grid_cell_size_km", Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grid_origin_lat">Latitude d'origine</Label>
              <Input
                id="grid_origin_lat"
                type="number"
                step="any"
                value={values.grid_origin_lat ?? ""}
                onChange={(e) => onChange("grid_origin_lat", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid_origin_lng">Longitude d'origine</Label>
              <Input
                id="grid_origin_lng"
                type="number"
                step="any"
                value={values.grid_origin_lng ?? ""}
                onChange={(e) => onChange("grid_origin_lng", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={establishmentCoords?.lat == null || establishmentCoords?.lng == null}
            onClick={handleUseEstablishmentCoords}
          >
            <LocateFixed className="h-4 w-4 mr-2" />
            Utiliser l'adresse de l'établissement
          </Button>
        </div>
      )}
    </div>
  );
};
