import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { franchisesService } from "@/services/franchisesService";
import {
  FRANCHISE_ANNOUNCEMENT_MAX,
  FRANCHISE_DESCRIPTION_MAX,
  FRANCHISE_SLUG_MAX,
  FRANCHISE_SLUG_MIN,
  FRANCHISE_SLUG_PATTERN,
  type FranchiseAnnouncement,
  type FranchiseDetail,
  type FranchiseSlugAvailability,
} from "@/types/franchise";
import { FranchiseHubLink } from "./FranchiseHubLink";
import { FranchiseImageField } from "./FranchiseImageField";
import { useFranchiseMutations } from "./useFranchiseMutations";

const DEFAULT_COLOR = "#111827";
const NO_ANNOUNCEMENT: FranchiseAnnouncement = { enabled: false, text: null, url: null, ends_on: null };

const slugLooksValid = (slug: string) =>
  slug.length >= FRANCHISE_SLUG_MIN && slug.length <= FRANCHISE_SLUG_MAX && FRANCHISE_SLUG_PATTERN.test(slug);

function SaveFooter({
  dirty,
  invalid,
  saving,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  invalid: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <CardFooter className="justify-end gap-2 border-t pt-6">
      <Button variant="outline" disabled={!dirty || saving} onClick={onCancel}>
        Annuler
      </Button>
      <Button disabled={!dirty || invalid || saving} onClick={onSave}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enregistrer
      </Button>
    </CardFooter>
  );
}

/** Adresse publique du hub : lien, QR code, modification de l'adresse. */
function HubAddressCard({ detail }: { detail: FranchiseDetail }) {
  const { franchise } = detail;
  const franchiseId = franchise.franchise_id;
  const { update } = useFranchiseMutations(franchiseId);
  const [slug, setSlug] = useState(franchise.slug);
  const [slugCheck, setSlugCheck] = useState<FranchiseSlugAvailability | null>(null);
  const slugChanged = slug !== franchise.slug;

  // Disponibilité de l'adresse, vérifiée pendant la saisie.
  useEffect(() => {
    if (!slugChanged || !slugLooksValid(slug)) {
      setSlugCheck(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      franchisesService
        .slugAvailability(slug, franchiseId)
        .then((result) => !cancelled && setSlugCheck(result))
        .catch(() => !cancelled && setSlugCheck(null));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, slugChanged, franchiseId]);

  const slugInvalid = slugChanged && !slugLooksValid(slug);
  const slugTaken = slugChanged && slugCheck?.slug === slug && !slugCheck.available;
  const hubBase = detail.hub_url.slice(0, detail.hub_url.length - franchise.slug.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adresse et QR code</CardTitle>
        <CardDescription>La page publique où vos clients choisissent leur établissement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FranchiseHubLink hubUrl={detail.hub_url} slug={franchise.slug} />
        <div className="space-y-2">
          <Label htmlFor="franchise-slug">Modifier l'adresse</Label>
          <div className="flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="hidden max-w-[45%] truncate whitespace-nowrap pl-3 text-sm text-muted-foreground sm:block">{hubBase}</span>
            <Input
              id="franchise-slug"
              value={slug}
              maxLength={FRANCHISE_SLUG_MAX}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              className="border-0 shadow-none focus-visible:ring-0 sm:pl-0.5"
            />
            {slugChanged && slugCheck?.slug === slug && (
              <span className="pr-3">
                {slugCheck.available ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-destructive" />}
              </span>
            )}
          </div>
          {slugInvalid ? (
            <p className="text-xs text-destructive">3 à 50 caractères : lettres minuscules, chiffres et tirets.</p>
          ) : slugTaken ? (
            <p className="text-xs text-destructive">Cette adresse est déjà utilisée.</p>
          ) : slugChanged ? (
            <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              L'ancienne adresse et les QR codes déjà imprimés cesseront de fonctionner.
            </p>
          ) : null}
        </div>
      </CardContent>
      <SaveFooter
        dirty={slugChanged}
        invalid={slugInvalid || slugTaken}
        saving={update.isPending}
        onCancel={() => setSlug(franchise.slug)}
        onSave={() => update.mutate({ slug })}
      />
    </Card>
  );
}

/** Présentation du hub : description, couleur, bannière. */
function HubPresentationCard({ detail }: { detail: FranchiseDetail }) {
  const { franchise } = detail;
  const { update, uploadImage } = useFranchiseMutations(franchise.franchise_id);
  const [description, setDescription] = useState(franchise.description ?? "");
  const [brandColor, setBrandColor] = useState(franchise.brand_color ?? "");

  const descriptionChanged = description.trim() !== (franchise.description ?? "");
  const colorChanged = brandColor.toUpperCase() !== (franchise.brand_color ?? "").toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Présentation</CardTitle>
        <CardDescription>Ce que voient vos clients en haut du hub.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="franchise-description">Description</Label>
          <Textarea
            id="franchise-description"
            value={description}
            maxLength={FRANCHISE_DESCRIPTION_MAX}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quelques mots sur votre enseigne"
          />
          <p className="text-right text-xs text-muted-foreground">
            {description.length}/{FRANCHISE_DESCRIPTION_MAX}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="franchise-color">Couleur de marque</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="franchise-color"
              type="color"
              value={brandColor || DEFAULT_COLOR}
              onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
              className="h-12 w-20 cursor-pointer"
            />
            <span className="font-mono text-sm text-muted-foreground">{brandColor || "Thème par défaut"}</span>
            {brandColor && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setBrandColor("")}>
                Revenir au thème par défaut
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Boutons et repères de la carte du hub.</p>
        </div>

        <div className="space-y-2">
          <FranchiseImageField
            label="Bannière"
            url={franchise.banner_url}
            uploading={uploadImage.isPending && uploadImage.variables?.type === "banner"}
            onFile={(file) => uploadImage.mutate({ type: "banner", file })}
          />
          <p className="text-xs text-muted-foreground">Image d'en-tête du hub, au format 4:1. Enregistrée dès l'envoi.</p>
        </div>
      </CardContent>
      <SaveFooter
        dirty={descriptionChanged || colorChanged}
        invalid={false}
        saving={update.isPending}
        onCancel={() => {
          setDescription(franchise.description ?? "");
          setBrandColor(franchise.brand_color ?? "");
        }}
        onSave={() =>
          update.mutate({
            ...(descriptionChanged ? { description: description.trim() } : {}),
            ...(colorChanged ? { brand_color: brandColor } : {}),
          })
        }
      />
    </Card>
  );
}

// Texte noir ou blanc selon la luminance de la couleur de fond (même règle que
// le hub, readableTextOn dans wello-resto-scannorder).
const readableOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#FFFFFF";
};

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Bandeau d'annonce affiché en haut du hub (« Nouvelle ouverture à Nancy »). */
function HubAnnouncementCard({ detail }: { detail: FranchiseDetail }) {
  // Absent tant que l'API n'a pas la migration 196 : bandeau vide.
  const saved = detail.franchise.announcement ?? NO_ANNOUNCEMENT;
  const { update } = useFranchiseMutations(detail.franchise.franchise_id);
  const [enabled, setEnabled] = useState(saved.enabled);
  const [text, setText] = useState(saved.text ?? "");
  const [url, setUrl] = useState(saved.url ?? "");
  const [endsOn, setEndsOn] = useState(saved.ends_on ?? "");

  const reset = () => {
    setEnabled(saved.enabled);
    setText(saved.text ?? "");
    setUrl(saved.url ?? "");
    setEndsOn(saved.ends_on ?? "");
  };

  const trimmed = text.trim();
  const dirty =
    enabled !== saved.enabled || trimmed !== (saved.text ?? "") || url.trim() !== (saved.url ?? "") || endsOn !== (saved.ends_on ?? "");
  const textMissing = enabled && trimmed.length === 0;
  const urlInvalid = url.trim() !== "" && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url.trim());
  const expired = endsOn !== "" && endsOn < todayLocal();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Bandeau d'annonce</CardTitle>
            <CardDescription>Un message en haut du hub : nouvelle ouverture, plat du mois, horaires exceptionnels.</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor="announcement-enabled" className="text-sm">
              {enabled ? "Affiché" : "Masqué"}
            </Label>
            <Switch id="announcement-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="announcement-text">Message</Label>
          <Input
            id="announcement-text"
            value={text}
            maxLength={FRANCHISE_ANNOUNCEMENT_MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nouvelle ouverture à Nancy le 15 novembre !"
          />
          <div className="flex justify-between text-xs">
            <span className="text-destructive">{textMissing ? "Ajoutez un message pour afficher le bandeau." : ""}</span>
            <span className="text-muted-foreground">
              {text.length}/{FRANCHISE_ANNOUNCEMENT_MAX}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="announcement-url">Lien (facultatif)</Label>
            <Input
              id="announcement-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
            {urlInvalid ? (
              <p className="text-xs text-destructive">Le lien doit commencer par https://</p>
            ) : (
              <p className="text-xs text-muted-foreground">Ouvert quand le client touche le bandeau.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-ends-on">Dernier jour d'affichage (facultatif)</Label>
            <div className="flex items-center gap-2">
              <Input id="announcement-ends-on" type="date" value={endsOn} min={todayLocal()} onChange={(e) => setEndsOn(e.target.value)} />
              {endsOn && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEndsOn("")}>
                  Sans fin
                </Button>
              )}
            </div>
            <p className={expired ? "text-xs text-amber-700 dark:text-amber-400" : "text-xs text-muted-foreground"}>
              {expired ? "Date passée : le bandeau n'est plus affiché." : "Le bandeau disparaît seul le lendemain."}
            </p>
          </div>
        </div>

        {trimmed && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Aperçu</p>
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: detail.franchise.brand_color ?? DEFAULT_COLOR,
                color: readableOn(detail.franchise.brand_color ?? DEFAULT_COLOR),
                opacity: enabled && !expired ? 1 : 0.5,
              }}
            >
              <Megaphone className="h-4 w-4 shrink-0" />
              <span className="truncate">{trimmed}</span>
            </div>
          </div>
        )}
      </CardContent>
      <SaveFooter
        dirty={dirty}
        invalid={textMissing || urlInvalid}
        saving={update.isPending}
        onCancel={reset}
        onSave={() => update.mutate({ announcement: { enabled, text: trimmed, url: url.trim(), ends_on: endsOn } })}
      />
    </Card>
  );
}

/** Franchise → Hub : adresse et QR code, présentation, bandeau d'annonce. */
export function FranchiseHubSettings({ detail }: { detail: FranchiseDetail }) {
  return (
    <div className="space-y-6">
      <HubAddressCard detail={detail} />
      <HubPresentationCard detail={detail} />
      <HubAnnouncementCard detail={detail} />
    </div>
  );
}
