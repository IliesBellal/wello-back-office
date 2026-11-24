import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ImageOff, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { thumbnailUrl } from "@/lib/imageInput";
import { cn } from "@/lib/utils";
import { imageBankService, type ImageBankFormat } from "@/services/imageBankService";

const ALL = "__all__";

/** Libellés des usages renvoyés par GET /image-bank/mine. */
const USAGE_LABELS: Record<string, string> = {
  product: "Produit",
  option: "Option",
  category: "Catégorie",
  marketing_category: "Catégorie marketing",
  scannorder_banner: "Bannière ScanNOrder",
  kiosk_idle: "Veille borne",
  kiosk_marketing: "Ruban borne",
  cds_media: "Écran client",
};

interface ImageBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Format proposé à l'ouverture (filtre modifiable dans le popup). */
  format: ImageBankFormat;
  onSelect: (imageUrl: string) => void;
}

/** Miniature (Cloudflare Image Transformations), avec repli sur l'original. */
function Thumb({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState(() => thumbnailUrl(url));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(thumbnailUrl(url));
    setFailed(false);
  }, [url]);
  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="h-6 w-6" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
      onError={() => (src !== url ? setSrc(url) : setFailed(true))}
    />
  );
}

function GridSkeleton({ banner }: { banner: boolean }) {
  return (
    <div className={cn("grid gap-3", banner ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-lg", banner ? "aspect-[3/1]" : "aspect-square")} />
      ))}
    </div>
  );
}

interface TileProps {
  url: string;
  title: string;
  subtitle?: string;
  banner: boolean;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

function ImageTile({ url, title, subtitle, banner, selected, onClick, onDoubleClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-pressed={selected}
      title={title}
      className={cn(
        "group relative overflow-hidden rounded-lg border-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary" : "border-transparent hover:border-primary/40",
      )}
    >
      <Thumb url={url} alt={title} className={cn("w-full bg-muted", banner ? "aspect-[3/1]" : "aspect-square")} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
        <p className="truncate text-xs font-medium text-white">{title}</p>
        {subtitle && <p className="truncate text-[10px] text-white/80">{subtitle}</p>}
      </div>
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}

/**
 * Popup « Depuis la banque d'images » : images Wello Resto communes à tous
 * les établissements, et « Mes images » (déjà utilisées par l'établissement).
 * Ne fait que renvoyer l'URL choisie ; l'appelant l'envoie à son endpoint
 * d'upload habituel (corps JSON { image_url }).
 */
export function ImageBankDialog({ open, onOpenChange, format: initialFormat, onSelect }: ImageBankDialogProps) {
  const [tab, setTab] = useState<"bank" | "mine">("bank");
  const [format, setFormat] = useState<ImageBankFormat | "all">(initialFormat);
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormat(initialFormat);
      setSelected(null);
    }
  }, [open, initialFormat]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const categoriesQuery = useQuery({
    queryKey: ["image-bank", "categories"],
    queryFn: () => imageBankService.categories(),
    enabled: open,
    staleTime: 10 * 60 * 1000,
  });

  const imagesQuery = useQuery({
    queryKey: ["image-bank", "list", format, category, debounced],
    queryFn: () =>
      imageBankService.list({
        format: format === "all" ? undefined : format,
        category: category === ALL ? undefined : category,
        q: debounced,
      }),
    enabled: open && tab === "bank",
    staleTime: 5 * 60 * 1000,
  });

  const mineQuery = useQuery({
    queryKey: ["image-bank", "mine"],
    queryFn: () => imageBankService.mine(),
    enabled: open && tab === "mine",
    staleTime: 60 * 1000,
  });

  const categoryLabels = useMemo(
    () => Object.fromEntries((categoriesQuery.data ?? []).map((c) => [c.code, c.label])),
    [categoriesQuery.data],
  );

  const visibleCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => (format === "all" ? c.count : c.formats?.[format] ?? 0) > 0),
    [categoriesQuery.data, format],
  );

  const mineFiltered = useMemo(() => {
    const words = search.trim().toLowerCase();
    return (mineQuery.data ?? []).filter(
      (img) => !words || img.label.toLowerCase().includes(words) || (USAGE_LABELS[img.usage] ?? "").toLowerCase().includes(words),
    );
  }, [mineQuery.data, search]);

  const banner = format === "banner";
  const confirm = (url: string | null) => {
    if (!url) return;
    onSelect(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Banque d'images</DialogTitle>
          <DialogDescription>Choisissez une photo professionnelle proposée par Wello Resto ou une image déjà utilisée par votre établissement.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "bank" | "mine"); setSelected(null); }} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="self-start">
            <TabsTrigger value="bank">Banque d'images</TabsTrigger>
            <TabsTrigger value="mine">Mes images</TabsTrigger>
          </TabsList>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "bank" ? "Rechercher : burger, canette, tiramisu…" : "Rechercher dans mes images…"}
                className="pl-8"
              />
            </div>
            {tab === "bank" && (
              <>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="sm:w-56">
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Toutes les catégories</SelectItem>
                    {visibleCategories.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ToggleGroup
                  type="single"
                  value={format}
                  onValueChange={(v) => v && setFormat(v as ImageBankFormat | "all")}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="square">Vignettes</ToggleGroupItem>
                  <ToggleGroupItem value="banner">Bannières</ToggleGroupItem>
                  <ToggleGroupItem value="all">Tout</ToggleGroupItem>
                </ToggleGroup>
              </>
            )}
          </div>

          <TabsContent value="bank" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {imagesQuery.isLoading ? (
              <GridSkeleton banner={banner} />
            ) : imagesQuery.isError ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Impossible de charger la banque d'images.</p>
            ) : (imagesQuery.data ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {debounced || category !== ALL ? "Aucune image ne correspond à votre recherche." : "La banque d'images ne contient pas encore d'image pour ce format."}
              </p>
            ) : (
              <div className={cn("grid gap-3", banner ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
                {(imagesQuery.data ?? []).map((img) => (
                  <ImageTile
                    key={img.id}
                    url={img.image_url}
                    title={img.name}
                    subtitle={categoryLabels[img.category]}
                    banner={img.format === "banner" && format !== "square"}
                    selected={selected === img.image_url}
                    onClick={() => setSelected(img.image_url)}
                    onDoubleClick={() => confirm(img.image_url)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {mineQuery.isLoading ? (
              <GridSkeleton banner={false} />
            ) : mineQuery.isError ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Impossible de charger vos images.</p>
            ) : mineFiltered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {search ? "Aucune image ne correspond à votre recherche." : "Vous n'avez pas encore importé d'image."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {mineFiltered.map((img) => (
                  <ImageTile
                    key={img.image_url}
                    url={img.image_url}
                    title={img.label || USAGE_LABELS[img.usage] || "Image"}
                    subtitle={img.label ? USAGE_LABELS[img.usage] : undefined}
                    banner={false}
                    selected={selected === img.image_url}
                    onClick={() => setSelected(img.image_url)}
                    onDoubleClick={() => confirm(img.image_url)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" disabled={!selected} onClick={() => confirm(selected)}>
            {imagesQuery.isFetching && tab === "bank" && !imagesQuery.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Utiliser cette image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
