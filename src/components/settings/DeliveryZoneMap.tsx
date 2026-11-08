/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadGooglePlacesLibrary } from "@/lib/googlePlacesLoader";
import { Button } from "@/components/ui/button";
import type { LatLng, ZonePreview } from "@/lib/deliveryZones";

// Couleurs des secteurs (cycliques). Les plages s'éclaircissent vers l'extérieur.
const SECTOR_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#db2777", "#ca8a04", "#4f46e5"];
const RING_OPACITY = [0.32, 0.22, 0.14, 0.09];
const OPEN_ENDED_OPACITY = 0.05;
const GRID_COLOR = "#2563eb";

type MapsLibrary = google.maps.MapsLibrary;

/** Libellé HTML posé sur la carte (évite google.maps.Marker, déprécié). */
const createLabelClass = (maps: MapsLibrary) =>
  class ZoneLabel extends maps.OverlayView {
    private readonly div: HTMLDivElement;

    constructor(private readonly position: google.maps.LatLngLiteral, content: string, style: Partial<CSSStyleDeclaration>) {
      super();
      this.div = document.createElement("div");
      this.div.textContent = content;
      Object.assign(this.div.style, {
        position: "absolute",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        ...style,
      });
    }

    onAdd() {
      this.getPanes()?.overlayLayer.appendChild(this.div);
    }

    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }

    onRemove() {
      this.div.remove();
    }
  };

const LABEL_STYLE: Partial<CSSStyleDeclaration> = {
  font: "600 11px/1.2 system-ui, sans-serif",
  color: "#111827",
  background: "rgba(255, 255, 255, 0.85)",
  borderRadius: "4px",
  padding: "1px 4px",
};

const ORIGIN_STYLE: Partial<CSSStyleDeclaration> = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "#dc2626",
  border: "2px solid #ffffff",
  boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.3)",
};

interface DeliveryZoneMapProps {
  preview: ZonePreview;
  /** Mode « Sélectionner sur la carte » : le prochain clic renvoie sa position. */
  onPick?: (position: LatLng) => void;
  onCancelPick?: () => void;
}

const COORD_DECIMALS = 6;
const round = (value: number) => Number(value.toFixed(COORD_DECIMALS));

export const DeliveryZoneMap = ({ preview, onPick, onCancelPick }: DeliveryZoneMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const libraryRef = useRef<{ maps: MapsLibrary; Label: ReturnType<typeof createLabelClass> } | null>(null);
  const overlaysRef = useRef<{ setMap: (map: google.maps.Map | null) => void }[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGooglePlacesLibrary();
        const maps = (await google.maps.importLibrary("maps")) as MapsLibrary;
        if (cancelled || !containerRef.current) return;
        libraryRef.current = { maps, Label: createLabelClass(maps) };
        mapRef.current = new maps.Map(containerRef.current, {
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const library = libraryRef.current;
    if (status !== "ready" || !map || !library) return;
    const { maps, Label } = library;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    const overlays: { setMap: (map: google.maps.Map | null) => void }[] = [];
    const bounds = new google.maps.LatLngBounds();
    const isGrid = preview.type === "GRID";

    preview.zones.forEach((zone) => {
      const color = isGrid ? GRID_COLOR : SECTOR_COLORS[zone.sectorIndex % SECTOR_COLORS.length];
      const fillOpacity = isGrid
        ? (zone.sectorIndex + zone.ringIndex) % 2 === 0 ? 0.1 : 0.03
        : zone.openEnded
          ? OPEN_ENDED_OPACITY
          : RING_OPACITY[Math.min(zone.ringIndex, RING_OPACITY.length - 1)];
      overlays.push(
        new maps.Polygon({
          paths: zone.path,
          strokeColor: color,
          strokeOpacity: 0.7,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity,
          clickable: false,
        }),
      );
      overlays.push(new Label(zone.labelAt, zone.label, LABEL_STYLE));
      zone.path.forEach((point) => bounds.extend(point));
    });

    overlays.push(new Label(preview.center, "", ORIGIN_STYLE));
    overlays.forEach((overlay) => overlay.setMap(map));
    overlaysRef.current = overlays;
    map.fitBounds(bounds, 16);
  }, [preview, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !onPick) return;
    map.setOptions({ draggableCursor: "crosshair" });
    const listener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      onPick({ lat: round(event.latLng.lat()), lng: round(event.latLng.lng()) });
    });
    return () => {
      listener.remove();
      map.setOptions({ draggableCursor: null });
    };
  }, [onPick, status]);

  useEffect(
    () => () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    },
    [],
  );

  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-md border bg-muted">
      <div ref={containerRef} className="h-full w-full" />
      {onPick && status === "ready" && (
        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2 rounded-md bg-background/95 px-3 py-2 text-sm shadow">
          <span>Cliquez sur la carte pour placer le point d'origine.</span>
          {onCancelPick && (
            <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onCancelPick}>
              Annuler
            </Button>
          )}
        </div>
      )}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
          La carte ne peut pas être affichée pour le moment.
        </div>
      )}
    </div>
  );
};
