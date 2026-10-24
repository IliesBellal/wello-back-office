import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import {
  FRANCHISE_DESCRIPTION_MAX,
  FRANCHISE_NAME_MAX,
  FRANCHISE_SLUG_MAX,
  FRANCHISE_SLUG_MIN,
  FRANCHISE_SLUG_PATTERN,
  type FranchiseDetail,
  type FranchiseSlugAvailability,
  type FranchiseUpdateRequest,
} from "@/types/franchise";
import { FranchiseImageField } from "./FranchiseImageField";

interface FranchiseAppearanceTabProps {
  detail: FranchiseDetail;
  onDeleted: () => void;
}

const DEFAULT_COLOR = "#111827";

const slugLooksValid = (slug: string) =>
  slug.length >= FRANCHISE_SLUG_MIN && slug.length <= FRANCHISE_SLUG_MAX && FRANCHISE_SLUG_PATTERN.test(slug);

/** Onglet Apparence du hub : textes, adresse, couleur, images, suppression. */
export function FranchiseAppearanceTab({ detail, onDeleted }: FranchiseAppearanceTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { franchise } = detail;
  const franchiseId = franchise.franchise_id;
  const isOwner = detail.role === "owner";

  const [name, setName] = useState(franchise.name);
  const [slug, setSlug] = useState(franchise.slug);
  const [description, setDescription] = useState(franchise.description ?? "");
  const [brandColor, setBrandColor] = useState(franchise.brand_color ?? "");
  const [slugCheck, setSlugCheck] = useState<FranchiseSlugAvailability | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Le formulaire part des valeurs enregistrées (la page remonte ce composant
  // quand on change de franchise) ; un envoi d'image ne touche pas la saisie.
  const resetTo = (values: FranchiseDetail["franchise"]) => {
    setName(values.name);
    setSlug(values.slug);
    setDescription(values.description ?? "");
    setBrandColor(values.brand_color ?? "");
    setSlugCheck(null);
  };

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

  const payload: FranchiseUpdateRequest = {};
  if (name.trim() !== franchise.name) payload.name = name.trim();
  if (slugChanged) payload.slug = slug;
  if (description.trim() !== (franchise.description ?? "")) payload.description = description.trim();
  if (brandColor.toUpperCase() !== (franchise.brand_color ?? "").toUpperCase()) payload.brand_color = brandColor;
  const dirty = Object.keys(payload).length > 0;

  const nameInvalid = name.trim().length === 0;
  const slugInvalid = slugChanged && !slugLooksValid(slug);
  const slugTaken = slugChanged && slugCheck?.slug === slug && !slugCheck.available;

  const applyDetail = (next: FranchiseDetail) => {
    queryClient.setQueryData(qk.franchises.detail(franchiseId), next);
    queryClient.invalidateQueries({ queryKey: qk.franchises.lists });
  };

  const saveMutation = useMutation({
    mutationFn: () => franchisesService.update(franchiseId, payload),
    onSuccess: (next) => {
      applyDetail(next);
      resetTo(next.franchise);
      toast({ title: "Modifications enregistrées" });
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible d'enregistrer."), variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ type, file }: { type: "logo" | "banner"; file: File }) => franchisesService.uploadImage(franchiseId, type, file),
    onSuccess: (url, { type }) => {
      const current = queryClient.getQueryData<FranchiseDetail>(qk.franchises.detail(franchiseId));
      if (current) {
        applyDetail({
          ...current,
          franchise: { ...current.franchise, [type === "logo" ? "logo_url" : "banner_url"]: url },
        });
      }
      toast({ title: type === "logo" ? "Logo mis à jour" : "Bannière mise à jour" });
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible d'envoyer l'image."), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => franchisesService.remove(franchiseId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: qk.franchises.detail(franchiseId) });
      queryClient.invalidateQueries({ queryKey: qk.franchises.all });
      toast({ title: "Franchise supprimée", description: "Les établissements ont été détachés." });
      setConfirmDeleteOpen(false);
      onDeleted();
    },
    onError: (error) =>
      toast({ title: "Erreur", description: franchiseErrorMessage(error, "Impossible de supprimer la franchise."), variant: "destructive" }),
  });

  const uploading = (type: "logo" | "banner") => uploadMutation.isPending && uploadMutation.variables?.type === type;
  const hubBase = detail.hub_url.slice(0, detail.hub_url.length - franchise.slug.length);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>Ce que voient vos clients en haut du hub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="franchise-name">Nom</Label>
              <Input
                id="franchise-name"
                value={name}
                maxLength={FRANCHISE_NAME_MAX}
                onChange={(e) => setName(e.target.value)}
              />
              {nameInvalid && <p className="text-xs text-destructive">Le nom est obligatoire.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchise-slug">Adresse du hub</Label>
              <div className="flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="hidden sm:block pl-3 text-sm text-muted-foreground whitespace-nowrap truncate max-w-[45%]">{hubBase}</span>
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
          </div>

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
              <span className="text-sm font-mono text-muted-foreground">{brandColor || "Thème par défaut"}</span>
              {brandColor && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setBrandColor("")}>
                  Revenir au thème par défaut
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Boutons et repères de la carte du hub.</p>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t pt-6">
          <Button
            variant="outline"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => resetTo(franchise)}
          >
            Annuler
          </Button>
          <Button
            disabled={!dirty || nameInvalid || slugInvalid || slugTaken || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Affiché sur le hub, et sur la carte pour les établissements sans logo.</CardDescription>
          </CardHeader>
          <CardContent>
            <FranchiseImageField
              label="Logo"
              url={franchise.logo_url}
              isLogo
              uploading={uploading("logo")}
              onFile={(file) => uploadMutation.mutate({ type: "logo", file })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bannière</CardTitle>
            <CardDescription>Image d'en-tête du hub, au format 4:1.</CardDescription>
          </CardHeader>
          <CardContent>
            <FranchiseImageField
              label="Bannière"
              url={franchise.banner_url}
              uploading={uploading("banner")}
              onFile={(file) => uploadMutation.mutate({ type: "banner", file })}
            />
          </CardContent>
        </Card>
      </div>

      {isOwner && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
            <CardDescription>
              Supprimer la franchise retire le hub et ses gestionnaires. Les établissements sont détachés, pas supprimés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer la franchise
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Supprimer « ${franchise.name} » ?`}
        description="Le hub ne sera plus accessible et ses QR codes cesseront de fonctionner. Cette action est définitive."
        confirmText="Supprimer"
        isDangerous
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
